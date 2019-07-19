const { DeferredConfig } = require('./defer');

module.exports.isObject = isObject;
module.exports.isPromise = isPromise;

module.exports.getArgv = getArgv;
module.exports.getOption = getOption;

module.exports.collect = collect;
module.exports.makePath = makePath;
module.exports.extendDeep = extendDeep;
module.exports.reduceObject = reduceObject;

module.exports.attachLazyProperty = attachLazyProperty;
module.exports.attachPropertyValue = attachPropertyValue;
module.exports.attachPropertyGetter = attachPropertyGetter;
module.exports.enforceArrayProperty = enforceArrayProperty;

/**
 *
 * @param name
 * @returns {string}
 */
function getArgv(name) {
  const argv = process.argv.slice(2);
  const argName = `--${name}=`;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].indexOf(argName) === 0) {
      return argv[i].substr(argName.length);
    }
  }
}

/**
 *
 * @param name
 * @param defaultValue
 * @returns {*|boolean|string}
 */
function getOption(name, defaultValue) {
  return getArgv(name) || process.env[name] || defaultValue;
}

/**
 *
 * @param obj
 * @returns {boolean}
 */
function isObject(obj) {
  return typeof obj === 'object' && obj !== null && !Array.isArray(obj);
}

/**
 *
 * @param obj
 * @returns {boolean}
 */
function isPromise(obj) {
  return isObject(obj) && Object.prototype.toString.call(obj) === '[object Promise]';
  // return isObject(obj) && obj instanceof Promise;
}

/**
 *
 * @param object
 * @param key
 * @param defaultValue
 * @returns {*}
 */
function makePath(object, key, defaultValue) {
  return key.split('.').reduce((obj, key, index, { length }) =>
      (obj[key] || (obj[key] = obj[key] || index === length -1 ? defaultValue : {})),
    object);
}

/**
 *
 * @param object
 * @param reducer
 * @param initialValue
 * @returns {*}
 */
function reduceObject(object, reducer, initialValue) {
  return Object.entries(object).reduce((res, [ key, value ]) => reducer(res, value, key, object), initialValue);
}

/**
 *
 * @param object
 * @returns {*}
 */
function extendDeep(object) {
  const sources = Array.prototype.slice.call(arguments, 1);
  for (const source of sources) {
    for (const [ key, value ] of Object.entries(source)) {
      const isDeferred = object[key] instanceof DeferredConfig;
      if (value instanceof DeferredConfig && object.hasOwnProperty(key)) {
        value.original = isDeferred ? object[key].original : object[key];
      }
      if (isObject(object[key]) && isObject(value) && !(
        value instanceof Date || value instanceof RegExp || isPromise(value) || isDeferred)) {
        extendDeep(object[key], value);
      }
      else if (Object.getOwnPropertyDescriptor(source, key)){
        Object.defineProperty(object, key, Object.getOwnPropertyDescriptor(source, key));
      }
      else {
        object[key] = value;
      }
    }
  }
  return object;
}

/**
 *
 * @param match
 * @param coll
 * @param value
 * @param key
 * @param object
 * @return {*}
 */
function collect(match, coll, value, key, object) {
  if (match(value)) {
    coll.push([value, object, key, this]);
  }
  else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      match(value[i])
        ? coll.push([value[i], value, i, this])
        : collect.call(this, match, coll, value[i], i, value);
    }
  }
  else if (value && value.constructor === Object) {
    reduceObject(value, collect.bind(this, match), coll);
  }
  return coll;
}

/**
 *
 * @param object
 * @param key
 * @param value
 */
function attachPropertyValue(object, key, value) {
  Object.defineProperty(object, key, {value, configurable: false, writable: false});
}

/**
 *
 * @param object
 * @param key
 * @param get
 */
function attachPropertyGetter(object, key, get) {
  Object.defineProperty(object, key, {get});
}

/**
 *
 * @param object
 * @param key
 * @param handler
 */
function attachLazyProperty(object, key, handler) {
  Object.defineProperty(object, key, {
    configurable: true,
    get: () => {
      attachPropertyValue(object, key, handler(object, key));
      return object[key];
    },
  });
}

/**
 *
 * @param object
 * @param key
 * @param array
 * @param validator
 * @return {any}
 */
function enforceArrayProperty(object, key, array, validator) {
  Object.defineProperty(object, key, {
    get: () => array,
    set(value) {
      if (Array.isArray(value)) {
        if (validator && !value.every(validator)) {
          throw new Error(`Invalid items schema, ${key} failed validations`);
        }
        return array = value;
      }
      throw new Error(`Illegal set of ${key} with a non-array argument`);
    },
  });
}
