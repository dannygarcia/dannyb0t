module.exports = function (f00bot, profile) {
	"use strict";

	/*this.registerCommand("tldr", {
		help: "Catch up on what you've missed",
		hellban: true
	}, function (context, text) {
		var links = [], limit = 10, last, link;
		var stamp = (this.db.users[context.sender.name] || {}).part;

		for (var i = 0; i < this.db.collection.urls.length; i++) {
			link = this.db.collection.urls[i];

			if (link.time && stamp < link.time) {
				if (link.url && link.url !== last) {
					links.push(link.user + " linked to: " + link.url + " \n");
					last = link.url;
				} else {
					break;
				}
			} else {
				console.log("item still fresh", stamp, link);
			}
		}

		var reply = "";
		for (i = 0; i < links.length; i++) {
			reply += links[i];
		}

		context.client.get_user(context.sender.name).send(reply);
		//context.channel.echo(reply);
	});*/

};
