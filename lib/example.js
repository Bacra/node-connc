var fs = require('fs');
var path = require('path');
var contentDisposition = require('content-disposition');
var ckit = require('ckit');

module.exports = require('./base').base.extend(function(parent)
{
	return {
		renderType: 'json',
		message: ckit.message({}),
		containerTpl: function(body, renderData)
		{
			return body;
		},
		tpl: function(renderData)
		{
			var err = new Error('Not Found Tpl render');
			err.code = 'NO_RENDER_TPL';
			throw err;
		},

		json: function(json)
		{
			this.type = 'json';
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
		download: function(file)
		{
			this.type = path.extname(file);
			this.header['Content-Disposition'] = contentDisposition(path.basename(file));
			this.body = fs.createReadStream(file);
		},

		checkRequestBody: function(body)
		{
			return this.message.check(body);
		},

		chooseRenderType: function()
		{
			return this.renderType;
		},
		renderThisType: function(type, renderData)
		{
			switch(this.type)
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

		chooseErrorType: function(err)
		{
			return err && err.toStep;
		},

		renderThisError: function(type, err)
		{
			switch(type)
			{
				case 'initError':
					return this.initSkip();
				case 'outSession':
					return this.outSession(err);
				case 'invalidInput':
					return this.invalidInput(err);
				case 'forbid':
					return this.forbid(err);
				case 'error':
				default:
					return this.error(err);
			}
		},

		initSkip: function(err){throw err},
		outSession: function(err){throw err},
		invalidInput: function(err){throw err},
		forbid: function(err){throw err},
		error: function(err){throw err},
	};
});
