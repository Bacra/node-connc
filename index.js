'use strict';

var base = require('./lib/base');
var example = require('./lib/example');
var enter = require('./lib/func/enter');
var errorUtils = require('./lib/func/error');

exports = module.exports = example.extend.bind(example);
exports.Base = base.Base;

// 入口方法，可以忽略Processor实例，进行使用者两个方法调用
exports.connect = enter.connect;
exports.shell = enter.shell;

// 工具方法
exports.throw = errorUtils.throw;
exports.error = errorUtils.error;
