var errorUtils = require('../lib/error');

describe('#err', function()
{
	it('#throw', function()
	{
		console.log(errorUtils.error().stack);
	});
});
