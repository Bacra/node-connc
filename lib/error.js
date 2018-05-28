exports.throw = function(errCode, type, humanMessage)
{
	throw _decError(errCode, type, humanMessage);
};

exports.error = function(errCode, type, humanMessage)
{
	return _decError(errCode, type, humanMessage);
}


function _decError(errCode, type, humanMessage)
{
	if (errCode instanceof Error)
	{
		var err = errCode;
	}
	else
	{
		// var err = new ProxyError(errCode);
		var err = new Error('connc');
		err.code = errCode;
		Error.captureStackTrace(err, arguments.callee.caller);
	}

	Object.defineProperties(err,
	{
		type:
		{
			value: type || 'SYS',
			writable: true,
			enumerable: false,
			configurable: true,
		},
		humanMessage:
		{
			value: humanMessage,
			writable: true,
			enumerable: false,
			configurable: true,
		},
		errCode:
		{
			value: err.code,
			writable: true,
			enumerable: false,
			configurable: true,
		}
	});

	return err;
}
