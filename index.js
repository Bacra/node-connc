var base = require('./lib/base');
var example = require('./lib/example');

exports = module.exports = example.extend.bind(example);
exports.base = base.base;
