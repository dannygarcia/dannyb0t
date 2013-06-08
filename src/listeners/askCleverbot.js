module.exports = function (f00bot, profile) {
	"use strict";

	var cp = require("child_process");
	var Cleverbot = require("cleverbot-node");

	this.registerListener(new RegExp(profile.user), {
		hellban: true,
		killjoy: true
	}, function (context, text) {
		if (!profile.updaters || !profile.update) {
			return;
		}

		if ((/assemble|reboot|cycle/).test(text) && profile.updaters.indexOf(context.sender.name) !== -1) {
			var confirm = [
				"Got it.",
				"Yep.",
				"Sure.",
				"*sigh*",
				"Fine.",
				"Ok.",
				"Yes ma'am."
			];

			var rand = Math.floor(Math.random() * confirm.length);
			context.channel.echo(confirm[rand]);

			cp.exec("curl -I " + profile.update, function (err, stdout, stderr) {
				if (stdout) {
					console.log(stdout);
				}

				if (stderr) {
					console.log("ERROR\n", stderr);
				}
			});

			return;
		}

		this.cleverbot = this.cleverbot || new Cleverbot();

		var cleverize = text.replace(new RegExp(profile.user, "igm"), "Cleverbot");

		console.log("Asking:", cleverize);
		this.cleverbot.write(text, function (response) {
			var f000ize = response.message.replace(/cleverbot/igm, profile.user);
			context.channel.echo(f000ize);
		});
	});

};
