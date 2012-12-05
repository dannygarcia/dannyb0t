/*global process*/

var express = require("express");
var app = express();
var port = 9876;

var cp = require("child_process");

var f00bot = {
	init : function () {
		this.bot = cp.spawn("node", ["./f00bot.js"], {
			stdio: "inherit"
		});
	},

	destroy : function () {
		this.bot.kill();
	},

	cycle : function () {
		console.log("Stopping f00bot...");
		this.destroy();

		var git = cp.spawn("git", ["pull", "origin", "master"], {
			stdio: "inherit"
		});

		git.on("exit", function (code) {
			console.log("Updating npm...");

			if (code !== 0) {
				process.stderr.write(code);
			}

			var npm = cp.spawn("npm", ["update"], {
				stdio: "inherit"
			});

			npm.on("exit", function (cpde) {
				console.log("Restarting...");

				if (code !== 0) {
					process.stderr.write(code);
				}

				setTimeout(function () {
					this.init();
				}.bind(this), 5000);
			}.bind(this));

		}.bind(this));

	}
};

app.get("/update", function (req, res) {
	var body = "Updating...";
	res.setHeader("Content-Type", "text/plain");
	res.setHeader("Content-Length", body.length);
	res.end(body);

	f00bot.cycle();
});

f00bot.init();
app.listen(port);
console.log("Listening on port " + port);
