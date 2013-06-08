module.exports = function (f00bot, profile) {
	"use strict";

	var urls = /\b((?:[a-z][\w\-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:"".,<>?«»“”‘’]))/gi;

	this.registerListener(urls, {
		hellban: true
	}, function (context, text) {
		var url = text.split(/\s/)[0];

		var checkMetadata = require("./urls/checkMetadata");
		checkMetadata.call(this, context, url, profile);

		//#####################
		// save this link to the json db
		//#####################
		if (!this.db.collection.urls) {
			this.db.collection.urls = [];
		}

		if (this.db.collection.dupes.indexOf(url) !== -1) {
			return;
		} else {
			this.db.collection.urls.push({
				user: context.sender.name,
				url: url,
				time: new Date().getTime()
			});
			this.db.collection.dupes.push(url);
			this.db.activity();
		}
	});

};
