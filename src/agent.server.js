const
    util                     = require('./agent.server.util.js'),
    EventEmitter             = require('events'),
    express                  = require('express'),
    ExpressSession           = require('express-session'),
    socket_io                = require('socket.io'),
    {DataStore, DataFactory} = require('@nrd/fua.module.persistence'),
    {Space, Node: SpaceNode} = require('@nrd/fua.module.space'),
    SchedulerAgent           = require('@nrd/fua.agent.scheduler'),
    EventAgent               = require('@nrd/fua.agent.event'),
    DomainAgent              = require('@nrd/fua.agent.domain'),
    AmecAgent                = require('@nrd/fua.agent.amec');

/** @alias fua.agent.server */
class ServerAgent {

    /**
     * @param options
     * @returns {Promise<ServerAgent>}
     */
    static async create(options) {
        if (options instanceof this) return options;
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
    /** @type {SchedulerAgent} */
    #scheduler  = null;
    /** @type {EventAgent} */
    #event      = null;
    /** @type {DomainAgent} */
    #domain     = null;
    /** @type {AmecAgent} */
    #amec       = null;

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
     *            sessions?: boolean | {},
     *            scheduler?: boolean | {} | SchedulerAgent,
     *            event?: boolean | {} | EventAgent,
     *            domain?: boolean | {} | DomainAgent,
     *            amec?: boolean | {} | AmecAgent
     *         }} options
     * @returns {Promise<ServerAgent>}
     */
    async initialize(options = {}) {
        this.emit('initialize', options);

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
                serverOptions = util.isObject(options.server) && options.server || {};
            this.#server      = new ServerModule(serverOptions, this.#app);
        }

        if (options.io) {
            util.assert(this.#server, 'io options cannot be used without a server');
            const ioOptions = util.isObject(options.io) && options.io || {};
            this.#io        = socket_io(this.#server, ioOptions);
        }

        if (options.sessions) {
            if (util.isFunction(options.sessions)) {
                this.#sessions = options.sessions;
            } else {
                const sessionsOptions = util.isObject(options.sessions) && options.sessions || {};
                this.#sessions        = ExpressSession(sessionsOptions);
            }
            if (this.#app) this.#app.use((request, response, next) => this.#sessions(request, response, next));
            if (this.#io) this.#io.use((socket, next) => this.#sessions(socket.request, socket.request.res, next));
        }

        if (options.scheduler) {
            if (options.scheduler instanceof SchedulerAgent) {
                this.#scheduler = options.scheduler;
            } else {
                const schedulerOptions = util.isObject(options.scheduler) && options.scheduler || {};
                this.#scheduler        = new SchedulerAgent(schedulerOptions);
            }
        }

        if (options.event) {
            if (options.event instanceof EventAgent) {
                this.#event = options.event;
            } else {
                const eventsOptions = util.isObject(options.event) && options.event || {};
                this.#event         = new EventAgent(eventsOptions);
            }
        }

        if (options.domain) {
            if (options.domain instanceof DomainAgent) {
                this.#domain = options.domain;
            } else {
                const domainOptions = util.isObject(options.domain) && options.domain || {};
                if (!domainOptions.space) domainOptions.space = this.#space;
                if (!domainOptions.uri) {
                    const domainNode = this.#serverNode.getNode('ecm:domain');
                    util.assert(domainNode, 'expected server to have a domain node defined');
                    domainOptions.uri = domainNode.id;
                }
                this.#domain = await DomainAgent.create(domainOptions);
            }
        }

        if (options.amec) {
            if (options.amec instanceof AmecAgent) {
                this.#amec = options.amec;
            } else {
                const amecOptions = util.isObject(options.domain) && options.domain || {};
                this.#amec        = new AmecAgent(amecOptions);
            }
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

    get scheduler() {
        return this.#scheduler;
    } // ServerAgent#scheduler

    get event() {
        return this.#event;
    } // ServerAgent#event

    get domain() {
        return this.#domain;
    } // ServerAgent#domain

    get amec() {
        return this.#amec;
    } // ServerAgent#amec

    listen(options = {}) {
        util.assert(this.#server, 'a server has not been initialized');
        return new Promise((resolve, reject) => {
            options     = {port: this.#port, host: this.#hostname, ...options};
            let onListening, onError;
            onListening = () => {
                this.#server.off('error', onError);
                this.emit('listening', options);
                resolve(this);
            };
            onError     = (err) => {
                this.#server.off('listening', onListening);
                this.emit('error', err);
                reject(err);
            };
            this.#server.once('listening', onListening);
            this.#server.once('error', onError);
            this.#server.listen(options);
        });
    } // ServerAgent#listen

    close() {
        util.assert(this.#server, 'a server has not been initialized');
        return new Promise((resolve, reject) => {
            this.#server.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    this.emit('closed');
                    resolve(this);
                }
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
