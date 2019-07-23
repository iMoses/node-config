const { requireUncached } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const assert = require('assert');
const vows = require('vows');

require('ts-node').register({
  lazy: true,
  compilerOptions: {
    allowJs: true,
  }
});

vows.describe(`TypeScript configurations`)
  .addBatch({
    'TypeScript configuration files': {
      topic: () => config.create({
        configDir: __dirname + '/x-config-ts'
      }),
      'parsing configurations from a ".ts" module (default)': function(config) {
        assert.strictEqual(config.get('siteTitle'), 'New Instance!');
      },
    },
    'TypeScript configuration modules': {
      topic: () => config.create({
        configDir: __dirname + '/x-config-ts-module-exports',
      }),
      'parsing configurations from a ".ts" module (exports)': function(config) {
        assert.strictEqual(config.get('siteTitle'), 'New Instance!');
      },
    },
    'TypeScript deferred configurations': {
      topic: () => config.create({
        configDir: __dirname + '/x-config-ts',
        appInstance: 'defer',
        environment: 'test',
      }),
      'deferConfig values are resolved on access': function(config) {
        // The deferred function was declared in default.js
        // Then local.js is located which overloads the siteTitle mentioned in the function
        // Finally the deferred configurations, now referencing the 'local' siteTitle
        assert.strictEqual(config.get('welcomeEmail.subject'), 'Welcome to New Instance!');
      },
      'native-function values remain untouched': function(config) {
        assert.isFunction(config.get('welcomeEmail.aFunc'));
        assert.strictEqual(config.config.welcomeEmail.aFunc(), 'Still just a function.');
      },
      'deferred functions can be replaced': function(config) {
        assert.deepEqual(config.get('map.centerPoint'), {lat: 3, lon: 4});
      },
      'deferred functions context is set to the configuration object' : function(config) {
        assert.strictEqual(config.get('welcomeEmail.justThis'), 'Welcome to this New Instance!');
      },
      'returned objects from deferred functions are treated as objects': function(config) {
        assert.deepEqual(config.get('map.centerPoint.lon'), 4);
      },
      'deferred functions can access their original value' : function(config) {
        assert.strictEqual(config.get('original.original'), 'an original value');
        assert.strictEqual(config.get('original.deferredOriginal'), undefined);
      },
    }
  })
  .export(module);
