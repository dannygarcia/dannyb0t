module.exports = function (f00bot, profile) {
	"use strict";

	this.registerCommand("cues", {
		help: "displays all known cues",
		hellban: true
	}, function (context, text) {
		var cues = [], limit = 20, currLimit = limit, curr = [],
		cuekeys = Object.keys(this.db.collection.cues || {}).sort();

		for (var i = 0, j = cuekeys.length; i < j; i++) {
			var key = cuekeys[i];

			if (i === currLimit) {
				cues.push(curr.join(" "));
				curr = [];

				currLimit += limit;
			}

			curr.push(key);
		}

		cues.push(curr.join(" "));
		context.client.get_user(context.sender.name).send(cues.join("\n"));
	});

};
