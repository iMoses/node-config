const { requireUncached } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const assert = require('assert');
const vows = require('vows');

require('coffeescript').register();

vows.describe(`Configuration instance`)
  .addBatch({
    'config.config': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'Validate method exists': function(config) {
        assert.isFunction(config.create);
      },
    },
  }) // TODO
  .addBatch({
    'config.config': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'Validate method exists': function(config) {
        assert.isFunction(config.create);
      },
    },
  }) // TODO
  .addBatch({
    'config.whenReady': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'Validate method exists': function(config) {
        assert.isFunction(config.create);
      },
    },
  }) // TODO
  .addBatch({
    'config.sources': {
      topic: () => {
        const localConfig = config.create();
        localConfig
          .subModule('TestModule')
          .parseFile(__dirname + '/config/default.properties');
        return localConfig.loadFiles({
          configDir: __dirname + '/config',
          environment: 'test',
          appInstance: '3',
        });
      },
      'Validate property exists': function(config) {
        assert.isArray(config.sources);
      },
      'Validate property is immutable': function(config) {
        config.sources = null;
        assert.isArray(config.sources);
      },
      'Validate property is filled config has been accessed': function(config) {
        assert.strictEqual(config.sources.length, 17);
        assert.strictEqual(config.get('ContainsQuote'), '"this has a quote"');
      },
      'Ensure sources schema': function(config) {
        assert.strictEqual(config.sources[11].source, __dirname + '/config/default.properties');
        assert.isObject(config.sources[11].data);
        assert.isUndefined(config.sources[11].module);
      },
      'Ensure sources schema with sub-modules': function(config) {
        assert.strictEqual(config.sources[0].source, __dirname + '/config/default.properties');
        assert.isObject(config.sources[0].data);
        assert.strictEqual(config.sources[0].module, 'TestModule');
      },
      'Ensure sources include empty objects': function(config) {
        const local = config.create({
          configDir: __dirname + '/5-config',
          environment: 'empty',
        });
        assert.strictEqual(local.sources.length,0);
        void local.config;
        assert.strictEqual(local.sources.length,3);
        assert.strictEqual(local.sources[1].source,__dirname + '/5-config/empty.json');
        assert.isTrue(local.sources.every(({ source, data, module }) =>
          typeof source === 'string' && typeof data === 'object' && typeof module === 'undefined'));
      },
      'Ensure sources include config.extend objects': function(config) {
        const local = config
          .create()
          .loadFiles({
            configDir: __dirname + '/5-config',
          })
          .extend({EnvOverride: {parm3: 'overridden from $NODE_CONFIG', parm4: 100}}, '$NODE_CONFIG')
          .extend({EnvOverride: {parm5: 'overridden from --NODE_CONFIG', parm6: 101}}, '--NODE_CONFIG');
        assert.strictEqual(local.sources.length,4);
        assert.strictEqual(local.sources[2].source,'$NODE_CONFIG');
        assert.strictEqual(local.sources[3].source,'--NODE_CONFIG');
        assert.isTrue(local.sources.every(({ source, data, module }) =>
          typeof source === 'string' && typeof data === 'object' && typeof module === 'undefined'));
      },
    },
  })
  .addBatch({
    'config.parser': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'Validate method exists': function(config) {
        assert.isFunction(config.create);
      },
    },
  }) // TODO
  .addBatch({
    'config.create()': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'Validate method exists': function(config) {
        assert.isFunction(config.create);
      },
    },
  }) // TODO
  .addBatch({
    'config.extend()': {
      'Validate method exists': function() {
        assert.isFunction(config.extend);
      },
      'Throws when trying to use method after the config property has been accessed': function() {
        const local = config.create();
        local.extend({key: 'value'});
        assert.strictEqual(local.get('key'), 'value');
        assert.throws(() => local.extend({key: 'newValue'}),
          /Configuration object is immutable and cannot be changed/);
        assert.strictEqual(local.get('key'), 'value');
      }
    },
  }) // TODO
  .addBatch({
    'config.parseFile()': {
      topic: () => config.create({
        configDir: __dirname + '/7-config',
      }),
      'Validate method exists': function(config) {
        assert.isFunction(config.parseFile);
      },
      'Parsing configurations files with or without BOM': function(config) {
        assert.doesNotThrow(() => config.parseFile(__dirname + '/7-config/defaultNoBOM.json'));
        assert.doesNotThrow(() => config.parseFile(__dirname + '/7-config/defaultWithUnicodeBOM.json'));
        assert.strictEqual(config.get('siteTitle'), 'A valid site title from default.json');
        assert.strictEqual(config.get('Customers.dbName'), 'from_default_json');
      },
      'Throws when trying to use method after the config property has been accessed': function() {
        const local = config.create();
        local.parseFile(__dirname + '/7-config/defaultNoBOM.json');
        assert.strictEqual(local.get('siteTitle'), 'A valid site title from default.json');
        assert.throws(() => local.parseFile(__dirname + '/7-config/defaultNoBOM.json'),
          /Configuration object is immutable and cannot be changed/);
        assert.strictEqual(local.get('siteTitle'), 'A valid site title from default.json');
      },
    },
  }) // TODO
  .addBatch({
    'config.loadFiles()': {
      topic() {
        return config.create()
          .loadFiles({
            configDir: __dirname + '/config',
            environment: 'test',
            appInstance: '3',
          })
          .extend({EnvOverride: {parm3: 'overridden from $NODE_CONFIG', parm4: 100}}, '$NODE_CONFIG')
          .extend({EnvOverride: {parm5: 'overridden from --NODE_CONFIG', parm6: 101}}, '--NODE_CONFIG')
          .parseFile(__dirname + '/config/runtime.json');
      },
      'Validate method exists': function(config) {
        assert.isFunction(config.loadFiles);
      },
      // 'Parsing configurations from the {environment} file': function(config) {
      //   assert.strictEqual(config.get('Customers.dbPort'), '5999');
      // },
      // 'Parsing configurations from the {instance} file': function(config) {
      //   assert.strictEqual(config.get('Customers.altDbPort'), '4400');
      // },
      // 'Parsing configurations from the {local} file': function(config) {
      //   assert.strictEqual(config.get('Customers.dbPassword'), 'real password');
      // },
      // 'Parsing configurations from the {local-environment} file': function(config) {
      //   assert.deepEqual(config.get('Customers.lang'), ['en','de','es']);
      //   assert.strictEqual(config.get('Customers.dbPassword2'), 'another password');
      // },
      // 'Parsing configurations from the {local-instance} file': function(config) {
      //   assert.deepEqual(config.get('Customers.altDbPort1'), '2209');
      // },
      // 'Parsing configurations from the "runtime.json" file': function(config) {
      //   assert.strictEqual(config.get('Customers.dbName'), 'override_from_runtime_json');
      // },
      // 'Extends configurations from config.extend()': function(config) {
      //   assert.strictEqual(config.get('EnvOverride.parm3'), 'overridden from config.extend()');
      //   assert.strictEqual(config.get('EnvOverride.parm4'), 100);
      // },
      'Throws when trying to use method after the config property has been accessed': function() {
        const local = config.create();
        local.loadFiles({configDir: __dirname + '/config'});
        assert.strictEqual(local.get('Customers.dbName'), 'from_default_xml');
        assert.throws(() => local.loadFiles({configDir: __dirname + '/7-config'}),
          /Configuration object is immutable and cannot be changed/);
        assert.strictEqual(local.get('Customers.dbName'), 'from_default_xml');
      },
    },
  }) // TODO
  .addBatch({
    'config.get()': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'Validate method exists': function(config) {
        assert.isFunction(config.get);
      },
      'Ensure a top-level item is returned': function(config) {
        assert.isTrue(typeof config.get('TestModule') === 'object');
      },
      'Ensure a sub-level item is returned': function(config) {
        assert.strictEqual(config.get('Customers.dbHost'), 'base');
      },
      'Ensure an extended property accessor remains a getter': function(config) {
        assert.strictEqual(config.get('customerDbPort'), '5999');
      },
      'Ensure a cloned property accessor remains a getter': function(config) {
        assert.strictEqual(config.get('Customers.dbString'), 'from_default_xml:5999');
      },
      'Ensure a cloned property accessor is not immutable': function(config) {
        assert.notEqual(config.get('Customers.random'), config.get('Customers.random'));
      },
      'Ensure a proper exception is thrown on misspellings': function(config) {
        assert.throws(
          function () { config.get('mis.spelled'); },
          /Configuration property "mis.spelled" is not defined/
        );
      },
      'Ensure an exception is thrown on non-objects': function(config) {
        assert.throws(
          function () { config.get('Testmodule.misspelled'); },
          /Configuration property "Testmodule.misspelled" is not defined/
        );
      },
      'Ensure get(undefined) throws an exception': function(config) {
        assert.throws(
          function () { config.get(undefined); },
          /Illegal call to config.get with a non-string argument/
        );
      },
      'Ensure get(null) throws an exception': function(config) {
        assert.throws(
          function () { config.get(null); },
          /Illegal call to config.get with a non-string argument/
        );
      },
      'Ensure get(\'\') throws an exception': function(config) {
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
      'Validate method exists': function(config) {
        assert.isFunction(config.has);
      },
      'Identifies not having an element': function(config) {
        assert.isFalse(config.has('Customers.dbHosx'));
      },
      'Ensure a top-level item can be tested': function(config) {
        assert.isTrue(config.has('TestModule'));
      },
      'Ensure a sub-level item can be tested': function(config) {
        assert.isTrue(config.has('Customers.dbHost'));
      },
      'Ensure a missing sub-level item can be tested': function(config) {
        assert.isTrue(config.has('Customers.emptySub'));
        assert.isFalse(config.has('Customers.emptySub.foo'));
      },
      'Ensure has(undefined) returns false': function(config) {
        assert.isFalse(config.has(undefined));
      },
      'Ensure has(null) returns false': function(config) {
        assert.isFalse(config.has(null));
      },
      'Ensure has(\'\') returns false': function(config) {
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
      'Validate method exists': function(config) {
        assert.isFunction(config.subModule);
      },
      'Validate config methods are available': function(config) {
        const module = config.subModule('TestModule');
        assert.isFunction(module.extend);
        assert.isFunction(module.parseFile);
        assert.isFunction(module.loadFiles);
        assert.isFunction(module.subModule);
      },
      'Ensure sub-modules reference their main-module configuration': function(config) {
        const module = config.subModule('TestModule');
        assert.strictEqual(module.config, config.get('TestModule'));
      },
      'Ensure sub-modules and their main-module share configuration': function(config) {
        const module = config.subModule('TestModule');
        assert.strictEqual(module.get('parm1'), 'value1');
        assert.strictEqual(config.get('TestModule.parm1'), 'value1');
      },
      'Ensure sub-modules extensions remain intact unless overridden': function(config) {
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
      'Validate method exists': function(config) {
        assert.isFunction(config.collectConfigFiles);
      },
      'Ensure configuration files who match and exists are collected in resolution order': function(config) {
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
