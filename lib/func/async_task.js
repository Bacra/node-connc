'use strict';

var _ = require('lodash');
var debug = require('debug')('connc:async_task');
var EventEmitter = require('events').EventEmitter;
var Promise = require('bluebird');

module.exports = AsyncTask;

function AsyncTask()
{
	this.queue = [];
	EventEmitter.call(this);
}

require('util').inherits(AsyncTask, EventEmitter);

_.extend(AsyncTask.prototype,
{
	add: function(name, handler)
	{
		if (typeof name == 'function')
		{
			handler = name;
			name = handler.name;
		}

		this.queue.push({name: name, handler: handler});
	},
	run: function()
	{
		var self = this;
		var promise = self._run();
		self.emit('start', {promise: promise});

		return promise.then(function(info)
			{
				self.emit('end', {data: info, promise: promise});
			});
	},

	_run: function()
	{
		var self = this;
		var queue = self.queue;
		self.queue = [];

		if (!queue.length) return Promise.resolve({total: 0, fail: 0});

		var fail = 0;

		return Promise.map(queue, function(item)
		{
			self.emit('run', {name: item.name, handler: item.handler});

			var promise = Promise.resolve()
				.then(function()
				{
					return item.handler.call(self);
				});

			return promise.then(function(data)
				{
					self.emit('result',
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
					self.emit('result',
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
					debug('async task emit err:%o', err);
				});
		},
		{
			concurrency: 5
		})
		.then(function()
		{
			return self._run()
				.then(function(info)
				{
					return {
						total	: queue.length + info.total,
						fail	: fail+info.fail
					};
				});
		});
	}
});
