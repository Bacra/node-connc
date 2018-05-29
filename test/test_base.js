var expect = require('expect.js');
var connc = require('../');

describe('#base', function()
{
	it('#base', function()
	{
		var Processor = connc(function(parent)
		{
			return {
				isCheckPromise: false,
				isCheckSession: false,
			};
		});

		return Processor.connect();
	});
});
