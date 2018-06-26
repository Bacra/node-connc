'use strict';

var fs = require('fs');
var path = require('path');
var ckit = require('ckit');
var debug = require('debug')('connc:example');
var Promise = require('bluebird');
var mkdirp = Promise.promisify(require('mkdirp'));
var formidable = require('formidable');
var contentDisposition = require('content-disposition');

var formbody = require('body/form');
var jsonbody = require('body/json');
var textbody = require('body');

module.exports = require('./connc').extend(function()
{
	return {
		renderType: 'json',
		bodyType: 'json',
		uploadDir: '/tmp/connc_cache/upload/',

		// 使用ckit进行输入数据检查
		message: ckit.message({}),

		receiveRequestBody: function(req)
		{
			var self = this;
			if (!req || req.method == 'GET') return;

			var parser;
			switch(self.bodyType)
			{
				case 'json':
					parser = jsonbody;
					break;

				case 'url':
				case 'form':
					parser = formbody;
					break;

				case 'text':
					parser = textbody;
					break;

				case 'file':
					var uploadDir = self.uploadDir;

					return mkdirp(uploadDir)
						.then(function()
						{
							return new Promise(function(resolve, reject)
							{
								var form = new formidable.IncomingForm();
								form.encoding = 'utf-8';
								form.uploadDir = uploadDir;
								form.parse(req, function(err, fields, files)
								{
									if (err) return reject(err);
									resolve({fields: fields, files: files});
								});
							});
						});

				default:
					debug('undefined bodyType:%s', self.bodyType);
			}

			if (parser)
			{
				return new Promise(function(resolve, reject)
				{
					parser(req, function(err, data)
					{
						err ? reject(err) : resolve(data);
					});
				});
			}
		},

		checkRequestBody: function(body)
		{
			return this.message.check(body);
		},


		// 模版规范
		containerTpl: function(body, renderData)
		{
			debug('containerTpl renderData:%o', renderData);
			return body;
		},
		tpl: function(renderData)
		{
			debug('tpl renderData:%o', renderData);
			this.throw('NO_RENDER_DEFINED');
		},


		// 规范res返回
		chooseRenderType: function()
		{
			return this.renderType;
		},
		renderThisType: function(type, renderData)
		{
			switch(type)
			{
				case 'json':
					return this.json(renderData);
				case 'redirect':
					return this.redirect(renderData);
				case 'download':
					return this.download(renderData);
				case 'html':
				case 'tpl':
				default:
					return this.render(renderData);
			}
		},
		json: function(json)
		{
			this.type = 'json';
			this.header['Content-Type'] = 'application/json';
			this.body = JSON.stringify(json);
		},
		render: function(renderData)
		{
			this.type = 'text/html';
			this.body = this.containerTpl(this.tpl(renderData), renderData);
		},
		redirect: function(url)
		{
			this.status = 302;
			this.header.location = url;
		},
		download: function(filename, file)
		{
			if (!file)
			{
				file = filename;
				filename = path.basename(file);
			}
			this.type = path.extname(filename);
			this.header['Content-Disposition'] = contentDisposition(filename);
			this.body = fs.createReadStream(file);
		},


		// 流程中的错误进行细分，方便自定义
		chooseErrorType: function(err)
		{
			return err && err.toStep;
		},
		renderThisError: function(type, err)
		{
			switch(type)
			{
				case 'initError':
					return this.onInitSkip();
				case 'outSession':
					return this.onOutSession(err);
				case 'invalidInput':
					return this.onInvalidInput(err);
				case 'userForbid':
					return this.onUserForbid(err);
				case 'error':
				default:
					return this.onError(err);
			}
		},
		onInitSkip: function(err){throw err},
		onOutSession: function(err){throw err},
		onInvalidInput: function(err){throw err},
		onUserForbid: function(err){throw err},
		onError: function(err){throw err},
	};
});
