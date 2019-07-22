const { requireUncached } = require('./_utils');
const config = requireUncached(__dirname + '/../lib/config');
const Parser = require('../lib/parser');
const assert = require('assert');
const vows = require('vows');

vows.describe(`Parser instance`)
  .addBatch({
    'parser.validators': {},
    'parser.middleware': {},
    'parser.definition': {},
    'parser.resolution': {
      topic: () => config.create({configDir: __dirname + '/16-config'}),
      'Ensure "resolution" property is set correctly': function(config) {
        assert.strictEqual(config.parser.resolution.length, 13);
        assert.isTrue(config.parser.definition.every(
          (def, index) => def.ext === config.parser.resolution[index]));
      },
      'Ensure "resolution" changes effect "definition"': function(config) {
        assert.strictEqual(config.parser.resolution.length, 13);
        assert.isTrue(config.parser.definition.every(
          (def, index) => def.ext === config.parser.resolution[index]));
      },
    },
    'parser.set()': {
      topic: () => config.create({
        configDir: __dirname + '/16-config',
      }),
      'Ensure method inserts new parser definition': function(config) {
        assert.strictEqual(config.parser.resolution.indexOf('json7'), -1);
        assert.throws(() => config.parser.parse(__dirname + '/16-config/default.json7'), /No parser found for/);
        config.parser.set('json7', config.parser.lib.jsonParser);
        assert.notStrictEqual(config.parser.resolution.indexOf('json7'), -1);
        assert.deepEqual(config.parser.parse(__dirname + '/16-config/default.json7'), {parser: 'json7'});
      },
      'Ensure method overrides existing parser definition': function(config) {
        config.parser.middleware = [];
        assert.notStrictEqual(config.parser.resolution.indexOf('json5'), -1);
        config.parser.set('json5', filename => {
          const content = config.parser.lib.jsonParser.call(config.parser, filename);
          content.parser = 'json5 override!';
          return content;
        });
        assert.deepEqual(config.parser.parse(__dirname + '/16-config/default.json5'), {
          parser: 'json5 override!',
          template: {
            secret: 'Env::CUSTOM_TEMPLATE_ENV_VAR|secret'
          },
        });
      },
    },
    'parser.unset()': {
      topic: () => config.create({configDir: __dirname + '/16-config'}),
      'Ensure method returns true when a definition is removed': function(config) {
        const index = config.parser.resolution.indexOf('yaml');
        assert.strictEqual(config.parser.definition.length, 13);
        assert.strictEqual(config.parser.definition[index].ext, 'yaml');
        assert.isFunction(config.parser.definition[index].parser);
        assert.notStrictEqual(index, -1);
        assert.isTrue(config.parser.unset('yaml'));
        assert.strictEqual(config.parser.definition.length, 12);
        assert.strictEqual(config.parser.resolution.indexOf('yaml'), -1);
        assert.throws(() => config.parser.parse('/some/path/to/file.yaml'), /No parser found for/);
      },
      'Ensure method returns false when a definition not found': function(config) {
        assert.strictEqual(config.parser.resolution.indexOf('json7'), -1);
        assert.isFalse(config.parser.unset('json7'));
      },
      'Ensure given extension parser definition and resolution are removed': function(config) {
        assert.strictEqual(config.parser.resolution.indexOf('yaml'), -1);
        assert.strictEqual(config.parser.definition.length, 12);
        assert.isFalse(config.parser.unset('yaml'));
      },
    },
    'parser.reset()': {
      topic: () => config.create({configDir: __dirname + '/16-config'}),
      'Ensure "validators" property default is set': function(config) {
        assert.strictEqual(config.parser.validators.length, 1);
        assert.isFunction(config.parser.validators[0]);
      },
      'Ensure "middleware" property default is set': function(config) {
        assert.strictEqual(config.parser.middleware.length, 1);
        assert.isFunction(config.parser.middleware[0]);
      },
      'Ensure "definition" property default is set': function(config) {
        assert.strictEqual(config.parser.definition.length, 13);
        assert.isTrue(config.parser.definition.every(def =>
          typeof def.ext === 'string' && typeof def.parser === 'function'));
      },
      'Ensure "resolution" property is set correctly': function(config) {
        assert.strictEqual(config.parser.resolution.length, 13);
        assert.isTrue(config.parser.definition.every(
          (def, index) => def.ext === config.parser.resolution[index]));
      },
      'Ensure reset clears all mutable ': function(config) {
        config.parser.reset();
        assert.deepEqual(config.parser.validators, []);
        assert.deepEqual(config.parser.middleware, []);
        assert.deepEqual(config.parser.definition, []);
        assert.deepEqual(config.parser.resolution, []);
      },
    },
    'parser.parse()': {},
    'parser.readFile()': {},
    'parser.lib': {
      'Validate lib methods are available': function() {},
      'Ensure lib is immutable': function() {
        assert.deepEqual(Object.keys(config.parser.lib), [
          'validators', 'middleware', 'jsParser', 'jsonParser', 'hjsonParser', 'tomlParser',
          'csonParser', 'iniParser', 'propertiesParser', 'yamlParser', 'xmlParser', 'dirParser'
        ]);
        config.parser.lib = {test: true};
        assert.deepEqual(Object.keys(config.parser.lib), [
          'validators', 'middleware', 'jsParser', 'jsonParser', 'hjsonParser', 'tomlParser',
          'csonParser', 'iniParser', 'propertiesParser', 'yamlParser', 'xmlParser', 'dirParser'
        ]);
      },
      'Ensure lib properties are immutable': function() {
        assert.deepEqual(Object.keys(config.parser.lib.validators), ['gitCrypt']);
        assert.deepEqual(Object.keys(config.parser.lib.middleware), ['configTemplate']);
        config.parser.lib.validators = {};
        config.parser.lib.middleware.testing = true;
        delete config.parser.lib.middleware.configTemplate;
        assert.deepEqual(Object.keys(config.parser.lib.validators), ['gitCrypt']);
        assert.deepEqual(Object.keys(config.parser.lib.middleware), ['configTemplate']);
      }
    },
  }) // TODO
  .addBatch({
    'validators.skipGitCrypt()': {
      topic: () => {
        const localConfig = config.create({
          configDir: __dirname + '/10-config',
          environment: 'encrypted',
        });
        localConfig.parser.validators = [
          Parser.lib.validators.gitCrypt(false)
        ];
        return localConfig;
      },
      'Validated encrypted files are skipped silently': function(config) {
        assert.strictEqual(config.get('Customers.dbPassword'), 'password will be overwritten.');
      },
    },
    'validators.skipGitCrypt(strict)': {
      topic: () => {
        const localConfig = config.create({
          configDir: __dirname + '/10-config',
          environment: 'encrypted',
        });
        localConfig.parser.validators = [
          Parser.lib.validators.gitCrypt(true)
        ];
        return localConfig;
      },
      'Validated encrypted files throw an exception on strict mode': function(config) {
        assert.throws(
          () => assert.strictEqual(config.get('Customers.dbPassword'), 'password will be overwritten.'),
          /Error: Cannot read git-crypt file/
        );
      },
    },
  })
  .addBatch({
    'middleware.configTemplate()': {
      topic: () => {
        process.env.CUSTOM_TEMPLATE_ENV_VAR = 'EnvValue';
        process.env.CUSTOM_TEMPLATE_FILE_VAR = __dirname + '/16-config/env-custom.json';
        process.env.CUSTOM_TEMPLATE_JSON_VAR = JSON.stringify({options: {test: true, failed: false}});
        return config.create({configDir: __dirname + '/16-config'});
      },
      'Ensure "Env" command working correctly': function(config) {
        assert.strictEqual(config.get('file.path'), __dirname + '/16-config/env-custom.json');
      },
      'Ensure "Env" command working correctly with the "json" option': function(config) {
        assert.deepEqual(config.get('file.json'), {options: {test: true, failed: false}});
      },
      'Ensure "Env" command working correctly with a parsed "File" command': function(config) {
        assert.deepEqual(config.get('file.parsed'), {custom: {name: 'env-custom'}});
      },
      'Ensure "Env" command working correctly with "File" command and the "string" option': function(config) {
        assert.strictEqual(config.get('file.text'), JSON.stringify(
          {custom: {name: 'env-custom'}}, null, 3));
      },
      'Ensure "secret" option working correctly': function(config) {
        assert.isFalse(Object.keys(config.get('template')).includes('secret'));
        assert.strictEqual(config.get('template.secret'), 'EnvValue');
        assert.strictEqual(JSON.stringify(config.get('template')), '{}');
      },
      'Ensure overwritten secrets are enumerable': function(config) {
        const local = config.create({
          configDir: __dirname + '/16-config',
          appInstance: 'override',
        });
        assert.isTrue(Object.keys(local.get('template')).includes('secret'));
        assert.strictEqual(local.get('template.secret'), 'override_no_longer_secret');
        assert.strictEqual(JSON.stringify(local.get('template')), '{"secret":"override_no_longer_secret"}');
      },
    },
  })
  // .addBatch({
  //   'Using the default parser - Sanity check': {
  //     topic: function() {
  //       process.env.NODE_CONFIG_DIR = __dirname + '/16-config';
  //       return requireUncached(__dirname + '/../lib/config');
  //     },
  //     'validate default parser order': function(CONFIG) {
  //       assert.strictEqual(CONFIG.get('file.type'), 'yaml');
  //       assert.strictEqual(CONFIG.get('file.name'), 'local.yml');
  //       assert.strictEqual(CONFIG.get('parser'), 'js-yaml');
  //       assert.strictEqual(CONFIG.has('custom.key'), false);
  //     },
  //   }
  // })
  // .addBatch({
  //   'Using setParserOrder to change parsing order': {
  //     topic: function() {
  //       process.env.NODE_CONFIG_DIR = __dirname + '/16-config';
  //       process.env.NODE_CONFIG_PARSER = __dirname + '/16-config/parser/custom-1';
  //       return requireUncached(__dirname + '/../lib/config');
  //     },
  //     'validate changes to parser order': function(CONFIG) {
  //       assert.strictEqual(CONFIG.get('file.type'), 'custom');
  //       assert.strictEqual(CONFIG.get('file.name'), 'local.yml');
  //       // assert.strictEqual(CONFIG.get('file.name'), 'my-custom-awesome-dsl');
  //       assert.strictEqual(CONFIG.get('parser'), 'custom-awesomeness');
  //       assert.strictEqual(CONFIG.get('custom.key'), 'wow!');
  //     },
  //   }
  // })
  // .addBatch({
  //   'Using setParserOrder to replace parsing order': {
  //     topic: function() {
  //       process.env.NODE_CONFIG_DIR = __dirname + '/16-config';
  //       process.env.NODE_CONFIG_PARSER = __dirname + '/16-config/parser/custom-2';
  //       return requireUncached(__dirname + '/../lib/config');
  //     },
  //     'validate changes to parser order': function(CONFIG) {
  //       assert.strictEqual(CONFIG.get('file.type'), 'json');
  //       assert.strictEqual(CONFIG.get('file.name'), 'local.yml');
  //       assert.strictEqual(CONFIG.get('parser'), 'json');
  //       assert.strictEqual(CONFIG.get('custom.key'), 'wow!');
  //     },
  //   }
  // })
  // .addBatch({
  //   'Using setParser to replace a parser': {
  //     topic: function() {
  //       process.env.NODE_CONFIG_DIR = __dirname + '/16-config';
  //       process.env.NODE_CONFIG_PARSER = __dirname + '/16-config/parser/custom-3';
  //       return requireUncached(__dirname + '/../lib/config');
  //     },
  //     'validate changes to parser logic': function(CONFIG) {
  //       assert.strictEqual(CONFIG.get('file.type'), 'yaml');
  //       assert.strictEqual(CONFIG.get('file.name'), 'local.yml');
  //       assert.strictEqual(CONFIG.get('parser'), 'json5');
  //       assert.strictEqual(CONFIG.get('custom.key'), 'json5 rules!');
  //     },
  //   },
  //   teardown : function (topic) {
  //     delete process.env.NODE_CONFIG_PARSER;
  //     requireUncached(__dirname + '/../parser');
  //   }
  // })
  .export(module);
