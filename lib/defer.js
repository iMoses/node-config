module.exports.DeferredConfig = DeferredConfig;
module.exports.deferConfig = deferConfig;

/**
 *
 * @param func
 * @return {DeferredConfig}
 */
function deferConfig(func) {
  return Object.create(DeferredConfig.prototype, {handler: {value: func}});
}

function DeferredConfig() {}

/**
 *
 * @param config
 * @param object
 * @param key
 * @return {function(): *}
 */
DeferredConfig.prototype.prepare = function(config, object, key) {
  const resolver = createResolver(object, key, this.handler, config, object[key].original);
  Object.defineProperty(object, key, {get: resolver});
  return resolver;
};

/**
 *
 * @param object
 * @param key
 * @param func
 * @param config
 * @param original
 * @return {function(): *}
 */
function createResolver(object, key, func, config, original) {
  return () => {
    const value = func.call(config, config, original);
    Object.defineProperty(object, key, {value});
    return value;
  };
}
