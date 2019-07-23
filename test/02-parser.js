const { requireUncached, processScope } = require('./_utils');
const Parser = require('../lib/parser');
const utils = require('../lib/utils');
const assert = require('assert');
const vows = require('vows');

vows.describe(`Configuration Parser instance`)
  .addBatch({
    'parser.validators': {
      topic: () => new Parser,
      'is set with defaults': function(parser) {
        assert.strictEqual(parser.validators.length, 1);
        assert.isFunction(parser.validators[0]);
      },
      'setter accepts only arrays': function(parser) {
        assert.throws(() => parser.validators = false,
          /Illegal set of \w+ with a non-array argument/);
      },
      'setter validate arrays content': function(parser) {
        assert.throws(() => parser.validators = [false],
          /Invalid items schema, \w+ failed validations/);
      },
      'parsing returns null when validations fails': function(parser) {
        assert.isFalse(parser.parse(__dirname + '/config/default.json') === null);
        parser.validators = [(file, content) => !content.includes('staticArray')];
        assert.isTrue(parser.parse(__dirname + '/config/default.json') === null);
      },
    },
    'parser.middleware': {
      topic: () => new Parser,
      'is set with defaults': function(parser) {
        assert.strictEqual(parser.middleware.length, 1);
        assert.isFunction(parser.middleware[0]);
      },
      'setter accepts only arrays': function(parser) {
        assert.throws(() => parser.middleware = false,
          /Illegal set of \w+ with a non-array argument/);
      },
      'setter validate arrays content': function(parser) {
        assert.throws(() => parser.middleware = [false],
          /Invalid items schema, \w+ failed validations/);
      },
      'parsed content is effected by middleware': function(parser) {
        const parse = () => parser.parse(__dirname + '/config/default.json');
        assert.strictEqual(parse().Customers.dbName, 'from_default_json');
        parser.middleware = [(file, content) => {
          content.Customers.dbName = 'from_middleware';
          return content;
        }];
        assert.strictEqual(parse().Customers.dbName, 'from_middleware');
      },
    },
    'parser.definition': {
      topic: () => new Parser,
      'is set with defaults': function(parser) {
        assert.strictEqual(parser.definition.length, 13);
        assert.isTrue(parser.definition.every(def =>
          typeof def.ext === 'string' && typeof def.parser === 'function'));
      },
      'setter accepts only arrays': function(parser) {
        assert.throws(() => parser.definition = false,
          /Illegal set of \w+ with a non-array argument/);
      },
      'setter validate arrays content': function(parser) {
        assert.throws(() => parser.definition = [false],
          /Invalid items schema, \w+ failed validations/);
      },
    },
    'parser.resolution': {
      topic: () => new Parser,
      'property is set correctly': function(parser) {
        assert.strictEqual(parser.resolution.length, 13);
        assert.isTrue(parser.definition.every(
          (def, index) => def.ext === parser.resolution[index]));
      },
      'setter accepts only arrays': function(parser) {
        assert.throws(() => parser.resolution = false,
          /Illegal set of resolution with a non-array argument/);
      },
      'modifying effects definition property': function(parser) {
        const resolution = ['js', 'yaml', 'properties'];
        parser.resolution = resolution;
        assert.deepEqual(parser.resolution, resolution);
        assert.isTrue(parser.definition.every(
          (def, index) => def.ext === parser.resolution[index]));
      },
    },
    'parser.lib': {
      topic: () => new Parser,
      'definition is immutable': function(parser) {
        const expectedKeys = [
          'validators', 'middleware', 'jsParser', 'jsonParser', 'hjsonParser', 'tomlParser',
          'csonParser', 'iniParser', 'propertiesParser', 'yamlParser', 'xmlParser', 'dirParser'
        ];
        assert.deepEqual(Object.keys(parser.lib), expectedKeys);
        parser.lib = {test: true};
        assert.deepEqual(Object.keys(parser.lib), expectedKeys);
      },
      'properties are immutable': function(parser) {
        assert.deepEqual(Object.keys(parser.lib.validators), ['gitCrypt']);
        assert.deepEqual(Object.keys(parser.lib.middleware), ['configTemplate']);
        parser.lib.validators = {};
        parser.lib.middleware.testing = true;
        delete parser.lib.middleware.configTemplate;
        assert.deepEqual(Object.keys(parser.lib.validators), ['gitCrypt']);
        assert.deepEqual(Object.keys(parser.lib.middleware), ['configTemplate']);
      }
    },
  })
  .addBatch({
    'parser.parse()': {
      topic: () => new Parser,
      'detects corresponding parser by filename extension and returns an object': function(parser) {
        assert.deepEqual(parser.parse(__dirname + '/config/default.json5'), {
          Customers: { dbName: 'from_default_json5' },
          AnotherModule: { parm6: 'value6' }
        });
      },
      'throws when file extension matches no parser definition': function(parser) {
        parser.unset('json5');
        assert.throws(() => parser.parse(__dirname + '/config/default.json5'), /Error: No parser found for/);
      }
    },
    'parser.readFile()': {
      topic: () => new Parser,
      'reads a file and returns its string content': function(parser) {
        assert.equal(parser.readFile(__dirname + '/config/default.toml'), '[AnotherModule]\nparm7 = "value7"');
      },
      'reads a file and returns null if content failed validations': function(parser) {
        parser.validators = [() => false];
        assert.equal(parser.readFile(__dirname + '/config/default.json5'), null);
      },
    },
  })
  .addBatch({
    'parser.set()': {
      topic: () => new Parser,
      'inserts new parser definition': function(parser) {
        assert.strictEqual(parser.resolution.indexOf('json7'), -1);
        assert.throws(() => parser.parse(__dirname + '/16-config/default.json7'), /No parser found for/);
        parser.set('json7', parser.lib.jsonParser);
        assert.notStrictEqual(parser.resolution.indexOf('json7'), -1);
        assert.strictEqual(parser.resolution.indexOf('json7'), parser.resolution.length -1);
        assert.deepEqual(parser.parse(__dirname + '/16-config/default.json7'), {parser: 'json7'});
      },
      'overrides existing parser definition': function(parser) {
        parser.middleware = [];
        assert.notStrictEqual(parser.resolution.indexOf('json5'), -1);
        parser.set('json5', filename => {
          const content = parser.lib.jsonParser.call(parser, filename);
          content.parser = 'json5 override!';
          return content;
        });
        assert.deepEqual(parser.parse(__dirname + '/16-config/default.json5'), {
          parser: 'json5 override!',
          template: {
            secret: 'Env::CUSTOM_TEMPLATE_ENV_VAR|secret'
          },
        });
      },
    },
    'parser.unset()': {
      topic: () => new Parser,
      'returns true when a definition is removed': function(parser) {
        const index = parser.resolution.indexOf('yaml');
        assert.strictEqual(parser.definition.length, 13);
        assert.strictEqual(parser.definition[index].ext, 'yaml');
        assert.isFunction(parser.definition[index].parser);
        assert.notStrictEqual(index, -1);
        assert.isTrue(parser.unset('yaml'));
        assert.strictEqual(parser.definition.length, 12);
        assert.strictEqual(parser.resolution.indexOf('yaml'), -1);
        assert.throws(() => parser.parse('/some/path/to/file.yaml'), /No parser found for/);
      },
      'returns false when a definition not found': function(parser) {
        assert.strictEqual(parser.resolution.indexOf('json7'), -1);
        assert.isFalse(parser.unset('json7'));
      },
      'extension parser definition and resolution are removed': function(parser) {
        assert.strictEqual(parser.resolution.indexOf('yaml'), -1);
        assert.strictEqual(parser.definition.length, 12);
        assert.isFalse(parser.unset('yaml'));
      },
    },
    'parser.reset()': {
      topic: () => new Parser,
      'mutable properties are set to default': function(parser) {
        assert.strictEqual(parser.validators.length, 1);
        assert.strictEqual(parser.middleware.length, 1);
        assert.strictEqual(parser.definition.length, 13);
        assert.strictEqual(parser.resolution.length, 13);
        assert.isFunction(parser.validators[0]);
        assert.isFunction(parser.middleware[0]);
        assert.isTrue(parser.definition.every(def =>
          typeof def.ext === 'string' && typeof def.parser === 'function'));
        assert.isTrue(parser.definition.every(
          (def, index) => def.ext === parser.resolution[index]));
      },
      'clears all mutable properties': function(parser) {
        parser.reset();
        assert.deepEqual(parser.validators, []);
        assert.deepEqual(parser.middleware, []);
        assert.deepEqual(parser.definition, []);
        assert.deepEqual(parser.resolution, []);
      },
    },
  })
  .addBatch({
    'validators.skipGitCrypt()': {
      topic: () => {
        const parser = new Parser;
        parser.validators = [
          parser.lib.validators.gitCrypt(false)
        ];
        return parser;
      },
      'encrypted files are skipped silently': function(parser) {
        assert.strictEqual(parser.parse(__dirname + '/10-config/encrypted.json'), null);
      },
    },
    'validators.skipGitCrypt(strict)': {
      topic: () => {
        const parser = new Parser;
        parser.validators = [
          parser.lib.validators.gitCrypt(true)
        ];
        return parser;
      },
      'encrypted files throw an exception on strict-mode': function(parser) {
        assert.throws(
          () => parser.parse(__dirname + '/10-config/encrypted.json'),
          /Error: Cannot read git-crypt file/
        );
      },
    },
  })
  .addBatch({
    'middleware.configTemplate()': {
      topic: () => new Parser,
      'supports "Env" command': processScope({
        env: {
          CUSTOM_TEMPLATE_FILE_VAR: __dirname + '/16-config/env-custom.json',
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            path: 'Env::CUSTOM_TEMPLATE_FILE_VAR',
          }
        });
        assert.strictEqual(object.file.path, __dirname + '/16-config/env-custom.json');
      }),
      'supports "Env" command with "json" option': processScope({
        env: {
          CUSTOM_TEMPLATE_JSON_VAR: JSON.stringify({options: {test: true, failed: false}}),
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            json: 'Env::CUSTOM_TEMPLATE_JSON_VAR|json',
          }
        });
        assert.deepEqual(object.file.json, {options: {test: true, failed: false}});
      }),
      'supports "File" command': processScope({
        env: {
          CUSTOM_TEMPLATE_FILE_VAR: __dirname + '/16-config/env-custom.json',
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            data: `File::${__dirname}/16-config/env-custom.json`,
          }

        });
        assert.deepEqual(object.file.data, {custom: {name: 'env-custom'}});
      }),
      'supports "File" command with "string" option': processScope({
        env: {
          CUSTOM_TEMPLATE_FILE_VAR: __dirname + '/16-config/env-custom.json',
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            data: `File::${__dirname}/16-config/env-custom.json|String`,
          }
        });
        assert.deepEqual(JSON.parse(object.file.data), {custom: {name: 'env-custom'}});
      }),
      'supports multiple command inline': processScope({
        env: {
          CUSTOM_TEMPLATE_FILE_VAR: __dirname + '/16-config/env-custom.json',
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            data: `File::Env::CUSTOM_TEMPLATE_FILE_VAR`,
          }
        });
        assert.deepEqual(object.file.data, {custom: {name: 'env-custom'}});
      }),
      'supports multiple command inline with options': processScope({
        env: {
          CUSTOM_TEMPLATE_FILE_VAR: __dirname + '/16-config/env-custom.json',
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            data: `File::Env::CUSTOM_TEMPLATE_FILE_VAR|string`,
          }
        });
        assert.deepEqual(JSON.parse(object.file.data), {custom: {name: 'env-custom'}});
      }),
      'supports "secret" global option': processScope({
        env: {
          CUSTOM_TEMPLATE_ENV_VAR: 'TemplateEnvValue',
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            data: `Env::CUSTOM_TEMPLATE_ENV_VAR|secret`,
          }
        });
        assert.isFalse(Object.keys(object.file).includes('data'));
        assert.strictEqual(object.file.data, 'TemplateEnvValue');
        assert.strictEqual(JSON.stringify(object.file), '{"name":"template"}');
      }),
      'overwritten secrets are enumerable': processScope({
        env: {
          CUSTOM_TEMPLATE_ENV_VAR: 'TemplateEnvValue',
        },
      }, function(parser) {
        const [ configTemplate ] = parser.middleware;
        const object = configTemplate.call(parser, 'template', {
          file: {
            name: 'template',
            data: `Env::CUSTOM_TEMPLATE_ENV_VAR|secret`,
          }
        });
        assert.isFalse(Object.keys(object.file).includes('data'));
        assert.strictEqual(object.file.data, 'TemplateEnvValue');
        assert.strictEqual(JSON.stringify(object.file), '{"name":"template"}');
        utils.extendDeep(object, {file: {data: 'newValue'}});
        assert.isTrue(Object.keys(object.file).includes('data'));
        assert.strictEqual(object.file.data, 'newValue');
        assert.strictEqual(JSON.stringify(object.file), '{"name":"template","data":"newValue"}');
      }),
    },
  })
  .export(module);
