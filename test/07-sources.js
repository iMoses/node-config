const { requireUncached } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const assert = require('assert');
const vows = require('vows');

require('coffeescript').register();

vows.describe(`Configuration sources`)
  .addBatch({
    'config.sources': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'property exists': function(config) {
        assert.isArray(config.sources);
      },
      'property is immutable': function(config) {
        config.sources = null;
        assert.isArray(config.sources);
      },
      'is empty before initial access': function(config) {
        assert.strictEqual(config.sources.length, 0);
      },
      'contains all configuration sources': function(config) {
        assert.strictEqual(config.get('ContainsQuote'), '"this has a quote"');
        assert.strictEqual(config.sources.length, 16);
      },
      'schema is valid': function(config) {
        const { source, data, module } = config.sources[10];
        assert.isObject(data);
        assert.isUndefined(module);
        assert.strictEqual(source, __dirname + '/config/default.properties');
      },
      'includes empty objects': function(config) {
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
    },
    'config.create()': {
      topic: () => config.create({
        configDir: __dirname + '/config',
        environment: 'test',
        appInstance: '3',
      }),
      'is empty before initial access': function(config) {
        assert.strictEqual(config.sources.length, 0);
      },
      'contains all configuration sources after initial access': function(config) {
        assert.strictEqual(config.get('ContainsQuote'), '"this has a quote"');
        assert.strictEqual(config.sources.length, 16);
      },
    },
    'config.extend()': {
      topic: () => config.create()
        .loadFiles({configDir: __dirname + '/5-config'})
        .extend({EnvOverride: {parm3: 'overridden from $NODE_CONFIG', parm4: 100}}, '$NODE_CONFIG')
        .extend({EnvOverride: {parm5: 'overridden from --NODE_CONFIG', parm6: 101}}, '--NODE_CONFIG')
        .extend({EnvOverride: {}}),
      'contains config.extend sources': function(config) {
        assert.strictEqual(config.sources.length,5);
        assert.strictEqual(config.sources[2].source,'$NODE_CONFIG');
        assert.strictEqual(config.sources[3].source,'--NODE_CONFIG');
        assert.isTrue(config.sources.every(({ source, data, module }) =>
          typeof source === 'string' && typeof data === 'object' && typeof module === 'undefined'));
      },
      'source defaults to "config.extend" when missing': function(config) {
        assert.strictEqual(config.sources[4].source,'config.extend');
      },
    },
    'config.subModule()': {
      topic: () => {
        const localConfig = config.create({
          configDir: __dirname + '/config',
          environment: 'test',
          appInstance: '3',
        });
        localConfig
          .subModule('TestModule')
          .parseFile(__dirname + '/config/default.properties');
        return localConfig;
      },
      'contains sub-module actions made before initial access': function(config) {
        assert.strictEqual(config.sources.length, 1);
      },
      'contains all configuration sources after initial access': function(config) {
        assert.strictEqual(config.get('ContainsQuote'), '"this has a quote"');
        assert.strictEqual(config.sources.length, 17);
      },
      'schema is valid when using sub-modules': function(config) {
        assert.strictEqual(config.sources[0].source, __dirname + '/config/default.properties');
        assert.strictEqual(config.sources[0].module, 'TestModule');
        assert.isObject(config.sources[0].data);
      },
    },
  })
  .export(module);
