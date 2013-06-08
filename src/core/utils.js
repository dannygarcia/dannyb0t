module.exports = function (f00bot, profile) {

	var fs = require("fs");
	var path = require("path");
	var cwd = process.cwd();

	var Bot = require(path.join(cwd, "lib", "irc"));
	var HELLBANNED = profile.hellbanned || [];

	f00bot.prototype.trackTime = function (context, user, type) {
		this.db.users = this.db.users || {};

		this.db.users[user.name] = this.db.users[user.name] || {
			name: user.name,
			channels: [],
			join: new Date().getTime(),
			part: new Date(new Date().setDate(new Date().getDate() - 5)).getTime()
		};

		this.db.users[user.name][type] = new Date().getTime();
		this.db.activity();
	};

	f00bot.prototype.killjoy = function (context) {
		var nofun = false;
		var channel = context.channel ? context.channel.name : context.name;
		var i, j;

		this.nofun = this.nofun || {};

		if (typeof this.nofun[channel] !== "undefined") {
			return this.nofun[channel];
		}

		var nofuns = profile.nofun || [];

		for (i = 0, j = nofuns.length; i < j; i++) {
			if (channel === nofuns[i]) {
				console.log("NO FUN IN " + nofuns[i]);
				nofun = true;
				break;
			}
		}

		this.nofun[channel] = nofun;
		return nofun;
	};

	f00bot.prototype.help = function (context, text) {
		if (HELLBANNED.indexOf(context.sender.host) > -1) {
			return;
		}

		var reply = "",
			cmds = Bot.prototype.get_commands.call(this) || {};

		for (var i in cmds) {
			if (typeof cmds[i] === "string") {
				reply += "!" + cmds[i] + " : " + Bot.prototype.get_command_help.call(this, cmds[i]) + "\n";
			}
		}

		context.client.get_user(context.sender.name).send(reply);
	};

};
