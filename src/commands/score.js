module.exports = function (f00bot, profile) {
	"use strict";

	this.registerCommand("score", {
		help: "high scores. [name]++ or [name]-- to add or remove points.",
		killjoy: true,
		hellban: true
	}, function (context, text) {
		//pull the users stats and dump them to chan
		var users = this.db.collection.stats;

		var sorted = [];

		for (var user in users) {
			if (users[user].points >= 1) {
				sorted.push([user, users[user].points]);
			}
		}

		sorted.sort(function (a, b) {
			return b[1] - a[1];
		});

		var statsmsg = "";

		for (var i = 0; i < 5; i++) {
			statsmsg += sorted[i][0] + ": " + sorted[i][1] + "\n";
		}

		context.channel.echo(statsmsg);
	});

};
