const asyncSymbol = Symbol('asyncSymbol');
const { deferConfig } = require('./defer');

module.exports.asyncSymbol = asyncSymbol;
module.exports.asyncConfig = asyncConfig;

/**
 * @param promise         the promise will determine a property's value once resolved
 *                        can also be a function to defer which resolves to a promise
 * @returns {Promise}     a marked promise to be resolve later using `resolveAsyncConfigs`
 */
function asyncConfig(promise) {
  if (typeof promise === 'function') {
    return deferConfig((config, original) =>
      createDelayedPromise(promise, config, original));
  }
  promise.async = asyncSymbol;
  promise.prepare = (object, key) => {
    if (promise.release) promise.release();
    return () => promise.then(value =>
      Object.defineProperty(object, key, {value}));
  };
  return promise;
}

/**
 *
 * @param asyncFunc
 * @param config
 * @param original
 * @return {Promise}
 */
function createDelayedPromise(asyncFunc, config, original) {
  let release;
  const registerRelease = resolve => release = resolve;
  const callFunc = () => asyncFunc.call(config, config, original);
  const promise = asyncConfig(new Promise(registerRelease).then(callFunc));
  promise.release = release;
  return promise;
}
