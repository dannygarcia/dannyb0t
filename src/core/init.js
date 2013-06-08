module.exports = function (f00bot, profile) {

	var path = require("path");
	var cwd = process.cwd();

	var Bot = require(path.join(cwd, "lib", "irc"));

	f00bot.prototype.init = function () {
		Bot.prototype.init.call(this);

		this.setup();
		this.register_command("help", this.help, {help: "List of available commands."});
	};

};
