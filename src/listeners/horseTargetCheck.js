module.exports = function (f00bot, profile) {
	"use strict";

	this.registerListener(/.*/, {}, function (context, text) {
		if (context.sender.host !== profile[0].horsetarget) {
			return;
		}

		var Twit = require("twit");
		var Horse_target = new Twit(profile[0].apis.twitter.Horse_target);

		Horse_target.post("statuses/update", {
			status : text
		}, function (err, reply) {
			console.log(err, reply);
		}.bind(this));
	});

};
