module.exports = function (f00bot, profile) {
	"use strict";

	this.registerListener(/.*/, {}, function (context, text) {
		if (context.sender.host !== "patrick-macpro.ff0000.com") {
			return;
		}

		var Twit = require("twit");
		var Horse_patrick = new Twit(profile[0].apis.twitter.Horse_patrick);

		Horse_patrick.post("statuses/update", {
			status : text
		}, function (err, reply) {
			console.log(err, reply);
		}.bind(this));
	});

};
