console.warn(`WARNING: requiring from config/defer is deprecated and will be removed in the next versions.\n` +
  `Use require('config').deferConfig instead.`);
module.exports = require('./lib/defer');
