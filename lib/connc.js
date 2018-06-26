'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var debug = require('debug')('connc');
var EventEmitter = require('events').EventEmitter;
var errorUtils = require('./func/error');

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

	self._after_list = [];
	EventEmitter.call(self);

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
	after: function(name, handler)
	{
		if (typeof name == 'function')
		{
			handler = name;
			name = handler.name;
		}

		this._after_list.push({name: name, handler: handler});
	},

	super_: function(parent, protoName, args)
	{
		var handler = (typeof parent == 'function' ? parent.prototype : parent)[protoName];

		if (args && typeof args.length == 'number')
			return handler.apply(this, args);
		else
			return handler.call(this);
	},


	beforeSession: function(){},
	checkSession: function()
	{
		this.throw('OUT_SESSION');
	},
	afterSession: function(){},
	getRequestBody: function(req)
	{
		return req && req.body;
	},
	checkRequestBody: function(body)
	{
		// 检查里面是否有req，req使用stringify的时候，会影响circular报错
		JSON.stringify(body);
		return body;
	},
	checkPermission: function()
	{
		// 强制重写次方法
		this.throw('USER_FORBID');
	},
	requestAllData: function(body){return body},
	renderData: function(data){return data},

	chooseRenderType: function(){},
	renderThisType: function(){},
	chooseErrorType: function(){},
	renderThisError: function(){},

	_process: function(body)
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
	},

	_runAllAfterHanlders: function()
	{
		var self = this;
		var promise = self._runAfterHanlders();
		self.emit('after:start', {promise: promise});

		return promise.then(function(info)
			{
				self.emit('after:end', {data: info, promise: promise});
			});
	},

	_runAfterHanlders: function()
	{
		var self = this;
		var afterList = self._after_list;
		self._after_list = [];

		if (!afterList.length) return Promise.resolve({total: 0, fail: 0});

		var fail = 0;

		return Promise.map(afterList, function(item)
		{
			self.emit('after:run', {name: item.name, handler: item.handler});

			var promise = Promise.resolve()
				.then(function()
				{
					return item.handler.call(self);
				});

			return promise.then(function(data)
				{
					self.emit('after:result',
						{
							name: item.name,
							handler: item.handler,
							promise: promise,
							data: data,
							isError: false
						});
				},
				function(err)
				{
					fail++;
					self.emit('after:result',
						{
							name: item.name,
							handler: item.handler,
							promise: promise,
							error: err,
							isError: true
						});
				})
				.catch(function(err)
				{
					debug('runafter emit err:%o', err);
				});
		},
		{
			concurrency: 5
		})
		.then(function()
		{
			return self._runAfterHanlders()
				.then(function(info)
				{
					return {
						total	: afterList.length + info.total,
						fail	: fail+info.fail
					};
				});
		});
	}
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
	connect:
	{
		value: function connect(req)
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
					return self._runAllAfterHanlders()
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