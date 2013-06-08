module.exports = function (f00bot, profile) {
	"use strict";

	this.registerCommand("set", {
		help: "add a canned response. syntax: !set #[name] [String]",
		hellban: true
	}, function (context, text) {
		var cmd = text.split(/\s/g);

		var trigger = cmd[0];
		var tl = trigger.length;

		var rest = text.substring(tl + 1, text.length);

		if (!this.db.collection.cues) {
			this.db.collection.cues = {};
		}

		var taken;

		for (var key in this.db.collection.cues) {
			if (rest === this.db.collection.cues[key]) {
				taken = key;
				break;
			}
		}

		if (!taken && !this.db.collection.cues[trigger]) {
			this.db.collection.cues[trigger] = rest;
			console.log("Set", trigger, this.db.collection.cues[trigger]);
		} else {
			if (taken && trigger !== taken) {
				context.channel.echo("Sorry, " + taken + " stole your gif and also your thunder.");
			} else {
				context.channel.echo("Sorry, " + trigger + " is already taken.");
			}
		}
	});

	this.registerCommand("unset", {
		help: "remove a canned response. syntax: !unset #[name]",
		hellban: true
	}, function (context, text) {
		var cmd = text.split(/\s/g);

		var trigger = cmd[0];
		var tl = trigger.length;

		var rest = text.substring(tl + 1, text.length);

		if (!this.db.collection.cues || !this.db.collection.cues[trigger]) {
			context.channel.echo(trigger + " is not a thing.");
			return;
		}

		console.log("Unset", trigger, this.db.collection.cues[trigger]);
		delete this.db.collection.cues[trigger];
	});

};
