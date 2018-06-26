'use strict';

var example = require('./lib/example');
var errorUtils = require('./lib/func/error');

exports = module.exports = example.extend.bind(example);

// 工具方法
exports.throw = errorUtils.throw;
exports.error = errorUtils.error;
