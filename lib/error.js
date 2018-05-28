exports.throw = function(errCode, humanMessage)
{
	throw _decError(errCode, humanMessage);
};

exports.error = function(errCode, humanMessage)
{
	return _decError(errCode, humanMessage);
}


function _decError(errCode, humanMessage)
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
