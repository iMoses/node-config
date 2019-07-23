const utils = require('./utils');
const FileSystem = require('fs');

const lib = {
  validators: {},
  middleware: {},
};

module.exports = Parser;
module.exports.lib = lib;

/**
 *
 * @param options
 * @constructor
 * @property lib
 * @property validators
 * @property middleware
 * @property definition
 * @property resolution
 */
function Parser(options) {
  const {
    validators = [
      lib.validators.gitCrypt(!utils.getOption('CONFIG_SKIP_GITCRYPT')),
    ],
    middleware = [
      lib.middleware.configTemplate(lib.middleware.configTemplate.defaultHandlers),
    ],
    definition = [
      {ext: 'js', parser: lib.jsParser},
      {ext: 'ts', parser: lib.jsParser},
      {ext: 'json', parser: lib.jsonParser},
      {ext: 'json5', parser: lib.jsonParser},
      {ext: 'hjson', parser: lib.hjsonParser},
      {ext: 'toml', parser: lib.tomlParser},
      {ext: 'coffee', parser: lib.jsParser},
      {ext: 'iced', parser: lib.jsParser},
      {ext: 'yaml', parser: lib.yamlParser},
      {ext: 'yml', parser: lib.yamlParser},
      {ext: 'cson', parser: lib.csonParser},
      {ext: 'properties', parser: lib.propertiesParser},
      {ext: 'xml', parser: lib.xmlParser},
      // {ext: 'ini', parser: lib.iniParser},
      // {ext: 'd', parser: lib.dirParser},
    ],
  } = options || {};

  const isFunction = func => typeof func === 'function';
  const isDefinitionSchema = def => typeof def.ext === 'string' && typeof def.parser === 'function';

  utils.attachPropertyValue(this, 'lib', utils.deepFreeze(lib));
  utils.enforceArrayProperty(this, 'validators', validators, isFunction);
  utils.enforceArrayProperty(this, 'middleware', middleware,  isFunction);
  utils.enforceArrayProperty(this, 'definition', definition, isDefinitionSchema);
}

/**
 * @name resolution
 * @type {string[]}
 */
Object.defineProperty(Parser.prototype, 'resolution', {
  get() { return this.definition.map(def => def.ext); },
  set(value) {
    if (!Array.isArray(value)) {
      throw new Error(`Illegal set of resolution with a non-array argument`);
    }
    const { definition, resolution } = this;
    const unknown = value.filter(ext => !resolution.includes(ext));
    if (unknown.length) {
      throw new Error(`Invalid resolution value, unknown definitions ${unknown}`);
    }
    this.definition = value.map(ext => definition[resolution.indexOf(ext)]);
  }
});

Parser.prototype.set = function(ext, parser) {
  const index = this.resolution.indexOf(ext);
  if (index === -1) this.definition.push({ext, parser});
  else this.definition[index].parser = parser;
  return this;
};

Parser.prototype.unset = function(ext) {
  const index = this.resolution.indexOf(ext);
  if (index !== -1) {
    this.definition.splice(index, 1);
    return true;
  }
  return false;
};

Parser.prototype.reset = function() {
  this.validators = [];
  this.middleware = [];
  this.definition = [];
  return this;
};

/**
 *
 * @param filename
 * @return {*}
 */
Parser.prototype.parse = function(filename) {
  const ext = filename.substr(filename.lastIndexOf('.') +1);
  const def = this.definition.find(d => d.ext.includes(ext));
  if (def) return this.middleware.reduce((content, handler) =>
    handler.call(this, filename, content), def.parser.call(this, filename));
  throw Error(`No parser found for ${filename}`);
};

/**
 *
 * @param filename
 * @return {*}
 */
Parser.prototype.readFile = function(filename) {
  let content;
  try {
    content = FileSystem
      .readFileSync(filename, 'utf-8')
      .replace(/^\uFEFF/, '');
  }
  catch(e) {
    throw new Error(`Config file ${filename} cannot be read`);
  }
  const validate = handler =>
    handler.call(this, filename, content);
  return this.validators.every(validate) ? content : null;
};

/**
 * Default Parsers
 */

lib.jsParser = function(filename) {
  const content = require(filename);
  return content.__esModule && content.default ? content.default : content;
};

lib.jsonParser = function(filename) {
  const content = this.readFile(filename);
  return content ? require('json5').parse(content) : null;
};

lib.hjsonParser = function(filename) {
  const content = this.readFile(filename);
  return content ? require('hjson').parse(content) : null;
};

lib.tomlParser = function(filename) {
  const content = this.readFile(filename);
  return content ? require('toml').parse(content) : null;
};

lib.csonParser = function(filename) {
  const content = this.readFile(filename);
  return content ? require('cson').parse(content) : null;
};

lib.iniParser = function(filename) {
  const content = this.readFile(filename);
  return content ? require('ini').parse(content) : null;
};

lib.propertiesParser = function(filename) {
  const content = this.readFile(filename);
  const options = {namespaces: true, variables: true, sections: true};
  return content ? require('properties').parse(content, options) : null;
};

lib.yamlParser = function(filename) {
  const content = this.readFile(filename);
  return content ? require('js-yaml').load(content) : null;
};

lib.xmlParser = function(filename) {
  const x2js = new (require('x2js'));
  let content = this.readFile(filename);
  if (content) {
    content = x2js.xml2js(content);
    const rootKeys = Object.keys(content);
    return rootKeys.length === 1 ? content[rootKeys[0]] : content;
  }
  return null;
};

lib.dirParser = function(dirname) {
  console.log(`readdir ${dirname}`);
  return null;
};

/**
 * Default Processors
 */

lib.validators.gitCrypt = strict => function(filename, content) {
  if (/^.GITCRYPT/.test(content)) {
    if (strict) throw new Error(`Cannot read git-crypt file ${filename}`);
    console.warn(`WARNING: skipping git-crypt file ${filename}`);
    return false;
  }
  return true;
};

lib.middleware.configTemplate = handlers => function(filename, content) {
  if (content) {
    const commands = Object.keys(handlers).join('|');
    const regExp = new RegExp(`^(${commands})::`, 'i');
    utils.collect(content, val => regExp.test(val))
      .forEach(([ origin, object, key ]) => {
        let { commands, options, value } = destructValue(origin);
        for (let command of commands) {
          value = handlers[command].call(this, value, options);
        }
        const enumerable = !options.includes('secret');
        Object.defineProperty(object, key, {value, enumerable});
      });
  }
  return content;

  function destructValue(value) {
    const lower = s => s.toLowerCase();
    let commands = value.split('::');
    value = commands.pop();
    let options = value.split('|');
    value = options.shift();
    options = options.map(lower);
    commands = commands.map(lower).reverse();
    return {commands, options, value};
  }
};

lib.middleware.configTemplate.defaultHandlers = {
  env(value, options) {
    if (value in process.env === false) {
      throw new Error(`Missing "${value}" environment variable`);
    }
    return options.includes('json')
      ? JSON.parse(process.env[value])
      : process.env[value];
  },
  file(value, options) {
    try {
      return options.includes('string')
        ? this.readFile(value)
        : this.parse(value);
    }
    catch(e) {
      throw new Error(`Failed to read file "${value}"`);
    }
  },
};
