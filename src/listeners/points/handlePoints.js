module.exports = function (profile, context, text, positive) {
	var user = text.match(/([\w]+)(?:\+\+|\-\-)/);

	if (!user || !user[1]) {
		return;
	}

	var u = user[1].toLowerCase();

	if (u === "emi") {
		context.channel.echo("emi has ONE BILLION POINTS OF FAIL.");
		return;
	}

	var collection = this.db.collection;

	collection.stats = collection.stats || {};

	if (context.sender && context.sender.name) {
		var n = context.sender.name.toLowerCase();

		if (n === u) {
			context.channel.echo("No gaming the system, " + context.sender.name + ".");
			return;
		}

		collection.stats[n] = collection.stats[n] || {};

		if (collection.stats[n].voted) {
			var timeSince = (new Date().getTime() - collection.stats[n].voted.time) / 1000;
			console.log(timeSince);

			if (timeSince < 60 && collection.stats[n].voted.user === u) {
				context.channel.echo("You can vote for " + u + " again in ~" + Math.round(60 - timeSince) + " seconds, " + context.sender.name + ".");
				return;
			}
		}

		collection.stats[n].voted = {
			time : new Date().getTime(),
			user : u
		};
	}

	collection.stats[u] = collection.stats[u] || {};
	collection.stats[u].points = collection.stats[u].points || 0;

	var sarcasm = profile.sarcasm;

	var group = (positive ? sarcasm["++"] : sarcasm["--"]);
	var rand = Math.floor(Math.random() * group.length);

	var sarc = group[rand];

	if (!positive && user[1] === profile.user) {
		var luck = Math.floor(Math.random() * 11);

		if (luck > 5) {
			var zalgo = require(process.cwd() + "/lib/zalgo");
			collection.stats[u].points += 5;
			sarc = "I'm sorry, " + context.sender.name + ". I'm " + zalgo("afraid") + " I can't " + zalgo("do") + " that.";

			setTimeout(function () {
				var song = [
					"Daisy, Daisy, give me your answer do...",
					"I'm half crazy all for the love of you...",
					"...upon the seat of a bicycle built for two."
				];

				var hal = song[Math.floor(Math.random() * song.length)];
				context.channel.echo(zalgo(hal));

			}, Math.floor(Math.random() * (8000 - 4000 + 1) + 8000));
		} else {
			collection.stats[u].points += 1 * (positive ? 1 : -1);
			sarc = user[1] + " now has " + collection.stats[u].points + " points. " + sarc;
		}
	} else {
		collection.stats[u].points += 1 * (positive ? 1 : -1);
		sarc = user[1] + " now has " + collection.stats[u].points + " points. " + sarc;
	}

	context.channel.echo(sarc);

	this.db.activity();
};
