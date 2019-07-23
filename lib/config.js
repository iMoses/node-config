const { asyncConfig, asyncSymbol } = require('./async');
const { deferConfig, DeferredConfig } = require('./defer');
const Parser = require('./parser');
const utils = require('./utils');
const Path = require('path');
const OS = require('os');

module.exports = new Config(null, getDefaultInstanceOptions());

Config.prototype.asyncConfig = asyncConfig;
Config.prototype.deferConfig = deferConfig;

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
 * @param moduleName
 * @constructor
 * @property config
 * @property parser
 * @property options
 * @property sources
 * @property whenReady
 */
function Config(moduleName, options) {
  const {
    config = {},
    freeze = true,
    module = false,
    parser = new Parser,
  } = options || (options = {});

  const sources = module.sources || [];

  let autoload = !module;

  /**
   * Extends the configuration object
   * This mutation method is made to mutate the config object
   * internally prior to initial access and freezing the object
   * @param object
   * @param source
   * @return {Config}
   */
  this.extend = (object, source='config.extend') => {
    if (object) {
      if (moduleName) {
        const data = {}, module = moduleName;
        utils.makePath(data, module, utils.cloneDeep(object));
        sources.push({module, source, data});
      }
      else {
        sources.push({source, data: utils.cloneDeep(object)});
      }
      utils.extendDeep(config, utils.cloneDeep(object));
    }
    autoload = false;
    return this;
  };

  /**
   * Parses a file and extends configuration object with the parsed content
   * This mutation method is made to mutate the config object
   * internally prior to initial access and freezing the object
   * @param filename
   * @return {Config}
   */
  this.parseFile = filename =>
    this.extend(parser.parse(filename), filename);

  /**
   * Load and parse files according to options
   * This mutation method is made to mutate the config object
   * internally prior to initial access and freezing the object
   * @param options
   * @return {Config}
   */
  this.loadFiles = options =>
    this.collectConfigFiles(options).forEach(this.parseFile) || this;

  /**
   * Creates a sub-configuration module which is tightly connected to its
   * main module, sharing a partial of its configuration object and sources
   * @param moduleName
   * @return {Config}
   */
  this.subModule = moduleName =>
    new Config(moduleName, {
      config: utils.makePath(config, moduleName, {}),
      module: this,
      freeze,
      parser,
    });

  /**
   * Handles resolving whenReady and config,
   * always resolving deferred functions before executing `handler`
   *
   * In case of an autoload, reproduces the same default actions
   * previous versions maintained for backwards computability
   * @param handler
   * @return {object}
   */
  const resolveConfig = handler => {
    // in case of an autoload we reproduce the same
    // default actions previous versions maintained
    if (autoload) {
      this.loadFiles(options);
      const extendWith = (v, s) => v && this.extend(v, s);
      extendWith(process.env.NODE_CONFIG, '$NODE_CONFIG');
      extendWith(utils.getArgv('NODE_CONFIG'), '--NODE_CONFIG');
      validateStrictness(sources, options);
    }
    resolveDeferred(config);
    return handler(config);
  };

  // provides access to the initialization options for debugging purposes
  utils.attachPropertyValue(this, 'options', Object.freeze(options));

  // provides a list of sources which were merged into config
  utils.attachPropertyValue(this, 'sources', sources);

  // provides access to the configuration parser
  utils.attachPropertyValue(this, 'parser', parser);

  // lazily loads into a promise which waits
  // until all asyncConfig values has been resolved
  utils.attachLazyProperty(this, 'whenReady', () =>
    resolveConfig(resolveAsync).then(() => this));

  // lazily loads to provides access to the configuration object
  // on first access we freeze it and mutation methods are locked
  utils.attachLazyProperty(this, 'config', () =>
    resolveConfig(config => {
      if (freeze) {
        this.extend = this.parseFile = this.loadFiles = () => {
          throw new Error('Configuration object is immutable and cannot be changed');
        };
      }
      if (module) {
        // trigger main module resolveConfig
        return void module.config || config;
      }
      if (freeze) {
        utils.deepFreeze(config);
        utils.deepFreeze(sources);
      }
      return config;
    }));
}

/**
 * Create a new instance of `Config`
 * @param options
 * @returns {Config}
 */
Config.prototype.create = function(options) {
  return new Config(null, options);
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
  const { configDir, environment = 'development', hostname = OS.hostname(), appInstance } = options || {};

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

  return utils.collectFiles(configDir, allowedFiles);
};

/**
 * Returns options for the default config instance built from env-vars and cli-args
 *
 * We clear keys of undefined values make sure destructuring defaults
 * will be applied, which isn't the case as long as the key exists
 * @see utils.getOption
 * @return {*}
 */
function getDefaultInstanceOptions() {
  return clearUndefinedKeys({
    configDir: utils.getOption('NODE_CONFIG_DIR', './config'),
    environment: utils.getOption('NODE_CONFIG_ENV') || utils.getOption('NODE_ENV'),
    hostname: utils.getOption('HOST') || utils.getOption('HOSTNAME'),
    appInstance: utils.getOption('NODE_APP_INSTANCE'),
    strict: Boolean(utils.getOption('NODE_CONFIG_STRICT_MODE')),
    freeze: !utils.getOption('ALLOW_CONFIG_MUTATIONS'),
  });
  function clearUndefinedKeys(object) {
    for (const [ key, value ] of Object.entries(object)) {
      if (typeof value === 'undefined') delete object[key];
    }
    return object;
  }
}

/**
 * Iterates the configuration object to prepare and resolve asyncConfig marked instances
 * Should run after resolveDeferred so that deferred async functions will already by resolved into asyncConfig promises
 * @param config      mutable configuration object
 * @return {Promise}  resolves when all asyncConfigs promises have been resolved
 * @see utils.collect
 */
function resolveAsync(config) {
  const asyncConfigs = utils.collect(config, val => val.async === asyncSymbol);
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
  utils.collect(config, val => val instanceof DeferredConfig)
    .map(([ deferred, object, key, config ]) => deferred.prepare(config, object, key))
    .forEach(resolver => resolver());
}

/**
 * Validate default options validness in case of a configuration autoload
 * @param sources
 * @param options
 */
function validateStrictness(sources, options) {
  if (sources.length === 0 && !utils.getOption('SUPPRESS_NO_CONFIG_WARNING')) {
    throw new Error(`WARNING: No configurations found in configuration directory "${options.configDir}"`);
  }

  const { strict, environment = 'development', appInstance } = options;
  sources = sources.map(({ source }) => Path.basename(source));

  environment.split(',').forEach(envName => {
    // Throw if envName matches' default' or 'local'
    if (envName === 'default' || envName === 'local') {
      errorHandler(`environment value of "${envName}" is ambiguous`);
    }
    // Throw an exception if there's no explicit config file for envName
    // development is special-cased because it's the default value
    if (envName !== 'development' && !sources.some(source => source.includes(envName))) {
      errorHandler(`environment value of "${envName}" did not match any deployment config file names`);
    }
  });

  // Throw an exception if there's no explict config file for NODE_APP_INSTANCE
  if (appInstance && !sources.some(source => source.includes(appInstance))) {
    errorHandler(`appInstance value of "${appInstance}" did not match any instance config file names`);
  }

  function errorHandler(message) {
    message = `${strict ? 'FATAL' : 'WARNING'}: ${message}`;
    if (strict) throw new Error(`FATAL: ${message}`);
    console.warn(`WARNING: ${message}`);
  }
}
