const
    Server             = exports,
    {name: identifier} = require('../package.json'),
    assert             = require('@nrd/fua.core.assert');

assert(!global[identifier], 'unable to load a second uncached version of the singleton ' + identifier);
Object.defineProperty(global, identifier, {value: Server, configurable: false, writable: false, enumerable: false});

const
    _Server        = Object.create(null),
    is             = require('@nrd/fua.core.is'),
    objects        = require('@nrd/fua.core.objects'),
    http           = require('http'),
    https          = require('https'),
    SocketIO       = require('socket.io'),
    Express        = require('express'),
    Multer         = require('multer'),
    // RDFHandler     = require('@rdfjs/express-handler'),
    ExpressSession = require('express-session'),
    MemoryStore    = require('memorystore')(ExpressSession);

Object.defineProperties(Server, {
    server:  {get: () => _Server.server || null, enumerable: true},
    session: {get: () => _Server.session || null, enumerable: true},
    app:     {get: () => _Server.app || null, enumerable: true},
    io:      {get: () => _Server.io || null, enumerable: true}
});

Server.initialize = async function (options) {
    assert(!_Server.server, 'Server already initialized');
    assert.object(options, {port: is.number.integer.positive});
    _Server.port   = options.port;
    _Server.server = (options.key && options.cert) ? https.createServer(options) : http.createServer(options);
    if (options.session) _Server.initializeSession({...options.session});
    if (options.app) _Server.initializeApp({...options.app});
    if (options.io) _Server.initializeIO({...options.io});
    return Server;
};

Server.start = async function () {
    assert(_Server.server, 'Server not initialized');
    assert(!_Server.server.listening, 'Server already running');
    await new Promise(resolve => _Server.server.listen(_Server.port, resolve));
    return Server;
};

Server.stop = async function () {
    assert(_Server.server, 'Server not initialized');
    assert(_Server.server.listening, 'Server not running');
    await new Promise(resolve => _Server.server.close(resolve));
    return Server;
};

_Server.initializeSession = function (options) {
    assert(_Server.server, 'Server not initialized');
    assert(!_Server.session, 'Session already initialized');
    assert.object(options);
    _Server.session = ExpressSession({store: new MemoryStore({checkPeriod: 86400000, ...options}), ...options});
};

_Server.initializeApp = function (options) {
    assert(_Server.server, 'Server not initialized');
    assert(!_Server.app, 'App already initialized');
    assert.object(options);
    _Server.app = Express();
    _Server.server.on('request', _Server.app);
    if (_Server.session) _Server.app.use(_Server.session);
    if (is.object(options.parse)) _Server.initializeParser(options.parse);
    if (options.public) _Server.initializeStatic(objects.array(options.public));
    if (options.use) _Server.initializeMiddleware(objects.array(options.use));
};

_Server.initializeParser = function (options) {
    assert(_Server.app, 'App not initialized');
    assert.object(options);
    if (options.json) _Server.app.use(Express.json({...options.json}));
    if (options.urlencoded) _Server.app.use(Express.urlencoded({extended: false, ...options.urlencoded}));
    // if (options.rdf) _Server.app.use(rdfHandler({...options.rdf}));
    if (options.multipart) _Server.app.use(Multer({storage: Multer.memoryStorage(), ...options.multipart}).any());
    if (options.text) _Server.app.use(Express.text({...options.text}));
    if (options.raw) _Server.app.use(Express.raw({type: '*/*', ...options.raw}));
};

_Server.initializeStatic = function (pathArr) {
    for (let publicPath of pathArr) {
        assert.string(publicPath);
        _Server.app.use(Express.static(publicPath));
    }
};

_Server.initializeMiddleware = function (middlewareArr) {
    for (let publicMiddleware of middlewareArr) {
        assert.function(publicMiddleware);
        _Server.app.use(publicMiddleware);
    }
};

_Server.initializeIO = function (options) {
    assert(_Server.server, 'Server not initialized');
    assert(!_Server.io, 'IO already initialized');
    assert.object(options);
    _Server.io = new SocketIO.Server(_Server.server, options);
    // if (_Server.session) _Server.io.use((socket, next) => {
    //     _Server.session(socket.request, socket.request.res, (sessionErr) => {
    //         if (sessionErr) return next(sessionErr);
    //         socket.request.session.reload((reloadErr) => {
    //             if (reloadErr) return next(reloadErr);
    //             socket.session = socket.request.session;
    //             next();
    //         });
    //     })
    // });
    if (_Server.session) _Server.io.engine.use((request, response, next) => {
        _Server.session(request, response, (sessionErr) => {
            if (sessionErr) return next(sessionErr);
            request.session.reload((reloadErr) => {
                if (reloadErr) return next(reloadErr);
                request.socket.session = request.session;
                next();
            });
        })
    });
};

Object.freeze(Server);
module.exports = Server;
