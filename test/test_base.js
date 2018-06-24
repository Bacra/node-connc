'use strict';

var expect = require('expect.js');
var connc = require('../');

describe('#connc', function()
{
	it('#base', function()
	{
		var Processor = connc(function()
		{
			return {
				isCheckPromise: false,
				isCheckSession: false,
			};
		});

		return new Processor().connect();
	});
});
