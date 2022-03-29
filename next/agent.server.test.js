const
    {describe, test, before} = require('mocha'),
    expect                   = require('expect'),
    ServerAgent              = require('./agent.server.js');

describe('agent.server/next', function () {

    test('DEVELOP', async function () {
        const agent = await ServerAgent.create({});
        console.log(agent);
    });

});
