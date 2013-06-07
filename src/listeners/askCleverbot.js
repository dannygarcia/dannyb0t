module.exports = function (f00bot, profile) {
	"use strict";

	var cp = require("child_process");
	var Cleverbot = require("cleverbot-node");

	this.registerListener(new RegExp(profile[0].user), {
		hellban: true,
		killjoy: true
	}, function (context, text) {
		if ((/assemble|reboot|cycle/).test(text) && (context.sender.name === "doctyper" || context.sender.name === "landon")) {
			context.channel.echo("Got it.");
			cp.exec("curl -I http://localhost:9876/update", function (err, stdout, stderr) {
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

		var cleverize = text.replace(new RegExp(profile[0].user, "igm"), "Cleverbot");

		console.log("Asking:", cleverize);
		this.cleverbot.write(text, function (response) {
			var f000ize = response.message.replace(/cleverbot/igm, profile[0].user);
			context.channel.echo(f000ize);
		});
	});

};
