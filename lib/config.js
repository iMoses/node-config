const { asyncConfig, asyncSymbol } = require('./async');
const { deferConfig, DeferredConfig } = require('./defer');

const Parser = require('../parser');
const utils = require('./utils');

const FileSystem = require('fs');
const Path = require('path');
const OS = require('os');

module.exports = new Config;

Config.prototype.async = asyncConfig;
Config.prototype.defer = deferConfig;

/**
 * new Config({
 *     configDir: NODE_CONFIG_DIR || ./config,
 *     environment: NODE_CONFIG_ENV || NODE_ENV || development,
 *     hostname: HOST || HOSTNAME || os.hostname(),
 *     appInstance: NODE_APP_INSTANCE,
 * })
 *
 * configDir {string}   a path to the configuration directory
 *                      can contain multiple paths separated by a column (:)
 *                      defaults: NODE_CONFIG_DIR | ./config,
 * environment {string} name of the active environment (e.g. staging, production)
 *                      can contain multiple environments separated by a coma (,)
 *                      defaults: NODE_CONFIG_ENV | NODE_ENV | development
 * hostname{string}     hostname of the active application
 *                      defaults: HOST | HOSTNAME | os.hostname()
 * appInstance {string} instance name of the active application
 *                      defaults: NODE_APP_INSTANCE
 *
 * internal options:      you should only use these if you know what you are doing
 * parser {Parser}        default parser, can be replaced by super-users
 * module {Config|false}  parent module if available, else otherwise -- meant only for sub-modules
 * config {object},       initial config object, shouldn't be set unless you know what you are doing.
 *                        it has the potential to disrupt internal functionality -- meant only for sub-modules
 *
 * @param options
 * @constructor
 * @property config
 * @property parser
 * @property sources
 * @property whenReady
 */
function Config(options) {
  const {
    config = {},
    module = false,
    parser = new Parser,
  } = options || {};

  const sources = module.sources || [];

  let autoload = !module;

  /**
   *
   * @param object
   * @param source
   * @return {Config}
   */
  this.extend = (object, source='extend') => {
    sources.push({source, data: object});
    utils.extendDeep(config, object);
    autoload = false;
    return this;
  };

  /**
   *
   * @param filename
   * @return {Config}
   */
  this.parseFile = filename =>
    this.extend(parser.parse(filename), filename);

  /**
   *
   * @param options
   * @return {Config}
   */
  this.loadFiles = options =>
    this.collectConfigFiles(options).forEach(this.parseFile) || this;

  /**
   *
   * @param key
   * @return {Config}
   */
  this.subModule = key =>
    this.create({
      config: utils.makePath(config, key, {}),
      module: this,
      parser,
    });

  /**
   *
   * @param handler
   * @return {object}
   */
  const resolveConfig = handler => {
    if (autoload) {
      this.loadFiles(options);
    }
    resolveDeferred(config);
    return handler(config);
  };

  utils.attachPropertyValue(this, 'parser', parser);
  utils.attachPropertyValue(this, 'sources', sources);

  utils.attachLazyProperty(this, 'whenReady', () =>
    resolveConfig(resolveAsync).then(() => this));

  utils.attachLazyProperty(this, 'config', () =>
    resolveConfig(config => {
      this.extend = this.parseFile = this.loadFiles = () => {
        throw new Error('Configuration object is immutable and cannot be changed');
      };
      if (module) {
        // trigger main module resolveConfig
        return void module.config || config;
      }
      Object.freeze(sources);
      Object.preventExtensions(config);
      return Object.freeze(config);
    }));
}

/**
 * Create a new instance of `Config`
 * @param options
 * @returns {Config}
 */
Config.prototype.create = function(options) {
  return new Config(options);
};

/**
 * Get a configuration property value
 * This will return the specified property value, throwing an exception if the
 * configuration isn't defined. It is used to assure configurations are defined
 * before being used, and to prevent typos.
 * @param key
 * @return {*}
 */
Config.prototype.get = function(key) {
  if (typeof key !== 'string') {
    throw new Error('Illegal call to config.get with a non-string argument');
  }
  let value = this.config;
  const keys = key.split('.');
  for (let i = 0; i < keys.length; i++) {
    if (value && keys[i] in value) {
      value = value[keys[i]];
    }
    else {
      throw new Error(`Configuration property "${key}" is not defined`);
    }
  }
  return value;
};

/**
 * Test that a configuration property exists
 * @param key
 * @returns {boolean}
 */
Config.prototype.has = function(key) {
  let value = this.config;
  const keys = (key || '').split('.');
  for (let i = 0; i < keys.length; i++) {
    if (value && keys[i] in value) {
      value = value[keys[i]];
    }
    else return false;
  }
  return true;
};

/**
 * Create a list of allowed files in resolution order, according to current parser and provided options
 * Returns the result of `locateAllowedFiles` on these allowed files list
 * @param options
 * @returns {string[]}
 * @see utils.getOption
 */
Config.prototype.collectConfigFiles = function(options) {
  const {
    configDir = utils.getOption('NODE_CONFIG_DIR', './config'),
    environment = utils.getOption('NODE_CONFIG_ENV') || utils.getOption('NODE_ENV', 'development'),
    hostname = utils.getOption('HOST') || utils.getOption('HOSTNAME', OS.hostname()),
    appInstance = utils.getOption('NODE_APP_INSTANCE'),
  } = options || {};

  const allowedFiles = [];
  const { resolution } = this.parser;
  const envNames = environment.split(',');
  const baseNames = ['default'].concat(envNames);

  hostname && envNames.forEach(envName => baseNames.push(hostname, `${hostname}-${envName}`));
  envNames.forEach(envName => baseNames.push('local', `local-${envName}`));

  baseNames.forEach(baseName =>
    resolution.forEach(appInstance
      ? extName => allowedFiles.push(`${baseName}.${extName}`, `${baseName}-${appInstance}.${extName}`)
      : extName => allowedFiles.push(`${baseName}.${extName}`)
    ));

  return this.collectFiles(configDir, allowedFiles);
};

/**
 * Reads configuration directories and return filtered list of allowed files
 * @param configDir     a path to the configuration directory
 *                      can contain multiple paths separated by a column (:)
 * @param allowedFiles  an array of allowed filenames ordered by resolution order
 * @return {string[]}   absolute paths of matching allowed files, in resolution order
 */
Config.prototype.collectFiles = function(configDir, allowedFiles) {
  return configDir.split(Path.delimiter)
    .reduce((files, configDir) => {
      if (configDir) {
        if (configDir.indexOf('.') === 0) {
          configDir = Path.resolve(process.cwd(), configDir);
        }
        try { FileSystem.readdirSync(configDir).forEach(pushIfAllowed); }
        catch(e) { console.warn(`Failed to read from config directory ${configDir}`); }
      }
      return files;

      function pushIfAllowed(file) {
        const allowedIndex = allowedFiles.indexOf(file);
        if (allowedIndex > -1) {
          files.push([allowedIndex, Path.join(configDir, file)]);
        }
      }
    }, [])
    .sort((a, b) => a[0] - b[0])
    .map(file => file[1]);
};

/**
 * Iterates the configuration object to prepare and resolve asyncConfig marked instances
 * Should run after resolveDeferred so that deferred async functions will already by resolved into asyncConfig promises
 * @param config      mutable configuration object
 * @return {Promise}  resolves when all asyncConfigs promises have been resolved
 * @see utils.collect
 */
function resolveAsync(config) {
  const isAsync = val => val.async === asyncSymbol;
  const asyncConfigs = utils.reduceObject(config, utils.collect.bind(config, isAsync),[]);
  const asyncResolvers = asyncConfigs.map(([ promise, object, key ]) => promise.prepare(object, key));
  return Promise.all(asyncConfigs.map(([ promise ]) => promise))
    .then(() => asyncResolvers.forEach(resolver => resolver()));
}

/**
 * Iterates the configuration object to prepare and resolve DeferredConfig instances
 * @param config  mutable configuration object
 * @see utils.collect
 */
function resolveDeferred(config) {
  const isDeferred = val => val instanceof DeferredConfig;
  utils.reduceObject(config, utils.collect.bind(config, isDeferred),[])
    .map(([ deferred, object, key, config ]) => deferred.prepare(config, object, key))
    .forEach(resolver => resolver());
}

// /**
//  *
//  * @param environment
//  * @param appInstance
//  * @param strictMode
//  */
// function validateStrictness({ environment, appInstance }, strictMode) {
//   const sources = this.sources.some(({ source }) => Path.basename(source));
//
//   environment.split(',').forEach(envName => {
//     // Throw an exception if there's no explicit config file for envName
//     // development is special-cased because it's the default value
//     if (envName !== 'development' && !sources.some(source => source.includes(envName))) {
//       errorHandler(`environment value of '${envName}' did not match any deployment config file names`);
//     }
//     // Throw if envName matches' default' or 'local'
//     if (envName === 'default' || envName === 'local') {
//       errorHandler(`environment value of '${envName}' is ambiguous`);
//     }
//   });
//
//   // Throw an exception if there's no explict config file for NODE_APP_INSTANCE
//   if (appInstance && !sources.some(source => source.includes(appInstance))) {
//     errorHandler(`appInstance value of '${appInstance}' did not match any instance config file names`);
//   }
//
//   function errorHandler(message) {
//     message = `${strictMode ? 'FATAL' : 'WARNING'}: ${message}`;
//     if (strictMode) {
//       console.error(message);
//       throw new Error(message);
//     }
//     console.warn(message);
//   }
// }
