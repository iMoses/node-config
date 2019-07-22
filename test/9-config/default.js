module.exports = {
  circularReference: process.stdout,
  testObj: { foo: 'bar' },
  yell: function(input) {
    return input + '!';
  },
  aPromise: Promise.resolve('this is a promise result'),
  innerRaw: {
    innerCircularReference: process.stdout
  },
  nestedRaw: {
    nested: {
      test: process.stdout
    }
  }
};
