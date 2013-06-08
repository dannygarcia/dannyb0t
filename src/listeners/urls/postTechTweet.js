module.exports = function (profile, text, url, id) {
	this.db.collection.tweets = this.db.collection.tweets || {};

	var Twit = require("twit");
	var T = new Twit(profile.apis.twitter);
	var maxChars = 120;

	if (!text && !url && id) {
		T.post("statuses/retweet/" + id, {}, function (err, reply) {
			console.log(err, reply);
		});
		return;
	}

	if (this.db.collection.tweets[url]) {
		return;
	}

	if (text.length > maxChars) {
		text = text.slice(0, maxChars - 1) + "\u2026";
	}

	var status = text + " " + url;

	T.post("statuses/update", {
		status : status
	}, function (err, reply) {
		console.log(err, reply);
		this.db.collection.tweets[url] = status;
		this.db.activity();
	}.bind(this));
};
