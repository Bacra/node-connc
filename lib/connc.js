'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var debug = require('debug')('connc');
var EventEmitter = require('events').EventEmitter;
var errorUtils = require('./func/error');
var AsyncTask = require('./func/async_task');

module.exports = Processor;

function Processor()
{
	var self = this;
	self.data = {};
	self._uin = null;
	self.res = {};

	// 每次重新赋值
	// 避免两个方法被重写
	// self.connect = enter.connect;
	// self.shell = enter.shell;

	EventEmitter.call(self);
	self._after_task = new AsyncTask;
	self._after_task.emit = self.emit.bind(self);

	// 如果可以，禁止修改非data和session的值
	// 将用户可以修改的数据收容，方便管理
	Object.seal && Object.seal(self);
}

require('util').inherits(Processor, EventEmitter);

_.extend(Processor.prototype,
{
	isCheckSession: true,
	isCheckPromise: true,
	throw: errorUtils.throw,
	error: errorUtils.error,

	setCookie: function(name, val, options)
	{
		this.cookie[name] = {value: val, options: options};
	},
	after: function()
	{
		return this._after_task.add.apply(this, arguments);
	},

	super_: function(parent, protoName, args)
	{
		var handler = (typeof parent == 'function' ? parent.prototype : parent)[protoName];

		if (args && typeof args.length == 'number')
			return handler.apply(this, args);
		else
			return handler.call(this);
	},


	beforeSession: function(req)
	{
		debug('beforeSession:%s', req);
	},
	checkSession: function(req)
	{
		debug('checkSession:%s', req);
		this.throw('OUT_SESSION');
	},
	afterSession: function(req)
	{
		debug('afterSession:%s', req);
	},
	receiveRequestBody: function(req)
	{
		return req && req.body;
	},
	getRequestBody: function(body)
	{
		return body;
	},
	checkRequestBody: function(body)
	{
		// 检查里面是否有req，req使用stringify的时候，会影响circular报错
		JSON.stringify(body);
		return body;
	},
	checkPermission: function(body)
	{
		debug('checkPromise:%o', body);
		// 强制重写次方法
		this.throw('USER_FORBID');
	},
	requestAllData: function(body){return body},
	renderData: function(data){return data},

	chooseRenderType: function(){},
	renderThisType: function(){},
	chooseErrorType: function(){},
	renderThisError: function(){},
});


Object.defineProperties(Processor.prototype,
{
	uin:
	{
		get: function()
		{
			return this._uin;
		},
		set: function(val)
		{
			this._uin = val;
			this.emit('change:uin', val);
		},
	},
	_sessionMgr:
	{
		value: function _sessionMgr(req)
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
				});
		},
	},
	_process:
	{
		value: function _process(body)
		{
			var self = this;

			return Promise.resolve()
				.then(function()
				{
					return self.checkRequestBody(body);
				})
				.catch(function(err)
				{
					err.toStep = 'invalidInput';
					throw err;
				})
				.then(function(body)
				{
					var checkPromise = Promise.resolve();

					if (self.isCheckPromise)
					{
						checkPromise = checkPromise.then(function()
							{
								return self.checkPermission(body);
							})
							.catch(function(err)
							{
								err.toStep = 'userForbid'
								throw err;
							});
					}

					return checkPromise.then(function()
					{
						return self.requestAllData(body);
					})
					.then(function(data)
					{
						return self.renderData(data);
					});
				});
		}
	},
	connect:
	{
		value: function connect(req)
		{
			var self = this;

			return self._sessionMgr(req)
				.then(function()
				{
					return self.receiveRequestBody(req);
				})
				.then(function(body)
				{
					return self.getRequestBody(body);
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
					self._after_task.run();
					return self.res;
				});
		}

	},
	shell:
	{
		value: function shell(body, uin)
		{
			var self = this;
			self.data.uin = uin;

			return self._process(body)
				.then(function(mainData)
				{
					return self._after_task.run()
						.then(function()
						{
							return mainData;
						});
				});
		}
	},

	body: resPrototype('body'),
	status: resPrototype('status'),
	type: resPrototype('type'),
	header: resPrototype4object('header'),
	cookie: resPrototype4object('cookie'),
});


function resPrototype(name)
{
	return {
		get: function()
		{
			return this.res && this.res[name];
		},
		set: function(val)
		{
			var res = this.res || (this.res = {});
			res[name] = val;
		}
	};
}

function resPrototype4object(name)
{
	return {
		get: function()
		{
			var res = this.res || (this.res = {});
			return res[name] || (res[name] = {});
		},
		set: function(val)
		{
			var res = this.res || (this.res = {});
			res[name] = val;
		}
	};
}


Processor.extend = ClassExtend;
function ClassExtend(protoProps)
{
	var parent = this;
	var Constructor = parent;
	var child = function()
	{
		return Constructor.apply(this, arguments);
	};

	if (typeof protoProps == 'function')
	{
		protoProps = protoProps(parent, child);
	}

	var Surrogate = function()
	{
		_.extend(this, protoProps);
		this.constructor = child;
	}
	Surrogate.prototype = parent.prototype;
	child.prototype = new Surrogate;
	child.extend = parent.extend;
	child.super = parent;

	return child;
}
