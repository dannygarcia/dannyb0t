module.exports = function (profile, dbPath) {
	var path = require("path");
	var util = require("util");
	var cwd = process.cwd();

	var JSONdb = require(path.join(cwd, "lib", "db"));
	var Bot = require(path.join(cwd, "lib", "irc"));

	var HELLBANNED = profile.hellbanned || [];

	var f00bot = function (profile) {
		this.db = new JSONdb();
		this.db.init(dbPath);
		Bot.call(this, profile);

		this.set_log_level(this.LOG_ALL);
		this.set_trigger("!");

		this.imageDomains = [
			"d.pr",
			"imgur.com"
		];

		this.on("join", function (context, user) {
			this.trackTime(context, user, "join");
			this.killjoy(context);
		});

		this.on("part", function (context, user) {
			this.trackTime(context, user, "part");
		});

		this.on("pm", function (context, text) {
			console.log(context, text);

			var channel = profile.channels[0];

			if (text.indexOf("$") !== -1) {
				text = text.replace(/(\s)?\$(\s?)/img, "");
				context.client.get_channel(channel).echo(text);

				// T.post("statuses/update", {
					// status : f000ize
				// }, function (err, reply) {});

			}
		});

		this.imageRegExp = "(" + this.imageDomains.join("|") + ")";
		this.imageRegExp = this.imageRegExp.replace(/\./g, "\\.");
		this.imageRegExp = this.imageRegExp.replace(/\\/g, "\\");
	};

	util.inherits(f00bot, Bot);

	// Import setup
	var setup = require("./setup")(f00bot, profile);

	// Import utils
	var utils = require("./utils")(f00bot, profile);

	// Import init
	var init = require("./init")(f00bot, profile);

	return f00bot;
};
