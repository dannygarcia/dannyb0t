module.exports = function (f00bot, profile) {
	"use strict";

	this.registerCommand("dev", {
		help: "Send URL to our @f00dev account. syntax: !dev [url]",
		hellban: true
	}, function (context, text) {
		var Twit = require("twit");
		var f00dev = new Twit(profile.apis.twitter.f00dev);

		var twitterRegExp = /twitter.com\/(\w+)\/status(?:es)?\/([\d]+)/;
		var twitterMatch = text.match(twitterRegExp);

		if (twitterMatch && twitterMatch[2]) {
			var id = twitterMatch[2];

			f00dev.post("statuses/retweet/" + id, {}, function (err, reply) {
				console.log(err, reply);
			});
		} else {
			f00dev.post("statuses/update", {
				status : text.replace(/^("|')/, "").replace(/("|')$/, "").trim()
			}, function (err, reply) {
				console.log(err, reply);
			});
		}
	});

};
