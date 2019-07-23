const { requireUncached, processScope } = require('./_utils');
const assert = require('assert');
const vows = require('vows');

function cleanConfig(options, handler) {
  return processScope(options, function() {
    handler.apply(this, [
      requireUncached(__dirname + '/../lib/config')
    ].concat(Array.prototype.slice.call(arguments)));
  });
}

vows.describe(`Config instance defaults`)
  .addBatch({
    'Testing default options from env-vars': {
      '$NODE_CONFIG_DIR': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
        }
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$NODE_ENV': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          NODE_ENV: 'test',
        }
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml', 'local-test.json'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$NODE_APP_INSTANCE': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          NODE_APP_INSTANCE: '3',
        }
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default-3.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml', 'local-3.yml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$NODE_ENV; $NODE_APP_INSTANCE': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          NODE_ENV: 'test',
          NODE_APP_INSTANCE: '3',
        }
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default-3.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml', 'local-3.yml',
          'local-test.json'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$HOST': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          HOST: 'test',
        }
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$HOSTNAME': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          HOSTNAME: 'test',
        }
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$HOST; $HOSTNAME': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          HOST: 'mismatch',
          HOSTNAME: 'test',
        }
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
    },
    'Testing default options from cli-args': {
      '--NODE_CONFIG_DIR': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
        ])
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '--NODE_ENV': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
          '--NODE_ENV', 'test',
        ]),
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml', 'local-test.json'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '--NODE_APP_INSTANCE': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
          '--NODE_APP_INSTANCE', '3',
        ]),
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default-3.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml', 'local-3.yml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '--NODE_ENV --NODE_APP_INSTANCE': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
          '--NODE_APP_INSTANCE', '3',
          '--NODE_ENV', 'test',
        ]),
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default-3.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml', 'local-3.yml',
          'local-test.json'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '--HOST': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
          '--HOST', 'test',
        ]),
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '--HOSTNAME': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
          '--HOSTNAME', 'test',
        ]),
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '--HOST --HOSTNAME': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
          '--HOST', 'mismatch',
          '--HOSTNAME', 'test',
        ]),
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
    },
    'Testing default options from env-vars and cli-args': {
      '$NODE_APP_INSTANCE; --NODE_CONFIG_DIR': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_CONFIG_DIR', __dirname + '/config',
        ]),
        env: {
          NODE_CONFIG_DIR: __dirname + '/7-config',
          NODE_APP_INSTANCE: '3',
        },
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default-3.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml', 'local-3.yml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$NODE_ENV; --NODE_APP_INSTANCE': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--NODE_APP_INSTANCE', '3',
        ]),
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          NODE_ENV: 'test',
          NODE_APP_INSTANCE: '7',
        },
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default-3.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'test.yaml', 'local.yaml', 'local-3.yml',
          'local-test.json'
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
      '$HOSTNAME; --HOST': cleanConfig({
        argv: process.argv.slice(2).concat([
          '--HOST', 'mismatch',
        ]),
        env: {
          NODE_CONFIG_DIR: __dirname + '/config',
          HOST: 'test',
          HOSTNAME: 'ignored',
        },
      }, function(config) {
        assert.deepEqual(config.collectConfigFiles(config.options), [
          'default.js', 'default.json', 'default.json5', 'default.hjson',
          'default.toml', 'default.coffee', 'default.yaml', 'default.yml', 'default.cson',
          'default.properties', 'default.xml', 'local.yaml',
        ].map(filename => `${__dirname}/config/${filename}`));
      }),
    },
  })
  .addBatch({
    'Testing NODE_*_ENV loading order': {
      'default environment "development" is used': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/12-config',
        }
      }, function(config) {
        assert.strictEqual(config.get('deploymentUsed'), 'default');
      }),
      '$NODE_ENV is used if $NODE_CONFIG_ENV is undefined': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/12-config',
          NODE_ENV: 'apollo',
        }
      }, function(config) {
        assert.strictEqual(config.get('deploymentUsed'), 'node-config-env-provided');
      }),
      '$NODE_CONFIG_ENV is used if $NODE_ENV is undefined': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/12-config',
          NODE_CONFIG_ENV: 'mercury',
        }
      }, function(config) {
        assert.strictEqual(config.get('deploymentUsed'), 'node-env-provided');
      }),
      '$NODE_CONFIG_ENV is used if $NODE_ENV is defined': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/12-config',
          NODE_CONFIG_ENV: 'apollo',
          NODE_ENV: 'mercury',
        }
      }, function(config) {
        assert.strictEqual(config.get('deploymentUsed'), 'node-config-env-provided');
      }),
    },
    'Testing HOST* loading order': {
      '$HOST is used': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/12-config',
          HOST: 'apollo',
        }
      }, function(config) {
        assert.strictEqual(config.get('deploymentUsed'), 'node-config-env-provided');
      }),
      '$HOSTNAME is used': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/12-config',
          HOSTNAME: 'mercury',
        }
      }, function(config) {
        assert.strictEqual(config.get('deploymentUsed'), 'node-env-provided');
      }),
      '$HOST is used if $HOSTNAME is defined': cleanConfig({
        env: {
          NODE_CONFIG_DIR: __dirname + '/12-config',
          HOSTNAME: 'apollo',
          HOST: 'mercury',
        }
      }, function(config) {
        assert.strictEqual(config.get('deploymentUsed'), 'node-env-provided');
      }),
    },
  })
  .addBatch({
    'Validate strictness': {
      'an unused environment value and valid NODE_APP_INSTANCE value throws an exception': cleanConfig({
        env: {
          NODE_ENV: 'BOOM',
          NODE_APP_INSTANCE: 'valid-instance',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname + '/6-config',
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /FATAL: environment value of "BOOM" did not match any deployment config file names/)
      }),
      'environment=development with no development file does not throw an exception': cleanConfig({
        env: {
          NODE_ENV: 'development',
          NODE_APP_INSTANCE: 'valid-instance',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname + '/6-config',
        },
      }, function(config) {
        assert.doesNotThrow(() => config.has('deploymentUsed'));
      }),
      'environment=production,cloud with no cloud file throws an exception': cleanConfig({
        env: {
          NODE_ENV: 'production,cloud',
          NODE_APP_INSTANCE: 'valid-instance',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname + '/6-config',
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /FATAL: environment value of "cloud" did not match any deployment config file names/)
      }),
      'an unused appInstance and valid environment value throws an exception': cleanConfig({
        env: {
          NODE_ENV: 'valid-deployment',
          NODE_APP_INSTANCE: 'BOOM',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname + '/6-config',
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /FATAL: appInstance value of "BOOM" did not match any instance config file names/)
      }),
      'environment=default throws exception: reserved word': cleanConfig({
        env: {
          NODE_ENV: 'default',
          NODE_APP_INSTANCE: 'valid-instance',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname + '/6-config',
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /FATAL: environment value of "default" is ambiguous/)
      }),
      'environment=production,default throws exception: reserved word': cleanConfig({
        env: {
          NODE_ENV: 'production,default',
          NODE_APP_INSTANCE: 'valid-instance',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname + '/6-config',
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /FATAL: environment value of "default" is ambiguous/)
      }),
      'environment=local throws exception: reserved word': cleanConfig({
        env: {
          NODE_ENV: 'local',
          NODE_APP_INSTANCE: 'valid-instance',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname + '/6-config',
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /FATAL: environment value of "local" is ambiguous/)
      }),
      'a configuration directory without configuration files throws': cleanConfig({
        env: {
          NODE_ENV: 'local',
          NODE_APP_INSTANCE: 'valid-instance',
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname,
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /WARNING: No configurations found in configuration directory/)
      }),
      'a configuration directory without configuration files is suppressed': cleanConfig({
        env: {
          NODE_ENV: 'local',
          NODE_APP_INSTANCE: 'valid-instance',
          SUPPRESS_NO_CONFIG_WARNING: true,
          NODE_CONFIG_STRICT_MODE: true,
          NODE_CONFIG_DIR: __dirname,
        },
      }, function(config) {
        assert.throws(() => config.has('deploymentUsed'),
          /FATAL: environment value of "local" is ambiguous/)
      }),
    },
  })
  .export(module);
