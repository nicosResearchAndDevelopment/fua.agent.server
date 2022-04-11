const
    {describe, test, before} = require('mocha'),
    expect                   = require('expect'),
    fetch                    = require('node-fetch'),
    {DataFactory}            = require('@nrd/fua.module.persistence'),
    InmemoryStore            = require('@nrd/fua.module.persistence.inmemory'),
    ServerAgent              = require('../src/agent.server.js');

describe('agent.server/next', function () {

    test('usage as basic http server', async function () {
        const
            factory     = new DataFactory({
                'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
                'fua': 'https://www.nicos-rd.com.org/fua#'
            }),
            store       = new InmemoryStore(null, factory),
            agent       = new ServerAgent({
                port: 8192
            }),
            serverQuad  = factory.quad(
                factory.namedNode('http://localhost/'),
                factory.namedNode('rdf:type'),
                factory.namedNode('fua:Server')
            ),
            initOptions = {
                store,
                app:    true,
                server: true
            };

        store.dataset.add(serverQuad);
        await agent.initialize(initOptions);
        agent.app.get('/', (request, response) => response.send('Hello World!'));

        await agent.listen();
        expect(agent.server.listening).toBeTruthy();
        expect(agent.url).toBe('http://localhost:8192/');

        const response = await fetch(agent.url);
        expect(response.ok).toBeTruthy();
        expect(await response.text()).toBe('Hello World!');

        await agent.close();
        expect(agent.server.listening).toBeFalsy();
    });

});
