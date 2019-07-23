const { requireUncached } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const assert = require('assert');
const vows = require('vows');

require('coffeescript').register();

vows.describe(`Configuration methods`)

  .addBatch({
    'config.create()': {
      'creates an independent instance of Config': function() {
        const local = config.create({
          configDir: __dirname + '/config',
          environment: 'test',
          appInstance: '3',
        });
        assert.notStrictEqual(config, local);
        assert.strictEqual(config.create, local.create);
        assert.notStrictEqual(config.parser, local.parser);
        assert.notStrictEqual(config.sources, local.sources);
      },
      'autoload configurations on initial access to the config property': function() {
        const local = config.create({
          configDir: __dirname + '/config',
          environment: 'test',
          appInstance: '3',
        });
        assert.strictEqual(local.sources.length, 0);
        assert.strictEqual(local.get('Customers.dbHost'), 'base');
        assert.notStrictEqual(local.sources.length, 0);
      },
      'using mutation methods prevents default autoload': function() {
        const local = config.create({
          configDir: __dirname + '/config',
          environment: 'test',
          appInstance: '3',
        });
        local.extend({Customers: {isTest: true}});
        assert.strictEqual(local.sources.length, 1);
        assert.throws(() => local.get('Customers.dbHost'),
          /Configuration property ".*" is not defined/);
        assert.strictEqual(local.sources.length, 1);
      },
    },
  })
  .addBatch({
    'config.extend()': {
      topic() {
        return config.create()
          .loadFiles({
            configDir: __dirname + '/config',
            environment: 'test',
            appInstance: '3',
          })
          .extend({EnvOverride: {parm3: 'overridden $NODE_CONFIG from config.extend()', parm4: 100}}, '$NODE_CONFIG')
          .extend({EnvOverride: {parm5: 'overridden --NODE_CONFIG from config.extend()', parm6: 101}}, '--NODE_CONFIG');
      },
      'extends configurations object': function(config) {
        assert.strictEqual(config.get('EnvOverride.parm3'), 'overridden $NODE_CONFIG from config.extend()');
        assert.strictEqual(config.get('EnvOverride.parm4'), 100);
      },
      'throws when used after the configuration object freeze': function() {
        const local = config.create();
        local.extend({key: 'value'});
        assert.strictEqual(local.get('key'), 'value');
        assert.throws(() => local.extend({key: 'newValue'}),
          /Configuration object is immutable and cannot be changed/);
        assert.strictEqual(local.get('key'), 'value');
      }
    },
  })
  .addBatch({
    'config.parseFile()': {
      topic: () => config.create({
        configDir: __dirname + '/7-config',
      }),
      'parses configurations files with or without BOM': function(config) {
        assert.doesNotThrow(() => config.parseFile(__dirname + '/7-config/defaultNoBOM.json'));
        assert.doesNotThrow(() => config.parseFile(__dirname + '/7-config/defaultWithUnicodeBOM.json'));
        assert.strictEqual(config.get('siteTitle'), 'A valid site title from default.json');
        assert.strictEqual(config.get('Customers.dbName'), 'from_default_json');
      },
      'throws when used after the configuration object freeze': function() {
        const local = config.create();
        local.parseFile(__dirname + '/7-config/defaultNoBOM.json');
        assert.strictEqual(local.get('siteTitle'), 'A valid site title from default.json');
        assert.throws(() => local.parseFile(__dirname + '/7-config/defaultNoBOM.json'),
          /Configuration object is immutable and cannot be changed/);
        assert.strictEqual(local.get('siteTitle'), 'A valid site title from default.json');
      },
    },
  })
  .addBatch({
    'config.loadFiles()': {
      topic() {
        return config.create()
          .loadFiles({
            configDir: __dirname + '/config',
            environment: 'test',
            appInstance: '3',
          })
          .parseFile(__dirname + '/config/runtime.json');
      },
      'parsing configurations from the {environment} file': function(config) {
        assert.strictEqual(config.get('Customers.dbPort'), 5999);
      },
      'parsing configurations from the {instance} file': function(config) {
        assert.strictEqual(config.get('Customers.altDbPort'), 4400);
      },
      'parsing configurations from the {local} file': function(config) {
        assert.strictEqual(config.get('Customers.dbPassword'), 'real password');
      },
      'parsing configurations from the {local-environment} file': function(config) {
        assert.deepEqual(config.get('Customers.lang'), ['en','de','es']);
        assert.strictEqual(config.get('Customers.dbPassword2'), 'another password');
      },
      'parsing configurations from the {local-instance} file': function(config) {
        assert.deepEqual(config.get('Customers.altDbPort1'), '2209');
      },
      'parsing configurations from the "runtime.json" file': function(config) {
        assert.strictEqual(config.get('Customers.dbName'), 'override_from_runtime_json');
      },
      'throws when used after the configuration object freeze': function() {
        const local = config.create();
        local.loadFiles({configDir: __dirname + '/config'});
        assert.strictEqual(local.get('Customers.dbName'), 'from_default_xml');
        assert.throws(() => local.loadFiles({configDir: __dirname + '/7-config'}),
          /Configuration object is immutable and cannot be changed/);
        assert.strictEqual(local.get('Customers.dbName'), 'from_default_xml');
      },
    },
  })
  .addBatch({
    'config.get()': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'returns a top-level item': function(config) {
        assert.isTrue(typeof config.get('TestModule') === 'object');
      },
      'returns a sub-level item': function(config) {
        assert.strictEqual(config.get('Customers.dbHost'), 'base');
      },
      'extended property accessor remains a getter': function(config) {
        assert.strictEqual(config.get('customerDbPort'), '5999');
      },
      'a cloned property accessor remains a getter': function(config) {
        assert.strictEqual(config.get('Customers.dbString'), 'from_default_xml:5999');
      },
      'a cloned property accessor is not immutable': function(config) {
        assert.notEqual(config.get('Customers.random'), config.get('Customers.random'));
      },
      'throws an exception on misspellings': function(config) {
        assert.throws(
          function () { config.get('mis.spelled'); },
          /Configuration property "mis.spelled" is not defined/
        );
      },
      'throws an exception on non-objects': function(config) {
        assert.throws(
          function () { config.get('Testmodule.misspelled'); },
          /Configuration property "Testmodule.misspelled" is not defined/
        );
      },
      'throws an exception on get(undefined)': function(config) {
        assert.throws(
          function () { config.get(undefined); },
          /Illegal call to config.get with a non-string argument/
        );
      },
      'throws an exception on get(null)': function(config) {
        assert.throws(
          function () { config.get(null); },
          /Illegal call to config.get with a non-string argument/
        );
      },
      'throws an exception on get(\'\')': function(config) {
        assert.throws(
          function () { config.get(''); },
          /Configuration property "" is not defined/
        );
      },
    },
  })
  .addBatch({
    'config.has()': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'identifies not having an element': function(config) {
        assert.isFalse(config.has('Customers.dbHosx'));
      },
      'can test a top-level item': function(config) {
        assert.isTrue(config.has('TestModule'));
      },
      'can test a sub-level item': function(config) {
        assert.isTrue(config.has('Customers.dbHost'));
      },
      'can test a missing sub-level item': function(config) {
        assert.isTrue(config.has('Customers.emptySub'));
        assert.isFalse(config.has('Customers.emptySub.foo'));
      },
      'returns false on has(undefined)': function(config) {
        assert.isFalse(config.has(undefined));
      },
      'returns false on has(null)': function(config) {
        assert.isFalse(config.has(null));
      },
      'returns false on has(\'\')': function(config) {
        assert.isFalse(config.has(''));
      },
    },
  })
  .addBatch({
    // TODO: more tests required
    'config.subModule()': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'is an instance of Config': function(config) {
        const module = config.subModule('TestModule');
        assert.strictEqual(Object.getPrototypeOf(config), Object.getPrototypeOf(module));
      },
      'changes effects the main-module configuration object': function(config) {
        const module = config.subModule('TestModule');
        assert.strictEqual(module.config, config.get('TestModule'));
      },
      'configuration object is shared between sub-modules and their main-module': function(config) {
        const module = config.subModule('TestModule');
        assert.strictEqual(module.get('parm1'), 'value1');
        assert.strictEqual(config.get('TestModule.parm1'), 'value1');
      },
      'extends can be used to provide defaults before the main-module resolves': function(config) {
        const localConfig = config
          .create({
            configDir: __dirname + '/config',
            environment: 'test',
            appInstance: '3',
          });
        const module = localConfig
          .subModule('TestModule')
          .extend({
            parm1: 1000, parm2: 2000, parm3: 3000,
            nested: {
              param4: 4000,
              param5: 5000
            }
          });
        localConfig.parseFile(__dirname + '/config/runtime.json');
        assert.strictEqual(module.get('parm2'), 2000);
        assert.strictEqual(module.get('parm3'), 1234);
      },
    },
  })
  .addBatch({
    'config.collectConfigFiles()': {
      topic: () => config,
      'collects matching configuration files in resolution order': function(config) {
        assert.deepEqual(
          config.collectConfigFiles({
            configDir: __dirname + '/config',
            environment: 'test',
            appInstance: '3',
          }),
          ['default.js', 'default.json', 'default-3.json', 'default.json5', 'default.hjson',
            'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
            'default.properties', 'default.xml', 'test.yaml', 'local.yaml', 'local-3.yml',
            'local-test.json'
          ].map(filename => `${__dirname}/config/${filename}`)
        );
      },
    },
  })
  .export(module);
