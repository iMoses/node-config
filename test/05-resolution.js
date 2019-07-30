const { requireUncached, processScope } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const assert = require('assert');
const path = require('path');
const vows = require('vows');

require('coffeescript').register();

vows.describe(`Config resolution`)
  .addBatch({
    'Configuration files resolution': {
      topic: processScope({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          NODE_CONFIG_ENV: 'test',
          NODE_APP_INSTANCE: '3',
          NODE_CONFIG: JSON.stringify({EnvOverride: {parm3: 'overridden from $NODE_CONFIG', parm4: 100}}),
        },
        argv: [
          '--NODE_CONFIG',
          JSON.stringify({EnvOverride: {parm5: 'overridden from --NODE_CONFIG', parm6: 101}}),
        ],
      }, () => {
        const config = requireUncached(__dirname + '/../lib/config');
        return config.loadDefaults(true).parseFile(__dirname + '/config/runtime.json');
      }),
      'parsing configurations from a ".js" module': function(config) {
        assert.strictEqual(config.get('Customers.dbHost'), 'base');
        assert.strictEqual(config.get('TestModule.parm1'), 'value1');
      },
      'parsing configurations from a ".json" file': function(config) {
        assert.strictEqual(config.get('Inline.a'), '');
        assert.strictEqual(config.get('Inline.b'), '1');
        assert.strictEqual(config.get('AnotherModule.parm1'), 'value1');
        assert.strictEqual(config.get('ContainsQuote'), '"this has a quote"');
      },
      'parsing configurations from a ".json5" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm6'), 'value6');
      },
      'parsing configurations from a ".yaml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm2'), 'value2');
      },
      'parsing configurations from a ".yml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm2yml'), 'value2yml');
      },
      'parsing configurations from a ".coffee" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm3'), 'value3');
      },
      'parsing configurations from a ".cson" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm4'), 'value4');
      },
      'parsing configurations from a ".properties" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm5'), 'value5');
      },
      'parsing configurations from a ".toml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm7'), 'value7');
      },
      'parsing configurations from a ".hjson" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm8'), 'value8');
      },
      'parsing configurations from a ".xml" file': function(config) {
        assert.strictEqual(config.get('AnotherModule.parm9'), 'value9');
      },
      'parsing configurations from a ".ini" file': function(config) {
        assert.strictEqual(config.get('ini.parser.loaded'), true);
      },
      'parsing configurations from a ".d" directory': function(config) {
        assert.strictEqual(config.get('mongodb.host'), '127.0.0.1');
        assert.strictEqual(config.get('mongodb.port'), '27017');
        assert.strictEqual(config.get('mysql.port'), '3306');
        assert.strictEqual(config.get('users.accounts.guest.length'), 0);
      },
      'parsing configurations from the "{default-instance}" file': function(config) {
        assert.strictEqual(config.get('Customers.altDbPort'), 4400);
      },
      'parsing configurations from the "{environment}" file': function(config) {
        assert.strictEqual(config.get('Customers.dbPort'), 5999);
      },
      'parsing configurations from the "{local}" file': function(config) {
        assert.strictEqual(config.get('Customers.dbPassword'), 'real password');
      },
      'parsing configurations from the "{local-environment}" file': function(config) {
        assert.deepEqual(config.get('Customers.lang'), ['en','de','es']);
        assert.strictEqual(config.get('Customers.dbPassword2'), 'another password');
      },
      'parsing configurations from the "{local-instance}" file': function(config) {
        assert.deepEqual(config.get('Customers.altDbPort1'), '2209');
      },
      'parsing configurations from the $NODE_CONFIG environment variable': function(config) {
        assert.strictEqual(config.get('EnvOverride.parm3'), 'overridden from $NODE_CONFIG');
        assert.strictEqual(config.get('EnvOverride.parm4'), 100);
      },
      'parsing configurations from the --NODE_CONFIG command-line argument': function(config) {
        assert.strictEqual(config.get('EnvOverride.parm5'), 'overridden from --NODE_CONFIG');
        assert.strictEqual(config.get('EnvOverride.parm6'), 101);
      },
      'parsing configurations from the "runtime.json" file': function(config) {
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
      'all corresponding sources are loaded': function(config) {
        void config.config;  // access config to autoload
        assert.deepEqual(config.sources.map(({ source }) => source), [
          'development.json', 'cloud.json', 'local-development.json', 'local-cloud.json'
        ].map(filename => `${__dirname}/14-config/${filename}`));
      },
      'values of corresponding file are loaded': function(config) {
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
      'all corresponding sources are loaded': function(config) {
        void config.config;  // access config to autoload
        assert.deepEqual(config.sources.map(({ source }) => source), [
          'development.json', 'bare-metal.json', 'test-development.json', 'test-bare-metal.json', 'local-development.json'
        ].map(filename => `${__dirname}/14-config/${filename}`));
      },
      'values of corresponding file are loaded': function(config) {
        assert.strictEqual(config.get('host.os'), 'linux');
        assert.strictEqual(config.get('host.arch'), 'x86_64');
      },
    },
    'Multiple configuration environments (env: cloud,bare-metal)': {
      topic: () => config.create({
        configDir: `${__dirname}/14-config`,
        environment: 'cloud,bare-metal',
      }),
      'all corresponding sources are loaded': function(config) {
        void config.config;  // access config to autoload
        assert.deepEqual(config.sources.map(({ source }) => source), [
          'cloud.json', 'bare-metal.json', 'local-cloud.json'
        ].map(filename => `${__dirname}/14-config/${filename}`));
      },
      'files resolution order corresponds with the environment value': function(config){
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
      'first directory loaded': function(config) {
        assert.strictEqual(config.get('Customers.dbName'), 'from_default_xml');
      },
      'second directory loaded': function(config) {
        assert.strictEqual(config.get('different.dir'), true);
      },
      'resolution order is correct': function(config) {
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
      'an empty array is replaced by a full array': function(config) {
        assert.deepEqual(config.get('arrayMerging.emptyArray'), ['not empty anymore']);
      },
      'an array can be replaced by an empty array' : function(config) {
        assert.deepEqual(config.get('arrayMerging.removeMe'), []);
      },
      'an array with one value can be replaced': function(config) {
        assert.deepEqual(config.get('arrayMerging.oneItem'), ['replaced']);
      },
    },
  })
  .addBatch({
    // replaces raw values which is obsolete in new architecture
    'Complex values': {
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
      'promises are unmodified': function(err, { promiseValue }) {
        assert.strictEqual(promiseValue, 'this is a promise result');
      },
      'complex objects are unmodified': function(err, { config }) {
        assert.strictEqual(config.get('circularReference'), process.stdout);
        assert.deepEqual(config.get('testObj'), {foo: 'bar'});
        assert.isFunction(config.get('yell'));
      },
      'nested complex objects are unmodified': function(err, { config }) {
        assert.strictEqual(config.get('innerRaw').innerCircularReference, process.stdout);
        assert.strictEqual(config.get('innerRaw.innerCircularReference'), process.stdout);
      },
      'supports multiple levels of nesting': function(err, { config }) {
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
      'regExp values are preserved': function(config) {
        assert.deepEqual(config.get('SomeMore.regexp1'), /This is a Regexp/g);
      },
      'regExp values are replaced': function(config) {
        assert.deepEqual(config.get('SomeMore.regexp2'), /This is the replaced/g);
      },
    },
  })
  .export(module);
