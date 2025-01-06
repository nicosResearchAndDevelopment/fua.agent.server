const
  expect = require('expect'),
  { describe, test } = require('mocha'),
  Server = require('../src/server.js'),
  { name: identifier } = require('../package.json');

describe('agent.server', function () {

  test('basics', function () {
    expect(Server).toBeTruthy();
    expect(typeof Server).toBe('object');
    expect(Object.isFrozen(Server)).toBeTruthy();
    expect(global[identifier]).toBe(Server);
  });

  test('develop', async function () {
    this.timeout('10s')

    await Server.initialize({
      port: 8080,
      app: {
        use: [
          (req, res) => res.send('Hello World!')
        ]
      }
    })

    try {
      await Server.start()
      const response = await fetch('http://localhost:8080')
      const result = await response.text()
      expect(result).toBe('Hello World!')
    } finally {
      await Server.stop()
    }
  });

});