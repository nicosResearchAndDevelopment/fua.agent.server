const
    util        = require('../src/agent.server.util.js'),
    AgentAmec   = require('@nrd/fua.agent.amec'),
    {Scheduler} = require(path.join(util.FUA_JS_LIB, 'agent.Scheduler/src/agent.Scheduler.js')),
    {Domain}    = require(path.join(util.FUA_JS_LIB, 'agent.Domain/src/agent.Domain.beta.js')),
    {PEP}       = require('@nrd/fua.decide.pep'),
    {DAPS}      = require('@nrd/fua.ids.agent.daps'),
    ServerAgent = require('../src/agent.server.js');

class TestbedAgent extends ServerAgent {

    static id = 'http://www.nicos-rd.com/fua/testbed#TestbedAgent/';

    #amec      = null;
    #scheduler = null;
    #domain    = null;
    #pep       = null;
    #daps      = null;

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
     *            amec?: boolean | {} | AgentAmec,
     *            scheduler?: boolean | {} | Scheduler,
     *            domain?: boolean | {} | Domain,
     *            daps?: boolean | {} | DAPS
     *         }} options
     * @returns {Promise<ServerAgent>}
     */
    async initialize(options = {}) {
        util.assert(options.app, 'expected app to be enabled');
        util.assert(options.server, 'expected server to be enabled');
        util.assert(options.io, 'expected io to be enabled');
        util.assert(options.sessions, 'expected sessions to be enabled');

        await super.initialize(options);

        if (options.amec) {
            if (options.amec instanceof AgentAmec) {
                this.#amec = options.amec;
            } else {
                const amecOptions = util.isObject(options.amec) && options.amec || {};
                this.#amec        = new AgentAmec(amecOptions);
            }
        }

        if (options.scheduler) {
            if (options.scheduler instanceof Scheduler) {
                this.#scheduler = options.scheduler;
            } else {
                const schedulerOptions = util.isObject(options.scheduler) && options.scheduler || {};
                this.#scheduler        = new Scheduler(schedulerOptions);
            }
        }

        if (options.domain) {
            if (options.domain instanceof Domain) {
                this.#domain = options.domain;
            } else {
                const domainOptions = util.isObject(options.domain) && options.domain || {};
                if (!domainOptions.space) domainOptions.space = this.space;
                if (!domainOptions.amec) domainOptions.amec = this.#amec;
                if (!domainOptions.config) domainOptions.config = await this.node.getNode('ecm:domain').load();
                this.#domain = new Domain(domainOptions);
            }
        }

        if (options.pep) {
            if (options.pep instanceof PEP) {
                this.#pep = options.pep;
            } else {
                const pepOptions = util.isObject(options.pep) && options.pep || {};
                if (!pepOptions.id) pepOptions.id = this.uri + 'PEP/'
                this.#pep = new PEP(pepOptions);
            }
        }

        if (options.daps) {
            if (options.daps instanceof DAPS) {
                this.#daps = options.daps;
            } else {
                const dapsOptions = util.isObject(options.daps) && options.daps || {};
                this.#daps        = new DAPS(dapsOptions);
            }
        }

        return this;
    } // TestbedAgent#initialize

    get amec() {
        return this.#amec;
    }

    get scheduler() {
        return this.#scheduler;
    }

    get domain() {
        return this.#domain;
    }

    get PEP() {
        return this.#pep;
    }

    get DAPS() {
        return this.#daps;
    }

} // TestbedAgent

module.exports = TestbedAgent;
