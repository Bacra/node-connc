'use strict';

var Promise = require('bluebird');
var debug = require('debug')('connc:enter');

// 仅仅是base Processor的两个用户入口方法
// 不能单独运行
exports.connect = connect;
exports.shell = shell;

function connect(req)
{
	var self = this;

	return Promise.resolve()
		.then(function()
		{
			return self.beforeSession(req);
		})
		.catch(function(err)
		{
			err.toStep = 'initError';
			throw err;
		})
		.then(function()
		{
			if (self.isCheckSession)
			{
				return Promise.resolve()
					.then(function()
					{
						return self.checkSession(req);
					})
					.then(function(uin)
					{
						if (uin !== undefined)
						{
							var err = new Error('out session');
							err.toStep = 'outSession';
							throw err;
						}

						// 清空data数据，避免req数据引入
						self.uin = uin;
						return self.afterSession(req);
					});
			}
		})
		.then(function()
		{
			return self.getRequestBody(req);
		})
		.then(function(body)
		{
			// 所有数据都必须放在body里
			// 不允许使用data或其他变量中的数据
			self.data = null;
			self.res = null;
			debug('set data and res null before process data');
			self.emit('reset:var', {vars: ['res', 'data']});

			return self._process(body);
		})
		.then(function(renderData)
		{
			self.res = null;
			debug('reset res before retrun');
			self.emit('reset:var', {vars: ['res']});

			return Promise.resolve()
				.then(function()
				{
					return self.chooseRenderType(renderData);
				})
				.then(function(type)
				{
					self.emit('render', {type: type, data: renderData, isError: false});
					return self.renderThisType(type, renderData);
				});
		})
		.catch(function(err)
		{
			if (err) err.hasRenderError = true;

			return Promise.resolve()
				.then(function()
				{
					return self.chooseErrorType(err);
				})
				.then(function(type)
				{
					self.emit('render', {type: type, error: err, isError: true});
					return self.renderThisError(type, err);
				});
		})
		.then(function()
		{
			// after任务异步执行，不需要return
			self._runAllAfterHanlders();
			return self.res;
		});
}

function shell(body, uin)
{
	this.session = session;
	this.data.uin = uin;

	return this._process(body)
		.then(function(mainData)
		{
			return self._runAllAfterHanlders()
				.then(function()
				{
					return mainData;
				});
		});
}
