const
    _util = require('@fua/core.util'),
    util  = exports = {
        ..._util,
        assert: _util.Assert('agent.server')
    };

util.isNonEmptyString = _util.StringValidator(/^\S+$/);

util.pause = function (seconds) {
    return new Promise((resolve) => {
        if (seconds >= 0) setTimeout(resolve, 1e3 * seconds);
        else setImmediate(resolve);
    });
};

util.requireServerModule = function (type) {
    switch (type) {
        case 'net':
            return require('net').Server;

        case 'tls':
            return require('tls').Server;

        case 'http':
            return require('http').Server;

        case 'https':
            return require('https').Server;

        default:
            util.assert(false, 'unknown ServerModule type "' + type + '"');
    }
};

util.requireStoreModule = function (type) {
    switch (type) {
        case 'inmemory':
        case 'module.persistence.inmemory':
        case '@fua/module.persistence.inmemory':
            return require('@fua/module.persistence.inmemory');

        case 'filesystem':
        case 'module.persistence.filesystem':
        case '@fua/module.persistence.filesystem':
            return require('@fua/module.persistence.filesystem');

        case 'mongodb':
        case 'module.persistence.mongodb':
        case '@fua/module.persistence.mongodb':
            return require('@fua/module.persistence.mongodb');

        case 'redis':
        case 'module.persistence.redis':
        case '@fua/module.persistence.redis':
            return require('@fua/module.persistence.redis');

        case 'neo4j':
        case 'module.persistence.neo4j':
        case '@fua/module.persistence.neo4j':
            return require('@fua/module.persistence.neo4j');

        case 'sqlite':
        case 'module.persistence.sqlite':
        case '@fua/module.persistence.sqlite':
            return require('@fua/module.persistence.sqlite');

        default:
            util.assert(false, 'unknown StoreModule type "' + type + '"');
    }
};

module.exports = Object.freeze(util);
