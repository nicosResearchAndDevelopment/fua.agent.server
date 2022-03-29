const
    util        = require('./agent.server.util.js'),
    Amec        = require('@nrd/fua.agent.amec'),
    {Scheduler} = require(path.join(util.FUA_JS_LIB, 'agent.Scheduler/src/agent.Scheduler.js')),
    {Domain}    = require(path.join(util.FUA_JS_LIB, 'agent.Domain/src/agent.Domain.beta.js')),
    ServerAgent = require('./agent.server.js');

class TestbedAgent extends ServerAgent {

    static id = 'http://www.nicos-rd.com/fua/testbed#TestbedAgent/';

    #amec      = null;
    #scheduler = null;
    #daps      = null;

    /**
     * @param {{
     *            amec: Amec,
     *            scheduler: {},
     *            daps?: {}
     *         }} options
     * @returns {Promise<ServerAgent>}
     */
    async initialize(options = {}) {
        util.assert(options.app, 'expected app to be enabled');
        util.assert(options.server, 'expected server to be enabled');
        util.assert(options.io, 'expected io to be enabled');
        util.assert(options.sessions, 'expected sessions to be enabled');

        await super.initialize(options);

        util.assert(options.amec instanceof Amec, 'expected amec to be an instance of Amec');
        this.#amec = options.amec;

        util.assert(options.scheduler, 'expected scheduler to be enabled');
        this.#scheduler = new Scheduler(options.scheduler);

        util.assert(options.daps, 'expected daps to be enabled');
        this.#daps = options.daps;

        return this;
    } // TestbedAgent#initialize

    get amec() {
        return this.#amec;
    }

    get scheduler() {
        return this.#scheduler;
    }

    get daps() {
        return this.#daps;
    }

} // TestbedAgent

module.exports = TestbedAgent;
