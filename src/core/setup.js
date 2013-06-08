module.exports = function (f00bot, profile) {

	var fs = require("fs");
	var path = require("path");
	var cwd = process.cwd();

	var HELLBANNED = profile.hellbanned || [];

	f00bot.prototype.setupCommands = function () {
		var modulesPath = path.join(cwd, "src", "commands");

		this.registerCommand = function (name, options, method) {
			this.register_command(name, function (context) {
				if (options.hellban === true && HELLBANNED.indexOf(context.sender.host) > -1) {
					return;
				}

				if (options.killjoy === true && this.killjoy(context)) {
					return;
				}

				return method.apply(this, arguments);
			}.bind(this), options);
		}.bind(this);

		var modules = fs.readdirSync(modulesPath).map(function (file) {
			return path.basename(file, ".js");
		}).forEach(function (mod) {
			require(path.join(modulesPath, mod)).call(this, f00bot, profile);
		}.bind(this));
	};

	f00bot.prototype.setupListeners = function () {
		var modulesPath = path.join(cwd, "src", "listeners");

		this.registerListener = function (regex, options, method) {
			this.register_listener(regex, function (context) {
				if (options.hellban === true && HELLBANNED.indexOf(context.sender.host) > -1) {
					return;
				}

				if (options.killjoy === true && this.killjoy(context)) {
					return;
				}

				return method.apply(this, arguments);
			}.bind(this), options);
		}.bind(this);

		var modules = fs.readdirSync(modulesPath).map(function (file) {
			return path.basename(file, ".js");
		}).forEach(function (mod) {
			require(path.join(modulesPath, mod)).call(this, f00bot, profile);
		}.bind(this));
	};

	f00bot.prototype.setup = function () {
		this.setupCommands();
		this.setupListeners();
	};

};
