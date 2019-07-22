const { requireUncached } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const assert = require('assert');
const path = require('path');
const vows = require('vows');

require('coffeescript').register();

vows.describe(`Config resolution`)
  .addBatch({
    'Configuration files resolution': {
      topic() {
        return config
          .loadFiles({
            configDir: __dirname + '/config',
            environment: 'test',
            appInstance: '3',
          })
          .extend({EnvOverride: {parm3: 'overridden from $NODE_CONFIG', parm4: 100}}, '$NODE_CONFIG')
          .extend({EnvOverride: {parm5: 'overridden from --NODE_CONFIG', parm6: 101}}, '--NODE_CONFIG')
          .parseFile(__dirname + '/config/runtime.json');
      },
      'Parsing configurations from a ".js" module': function(config) {
        assert.strictEqual(config.get('Customers.dbHost'), 'base');
        assert.strictEqual(config.get('TestModule.parm1'), 'value1');
      },
      'Parsing configurations from a ".json" file': function(config) {
        assert.strictEqual(config.get('Inline.a'), '');
        assert.strictEqual(config.get('Inline.b'), '1');
        assert.strictEqual(config.get('AnotherModule.parm1'), 'value1');
        assert.strictEqual(config.get('ContainsQuote'), '"this has a quote"');
      },
      'Parsing configurations from a ".json5" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm6'), 'value6');
      },
      'Parsing configurations from a ".yaml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm2'), 'value2');
      },
      'Parsing configurations from a ".yml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm2yml'), 'value2yml');
      },
      'Parsing configurations from a ".coffee" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm3'), 'value3');
      },
      'Parsing configurations from a ".cson" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm4'), 'value4');
      },
      'Parsing configurations from a ".properties" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm5'), 'value5');
      },
      'Parsing configurations from a ".toml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm7'), 'value7');
      },
      'Parsing configurations from a ".hjson" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm8'), 'value8');
      },
      'Parsing configurations from a ".xml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm9'), 'value9');
      },
      'Parsing configurations from the "{default-instance}" file': function(config) {
        assert.strictEqual(config.get('Customers.altDbPort'), 4400);
      },
      'Parsing configurations from the "{environment}" file': function(config) {
        assert.strictEqual(config.get('Customers.dbPort'), 5999);
      },
      'Parsing configurations from the "{local}" file': function(config) {
        assert.strictEqual(config.get('Customers.dbPassword'), 'real password');
      },
      'Parsing configurations from the "{local-environment}" file': function(config) {
        assert.deepEqual(config.get('Customers.lang'), ['en','de','es']);
        assert.strictEqual(config.get('Customers.dbPassword2'), 'another password');
      },
      'Parsing configurations from the "{local-instance}" file': function(config) {
        assert.deepEqual(config.get('Customers.altDbPort1'), '2209');
      },
      'Parsing configurations from the $NODE_CONFIG environment variable': function(config) {
        assert.strictEqual(config.get('EnvOverride.parm3'), 'overridden from $NODE_CONFIG');
        assert.strictEqual(config.get('EnvOverride.parm4'), 100);
      },
      'Parsing configurations from the --NODE_CONFIG command-line argument': function(config) {
        assert.strictEqual(config.get('EnvOverride.parm5'), 'overridden from --NODE_CONFIG');
        assert.strictEqual(config.get('EnvOverride.parm6'), 101);
      },
      'Parsing configurations from the "runtime.json" file': function(config) {
        assert.strictEqual(config.get('Customers.dbName'), 'override_from_runtime_json');
      },
    },
  })
  .addBatch({
    'Multiple configuration environments (env: development,cloud)': {
      topic: () => config.create({
        configDir: `${__dirname}/14-config`,
        environment: 'development,cloud',
      }),
      'Ensure all corresponding sources are loaded': function(config) {
        void config.config;  // access config to autoload
        assert.deepEqual(config.sources.map(({ source }) => source), [
          'development.json', 'cloud.json', 'local-development.json', 'local-cloud.json'
        ].map(filename => `${__dirname}/14-config/${filename}`));
      },
      'Ensure values of corresponding file are loaded': function(config) {
        assert.strictEqual(config.get('db.name'), 'development-config-env-provided');
        assert.strictEqual(config.get('db.port'), 3000);
        assert.strictEqual(config.get('app.context'), 'local cloud');
        assert.strictEqual(config.get('app.message'), 'local development');
      },
    },
    'Multiple configuration environments (env: development,bare-metal; host: test)': {
      topic: () => config.create({
        configDir: `${__dirname}/14-config`,
        environment: 'development,bare-metal',
        hostname: 'test',
      }),
      'Ensure all corresponding sources are loaded': function(config) {
        void config.config;  // access config to autoload
        assert.deepEqual(config.sources.map(({ source }) => source), [
          'development.json', 'bare-metal.json', 'test-development.json', 'test-bare-metal.json', 'local-development.json'
        ].map(filename => `${__dirname}/14-config/${filename}`));
      },
      'Ensure values of corresponding file are loaded': function(config) {
        assert.strictEqual(config.get('host.os'), 'linux');
        assert.strictEqual(config.get('host.arch'), 'x86_64');
      },
    },
    'Multiple configuration environments (env: cloud,bare-metal)': {
      topic: () => config.create({
        configDir: `${__dirname}/14-config`,
        environment: 'cloud,bare-metal',
      }),
      'Ensure all corresponding sources are loaded': function(config) {
        void config.config;  // access config to autoload
        assert.deepEqual(config.sources.map(({ source }) => source), [
          'cloud.json', 'bare-metal.json', 'local-cloud.json'
        ].map(filename => `${__dirname}/14-config/${filename}`));
      },
      'Ensure files resolution order corresponds with the environment value': function(config){
        assert.strictEqual(config.get('db.name'), 'bare-metal-config-env-provided');
      },
    },
  })
  .addBatch({
    'Multiple configuration directories': {
      topic: () => config.create({
        configDir: `${__dirname}/config${path.delimiter}${__dirname}/x-config`,
        environment: 'test',
        appInstance: '3',
      }),
      'Validate first directory loaded': function(config) {
        assert.strictEqual(config.get('Customers.dbName'), 'from_default_xml');
      },
      'Validate second directory loaded': function(config) {
        assert.strictEqual(config.get('different.dir'), true);
      },
      'Validate correct resolution order': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm4'), 'x_config_4_win');
      },
    },
  })
  .addBatch({
    'Array values': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        appInstance: 'array-merge',
        environment: 'test',
      }),
      'Ensure an empty array is replaced by a full array': function(config) {
        assert.deepEqual(config.get('arrayMerging.emptyArray'), ['not empty anymore']);
      },
      'Ensure an array can be replaced by an empty array' : function(config) {
        assert.deepEqual(config.get('arrayMerging.removeMe'), []);
      },
      'Ensure an array with one value can be replaced': function(config) {
        assert.deepEqual(config.get('arrayMerging.oneItem'), ['replaced']);
      },
    },
  })
  .addBatch({
    // replaces raw values which is obsolete in new architecture
    'Complex values (previously raw)': {
      topic() {
        const localConfig = config.create({
          configDir: __dirname + '/9-config',
          environment: 'test',
          appInstance: 'raw',
        });
        localConfig.get('aPromise').then(
          promiseValue => this.callback(null, {config: localConfig, promiseValue}),
          err => this.callback(err)
        );
      },
      'Ensure promises are unmodified': function(err, { promiseValue }) {
        assert.strictEqual(promiseValue, 'this is a promise result');
      },
      'Ensure complex objects are unmodified': function({ config }) {
        assert.strictEqual(config.get('circularReference'), process.stdout);
        assert.deepEqual(config.get('testObj'), {foo: 'bar'});
        assert.isFunction(config.get('yell'));
      },
      'Ensure nested complex objects are unmodified': function({ config }) {
        assert.strictEqual(config.get('innerRaw').innerCircularReference, process.stdout);
        assert.strictEqual(config.get('innerRaw.innerCircularReference'), process.stdout);
      },
      'Supports multiple levels of nesting': function({ config }) {
        assert.strictEqual(config.get('nestedRaw').nested.test, process.stdout);
        assert.strictEqual(config.get('nestedRaw.nested').test, process.stdout);
        assert.strictEqual(config.get('nestedRaw.nested.test'), process.stdout);
      },
    },
  })
  .addBatch({
    'RegExp values': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        appInstance: 'regexp',
        environment: 'test',
      }),
      'Ensure regExp values are preserved': function(config) {
        assert.deepEqual(config.get('SomeMore.regexp1'), /This is a Regexp/g);
      },
      'Ensure regExp values are replaced': function(config) {
        assert.deepEqual(config.get('SomeMore.regexp2'), /This is the replaced/g);
      },
    },
  })
  .export(module);
