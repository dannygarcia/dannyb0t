module.exports = function (f00bot, profile) {
	"use strict";

	this.registerListener(/\#([a-zA-Z0-9]){2,20}/g, {
		hellban: true,
		killjoy: true
	}, function (context, text) {
		this.db.collection.cues = this.db.collection.cues || {};
		var cmd = text.split(/\s/g);

		if (cmd[0] && cmd[0].charAt(0) === "/") {
			return;
		}
		var i = 0;

		while (cmd[i]) {

			console.log("LOGGING: " + cmd[i]);

			if (cmd[i].charAt(0) === "#") {
				if (this.db.collection.cues[cmd[i]]) {
					context.channel.echo(this.db.collection.cues[cmd[i]]);
				} else {
					context.channel.echo("Nothing under " + cmd[i] + ". How about this:");
					this.__commands.gif.callback.call(this, context, cmd[i].replace("#", ""));
				}
			}

			i++;
		}
	});

};
