const
    EventEmitter             = require('events'),
    express                  = require('express'),
    ExpressSession           = require('express-session'),
    // {CloudEvent, HTTP: ceHTTP} = require('cloudevents'),
    socket_io                = require('socket.io'),
    {DataStore, DataFactory} = require('@nrd/fua.module.persistence'),
    {Space}                  = require('@nrd/fua.module.space'),
    util                     = require('./agent.server.util.js');

class ServerAgent {

    /**
     * @param options
     * @returns {Promise<ServerAgent>}
     */
    static async create(options) {
        const agent = new this(options);
        return await agent.initialize(options);
    } // ServerAgent.create

    #schema   = 'http';
    #hostname = 'localhost';
    #port     = 8080;
    #baseURI  = '';
    #baseURL  = '';

    #emitter    = new EventEmitter();
    /** @type {fua.module.space.Space} */
    #space      = null;
    /** @type {fua.module.space.Node} */
    #serverNode = null;
    /** @type {import("net").Server} */
    #server     = null;
    /** @type {import("express")} */
    #app        = null;
    /** @type {import("socket.io")} */
    #io         = null;
    /** @type {import("express-session")} */
    #sessions   = null;

    /**
     * @param {{
     *            schema?: string,
     *            hostname?: string,
     *            port?: number
     *         }} options
     */
    constructor(options = {}) {
        this.#schema   = options.schema || this.#schema;
        this.#hostname = options.hostname || this.#hostname;
        this.#port     = options.port || this.#port;

        this.#baseURI = this.#schema + '://' + this.#hostname + '/';
        this.#baseURL = this.#schema + '://' + this.#hostname + ':' + this.#port + '/';
    } // ServerAgent#constructor

    /**
     * @param {{
     *            space?: fua.module.space.Space,
     *            store?: fua.module.persistence.DataStore | {module?: string, options?: {}},
     *            factory?: fua.module.persistence.DataFactory,
     *            context?: {[prefix: string]: string},
     *            app?: boolean | {},
     *            server?: boolean | {},
     *            io?: boolean | {},
     *            sessions?: boolean | {}
     *         }} options
     * @returns {Promise<ServerAgent>}
     */
    async initialize(options = {}) {
        if (options.space instanceof Space) {
            this.#space = options.space;
        } else if (options.store instanceof DataStore) {
            this.#space = new Space({store: options.store});
        } else {
            const
                dataFactory = (options.factory instanceof DataFactory) && options.factory || new DataFactory(options.context || {}),
                StoreModule = util.requireStoreModule(options.store?.module || 'inmemory'),
                dataStore   = new StoreModule(options.store?.options || {}, dataFactory);
            this.#space     = new Space({store: dataStore});
        }

        this.#serverNode = this.#space.getNode(this.#baseURI);
        await this.#serverNode.load();
        util.assert(this.#serverNode.type, `node for "${this.#baseURI}" not found in the space`);

        if (options.app) {
            this.#app = express();
            this.#app.disable('x-powered-by');
        }

        if (options.server) {
            const
                ServerModule  = util.requireServerModule(this.#schema),
                serverOptions = util.isObject(options.server) ? options.server : {};
            this.#server      = new ServerModule(serverOptions, this.#app);
        }

        if (options.io) {
            util.assert(this.#server, 'io options cannot be used without a server');
            const
                ioOptions = util.isObject(options.io) ? options.io : {};
            this.#io      = socket_io(this.#server, ioOptions);
        }

        if (options.sessions) {
            const
                sessionsOptions    = util.isObject(options.sessions) ? options.sessions : {},
                sessionsMiddleware = util.isFunction(options.sessions) ? options.sessions : ExpressSession(sessionsOptions);
            this.#sessions         = sessionsMiddleware;
            if (this.#app) this.#app.use((request, response, next) => this.#sessions(request, response, next));
            if (this.#io) this.#io.use((socket, next) => this.#sessions(socket.request, socket.request.res, next));
        }

        return this;
    } // ServerAgent#initialize

    get uri() {
        return this.#baseURI;
    } // ServerAgent#uri

    get url() {
        return this.#baseURL;
    } // ServerAgent#url

    get node() {
        return this.#serverNode;
    } // ServerAgent#node

    get space() {
        return this.#space;
    } // ServerAgent#space

    get server() {
        return this.#server;
    } // ServerAgent#server

    get app() {
        return this.#app;
    } // ServerAgent#app

    get io() {
        return this.#io;
    } // ServerAgent#io

    get sessions() {
        return this.#sessions;
    } // ServerAgent#sessions

    listen(options = {}) {
        return new Promise((resolve, reject) => {
            let onListening, onError;
            onListening = () => {
                this.#server.off('error', onError);
                resolve(this);
            };
            onError     = (err) => {
                this.#server.off('listening', onListening);
                reject(err);
            };
            this.#server.once('listening', onListening);
            this.#server.once('error', onError);
            this.#server.listen({port: this.#port, host: this.#hostname, ...options});
        });
    } // ServerAgent#listen

    close() {
        return new Promise((resolve, reject) => {
            this.#server.close((err) => {
                if (err) reject(err);
                else resolve(this);
            });
        });
    } // ServerAgent#close

    on(event, listener) {
        this.#emitter.on(event, listener);
        return this;
    } // ServerAgent#on

    once(event, listener) {
        this.#emitter.once(event, listener);
        return this;
    } // ServerAgent#once

    off(event, listener) {
        this.#emitter.off(event, listener);
        return this;
    } // ServerAgent#off

    emit(event, ...args) {
        this.#emitter.emit(event, ...args);
        return this;
    } // ServerAgent#emit

} // ServerAgent

module.exports = ServerAgent;
