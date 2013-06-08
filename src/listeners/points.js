module.exports = function (f00bot, profile) {
	"use strict";

	this.registerListener(/([a-zA-Z0-9_])\+\+/, {
		hellban: true,
		killjoy: true
	}, function (context, text) {
		console.log("foo~");
		var handlePoints = require("./points/handlePoints");
		handlePoints.call(this, profile, context, text, true);
	});

	this.registerListener(/([a-zA-Z0-9_])\-\-/, {
		hellban: true,
		killjoy: true
	}, function (context, text) {
		var handlePoints = require("./points/handlePoints");
		handlePoints.call(this, profile, context, text, false);
	});

	this.registerListener(/([a-zA-Z0-9_])\—/, {
		hellban: true,
		killjoy: true
	}, function (context, text) {
		var user = text.match(/([\w]+)(?:\—)/);
		var clippy = "http://24.media.tumblr.com/tumblr_ma5suvywWS1rg2nvlo1_100.gif";
		var wikipedia = "http://en.wikipedia.org/wiki/Dash#Em_dash";

		context.channel.echo(clippy);
		context.channel.echo("It looks like you're trying to downvote " + user[1] + ". Would you like help? " + wikipedia);
	});

};
