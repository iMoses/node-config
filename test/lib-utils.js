const requireUncached = require('./_utils/requireUncached');
const utils = require('../lib/utils');

const vows = require('vows');
const assert = require('assert');

require('coffeescript').register();

const argvOrg = process.argv;

vows.describe('Library utilities')
  .addBatch({
    'Library initialization': {
      topic() {
        process.argv.push('--NODE_APP_INSTANCE=3');
        return requireUncached(__dirname + '/../lib/config')
          .loadFiles({
            configDir: __dirname + '/config',
            environment: 'test',
          });
      },
      'Library is available': function(config) {
        assert.isObject(config);
        console.log(config.parser.lib);
      }
    }
  })
  .addBatch({
    'utils.isObject()': {
      'The function exists': function() {
        assert.isFunction(utils.isObject);
      },
      'Correctly identifies objects': function() {
        assert.isTrue(utils.isObject({A:"b"}));
      },
      'Correctly excludes non-objects': function() {
        assert.isFalse(utils.isObject("some string"));
        assert.isFalse(utils.isObject(45));
        assert.isFalse(utils.isObject([2, 3]));
        assert.isFalse(utils.isObject(["a", "b"]));
        assert.isFalse(utils.isObject(null));
        assert.isFalse(utils.isObject(undefined));
      }
    },

    'utils.getOption()': {
      topic: function() {
        // Set process.argv example object
        var testArgv = [
          process.argv[0],
          process.argv[1],
          '--NODE_ENV=staging'
        ];
        process.argv = testArgv;
        return utils.getOption('NODE_ENV');
      },
      'The function exists': function() {
        assert.isFunction(utils.getOption);
      },
      'NODE_ENV should be staging': function(nodeEnv) {
        assert.equal(nodeEnv, 'staging');
      },
      'Returns false if the argument did not match': function() {
        assert.isFalse(utils.getOption('NODE_CONFIG_DIR', false));
      },
      'Returns the argument (alternative syntax)': function() {
        process.argv.push('--NODE_CONFIG_DIR=/etc/nodeConfig');
        assert.equal(utils.getOption('NODE_CONFIG_DIR'), '/etc/nodeConfig');
      },
      'Returns always the first matching': function() {
        process.argv.push('--NODE_ENV=test');
        assert.equal(utils.getOption('NODE_ENV'), 'staging');
      },
      'Revert original process aruments': function() {
        assert.notEqual(process.argv, argvOrg);
        process.argv = argvOrg;
        assert.equal(process.argv, argvOrg);
      }
    },
    
    'utils.extendDeep()': {
      'The function exists': function() {
        assert.isFunction(utils.extendDeep);
      },
      'Performs normal extend': function() {
        var orig = {elem1:"val1", elem2:"val2"};
        var extWith = {elem3:"val3"};
        var shouldBe = {elem1:"val1", elem2:"val2", elem3:"val3"};
        assert.deepEqual(utils.extendDeep(orig, extWith), shouldBe);
      },
      'Replaces non-objects': function() {
        var orig = {elem1:"val1", elem2:["val2","val3"],elem3:{sub1:"val4"}};
        var extWith = {elem1:1,elem2:["val4"],elem3:"val3"};
        var shouldBe = {elem1:1, elem2:["val4"],elem3:"val3"};
        assert.deepEqual(utils.extendDeep(orig, extWith), shouldBe);
      },
      'Merges objects': function() {
        var orig = {e1:"val1", elem2:{sub1:"val4",sub2:"val5"}};
        var extWith = {elem2:{sub2:"val6",sub3:"val7"}};
        var shouldBe = {e1:"val1", elem2:{sub1:"val4",sub2:"val6",sub3:"val7"}};
        assert.deepEqual(utils.extendDeep(orig, extWith), shouldBe);
      },
      'Merges dates': function() {
        var orig = {e1:"val1", elem2:{sub1:"val4",sub2:new Date(2015, 0, 1)}};
        var extWith = {elem2:{sub2:new Date(2015, 0, 2),sub3:"val7"}};
        var shouldBe = {e1:"val1", elem2:{sub1:"val4",sub2:new Date(2015, 0, 2),sub3:"val7"}};
        assert.deepEqual(utils.extendDeep(orig, extWith), shouldBe);
      },
      'Creates partial objects when mixing objects and non-objects': function () {
        var orig = {elem1: {sub1: 5}};
        var ext1 = {elem1: {sub2: 7}};
        var ext2 = {elem1: 7};
        var ext3 = {elem1: {sub3: 13}};
        // When we get to ext2, the 7 clears all memories of sub1 and sub3. Then, when
        // we merge with ext3, the 7 is replaced by the new object.
        var expected = {elem1: {sub3: 13}};
        assert.deepEqual(utils.extendDeep(orig, ext1, ext2, ext3), expected);
      },
      'Correctly types new objects and arrays': function() {
        var orig = {e1:"val1", e3:["val5"]};
        var extWith = {e2:{elem1:"val1"}, e3:["val6","val7"]};
        var shouldBe = {e1:"val1", e2:{elem1:"val1"}, e3:["val6","val7"]};
        var ext = utils.extendDeep({}, orig, extWith);
        assert.isObject(ext.e2);
        assert.isArray(ext.e3);
        assert.deepEqual(ext, shouldBe);
      },
      'Keeps non-merged objects intact': function() {
        var orig     = {e1:"val1", elem2:{sub1:"val4",sub2:"val5"}};
        var shouldBe = {e1:"val1", elem2:{sub1:"val4",sub2:"val5"}};
        var extWith = {elem3:{sub2:"val6",sub3:"val7"}};
        utils.extendDeep({}, orig, extWith);
        assert.deepEqual(orig, shouldBe);
      },
      'Keeps prototype methods intact': function() {
        var orig = Object.create({a: 1, has(){}});
        var result = utils.extendDeep({orig}, {});
        assert.isFunction(result.orig.has);
        // only works on nested objects
        // result = utils.extendDeep({}, orig, {});
        // assert.isFunction(result.has);
      }
    },
  })
  .export(module);
