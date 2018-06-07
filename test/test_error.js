'use strict';

var expect = require('expect.js');
var errorUtils = require('../lib/error');

describe('#err', function()
{
	it('#new', function()
	{
		var err = errorUtils.error();
		expect(err.message.substr(0,6)).to.be('connc,');
		// 第一行调用栈是当前文件
		expect(err.stack.split(/\n/)[1].trim()).to.contain(__filename);
	});
});
