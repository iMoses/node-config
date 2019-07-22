const { requireUncached } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const assert = require('assert');
const vows = require('vows');

vows.describe(`Advanced configuration methods`)
  .addBatch({
    'asyncConfig': {
      topic() {
        config.create({
          configDir: __dirname + '/15-config',
          appInstance: 'async',
          environment: 'test',
        }).whenReady.then(
          config => this.callback(null, config),
          err => this.callback(err)
        );
      },
      'Validate asyncConfig values are evaluated and resolved by whenReady': function(config) {
        assert.strictEqual(config.get('welcomeEmail.subject'), 'Welcome to New Instance!');
      },
      'Validate deferConfig works well with asyncConfig' : function(config) {
        assert.strictEqual(config.get('promiseSubject'), 'New Instance! Welcome to New Instance!');
      },
      'Ensure native-function values remain untouched': function(config) {
        assert.isFunction(config.get('welcomeEmail.aFunc'));
        assert.strictEqual(config.config.welcomeEmail.aFunc(), 'Still just a function.');
      },
      'Ensure async functions can be replaced': function(config) {
        assert.deepEqual(config.get('map.centerPoint'), {lat: 3, lon: 4});
      },
      'Ensure async functions context is set to the configuration object' : function(config) {
        assert.strictEqual(config.get('welcomeEmail.justThis'), 'Welcome to this New Instance!');
      },
      'Ensure returned objects from async functions are treated as objects': function(config) {
        assert.deepEqual(config.get('map.centerPoint.lon'), 4);
      },
      'Ensure async functions can access their original value' : function(config) {
        assert.strictEqual(config.get('original.original'), 'an original value');
        assert.strictEqual(config.get('original.originalPromise'), 'not an original value');
      },
    }
  })
  .addBatch({
    'deferConfig': {
      topic: () => config.create({
        configDir: __dirname + '/3-config',
        appInstance: 'defer',
        environment: 'test',
      }),
      'Validate deferConfig values are resolved on access': function(config) {
        // The deferred function was declared in default.js
        // Then local.js is located which overloads the siteTitle mentioned in the function
        // Finally the deferred configurations, now referencing the 'local' siteTitle
        assert.strictEqual(config.get('welcomeEmail.subject'), 'Welcome to New Instance!');
      },
      'Ensure native-function values remain untouched': function(config) {
        assert.isFunction(config.get('welcomeEmail.aFunc'));
        assert.strictEqual(config.config.welcomeEmail.aFunc(), 'Still just a function.');
      },
      'Ensure deferred functions can be replaced': function(config) {
        assert.deepEqual(config.get('map.centerPoint'), {lat: 3, lon: 4});
      },
      'Ensure deferred functions context is set to the configuration object' : function(config) {
        assert.strictEqual(config.get('welcomeEmail.justThis'), 'Welcome to this New Instance!');
      },
      'Ensure returned objects from deferred functions are treated as objects': function(config) {
        assert.deepEqual(config.get('map.centerPoint.lon'), 4);
      },
      'Ensure deferred functions can access their original value' : function(config) {
        assert.strictEqual(config.get('original.original'), 'an original value');
        assert.strictEqual(config.get('original.deferredOriginal'), undefined);
      },
      'Ensure deferred functions are resolved within arrays' : function(config) {
        assert.strictEqual(config.get('list.2'), 3);
        assert.strictEqual(config.get('fromList'), 6);
      },
      'Ensure deferred functions resolution is resolved when accessing other deferConfigs' : function(config) {
        assert.strictEqual(config.get('a'), 'my this is 6!');
        assert.strictEqual(config.get('c'), 'my this is 6! this is 6!');
      },
    }
  })
  .export(module);
