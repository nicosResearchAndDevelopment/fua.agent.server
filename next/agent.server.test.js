const
    {describe, test, before} = require('mocha'),
    expect                   = require('expect'),
    fetch                    = require('node-fetch'),
    {DataFactory}            = require('@nrd/fua.module.persistence'),
    InmemoryStore            = require('@nrd/fua.module.persistence.inmemory'),
    ServerAgent              = require('./agent.server.js');

describe('agent.server/next', function () {

    test('DEVELOP', async function () {
        const factory = new DataFactory({
            'rdf': 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            'fua': 'https://www.nicos-rd.com.org/fua#'
        });
        const store   = new InmemoryStore(null, factory);
        store.dataset.add(factory.quad(
            factory.namedNode('http://localhost/'),
            factory.namedNode('rdf:type'),
            factory.namedNode('fua:Server')
        ));
        const agent = await ServerAgent.create({
            store,
            app:    true,
            server: true
        });
        agent.app.get('/', (request, response) => response.send('Hello World!'));
        await agent.listen();
        expect(agent.server.listening).toBeTruthy();
        const response = await fetch('http://localhost:8080/');
        expect(response.ok).toBeTruthy();
        expect(await response.text()).toBe('Hello World!');
        await agent.close();
        expect(agent.server.listening).toBeFalsy();
    });

});
