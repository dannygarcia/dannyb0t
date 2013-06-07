module.exports = function (f00bot, profile) {
	"use strict";

	this.registerCommand("gis", {
		help: "Find random images via Google.",
		killjoy: true,
		hellban: true
	}, function (context, text, trigger, args) {
		text = text.replace(/\s/g, "+").split("&")[0];

		var ent = require("ent");
		var jsdom = require("jsdom");
		var gis = "http://www.google.com/search?hl=en&safe=active&tbm=isch&q=" + text + (args || "");

		var channel = (typeof context.echo !== "undefined") ? context : context.channel;
		console.log(text, gis);

		jsdom.env(gis, [
			"http://code.jquery.com/jquery.js"
		], function (errors, window) {
			if (errors || !window) {
				return console.error(errors);
			}

			var $ = window.$;
			var images = $("img").closest("a").map(function (i, link) {
				return link.href.split("imgurl=")[1].split("&")[0];
			}).filter(function (i, img) {
				return ((/\.(gif|jp(e)?g|png)/img).test(img));
			});

			var idx = Math.floor(Math.random() * images.length);
			var src = window.decodeURIComponent(images[idx]);

			console.log(src);
			channel.echo(src);

			if (context.sender.host !== "patrick-macpro.ff0000.com") {
				return;
			}

			var Twit = require("twit");
			var Horse_patrick = new Twit(profile[0].apis.twitter.Horse_patrick);

			Horse_patrick.post("statuses/update", {
				status : [text, src].join("\n")
			}, function (err, reply) {
				console.log(err, reply);
			}.bind(this));

		});
	});

	this.registerCommand("gif", {
		help: "Find random animated images via Google.",
		killjoy: true,
		hellban: true
	}, function (context, text) {
		return this.__commands.gis.callback.call(this, context, text, null, "&tbs=itp:animated");
	});

};
