const
    {describe, test, before, after} = require('mocha'),
    expect                          = require('expect'),
    fetch                           = require('node-fetch'),
    path                            = require('path'),
    {Space}                         = require('@nrd/fua.module.space'),
    {DataFactory}                   = require('@nrd/fua.module.persistence'),
    FilesystemStore                 = require('@nrd/fua.module.persistence.filesystem'),
    ServerAgent                     = require('../src/agent.server.js');

describe('agent.server', function () {

    let context, factory, store, space;

    before('setup space', async function () {
        context = {
            // public ontologies
            'rdf':  'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
            'rdfs': 'http://www.w3.org/2000/01/rdf-schema#',
            'owl':  'http://www.w3.org/2002/07/owl#',
            'ldp':  'http://www.w3.org/ns/ldp#',
            'dct':  'http://purl.org/dc/terms/',
            'foaf': 'http://xmlns.com/foaf/0.1/',
            'odrl': 'http://www.w3.org/ns/odrl/2/',
            'xsd':  'http://www.w3.org/2001/XMLSchema#',
            // custom ontologies
            'fua': 'https://www.nicos-rd.com.org/fua#',
            'dom': 'https://www.nicos-rd.com.org/fua/domain#',
            'ecm': 'https://www.nicos-rd.com.org/fua/ecosystem#'
        };
        factory = new DataFactory(context);
        store   = new FilesystemStore({
            defaultFile: 'file://test-data.ttl',
            loadFiles:   [{
                '@id':             'file://test-data.ttl',
                'dct:identifier':  path.join(__dirname, 'data/test-data.ttl'),
                'dct:format':      'text/turtle',
                'dct:title':       'test-data.ttl',
                'dct:alternative': 'Test Data'
            }, {
                '@id':             'file://test-server.ttl',
                'dct:identifier':  path.join(__dirname, 'data/test-server.ttl'),
                'dct:format':      'text/turtle',
                'dct:title':       'test-server.ttl',
                'dct:alternative': 'Test Server'
            }]
        }, factory);
        space   = new Space({store});
    });

    describe('usage as basic http server', function () {

        let agent;

        before('setup agent', async function () {
            agent = await ServerAgent.create({
                port:   8192,
                store:  store,
                app:    true,
                server: true
            });
            await agent.listen();
            expect(agent.server.listening).toBeTruthy();
            expect(agent.url).toBe('http://localhost:8192/');
        });

        test('add "/hello" route and get a response', async function () {
            agent.app.get('/hello', (request, response) => response.send('Hello World!'));

            const response = await fetch(agent.url + 'hello');
            expect(response.ok).toBeTruthy();
            expect(await response.text()).toBe('Hello World!');
        });

        after('close agent', async function () {
            await agent.close();
            expect(agent.server.listening).toBeFalsy();
        });

    });

});
