console.warn(`WARNING: requiring from config/async is deprecated and will be removed in the next versions.\n` +
  `Use require('config').asyncConfig instead.`);
module.exports = require('./lib/async');
