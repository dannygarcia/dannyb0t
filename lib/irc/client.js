/*jshint onevar: false*/

var util = require("util");
var net = require("net");
var tls = require("tls");
var events = require("events");


var Client = module.exports = function (profile) {
	this.host = profile.host || "localhost";
	this.port = profile.port || 6667;

	this.name = profile.name || this.host;

	this.connected = false;
	this.connection = null;
	this.buffer = "";
	this.encoding = "utf8";
	this.timeout = 0;

	this.nick = profile.nick;
	this.user = profile.user || "guest";
	this.real = profile.real || "Guest";
	this.password = profile.password || null;
	this.nickserv = profile.nickserv || null;

	this.channels = {};
	this.users = {};

	this.needspong = false;
	this.pong_timeout = null;
	this.lag_time = 0;
	this.profile = profile;
};


util.inherits(Client, process.EventEmitter);


Client.prototype.connect = function () {
	var connection;

	if (this.profile.ssl) {
		connection = tls.connect(this.port, this.host, {});
	} else {
		connection = net.createConnection(this.port, this.host);
	}

	if (connection.setTimeout) {
		connection.setTimeout(this.timeout);
	}

	if (connection.setKeepAlive) {
		connection.setKeepAlive(true);
	}

	connection.setEncoding(this.encoding);

	for (var i in this.events) {
		if (this.events.hasOwnProperty(i)) {
			connection.on(i, this.events[i].bind(this));
		}
	}

	this.connection = connection;
	this.connected = true;
};


Client.prototype.disconnect = function (why) {
	if (this.connected) {
		if (this.connection.readyState !== "closed") {
			this.raw("QUIT :" + why);
			this.connection.end();
		}
		this.emit("disconnect", this, why);
	}
	this.connected = false;
};


Client.prototype.raw = function (message) {
	if (this.connection.readyState !== "open") {
		return false;
	}
	this.connection.write(message + "\r\n", this.encoding);
	this.emit("raw", message);
	return true;
};


Client.prototype.nick = function (nick) {
	if (nick.length > 16) {
		nick = nick.substr(0, 16);
	}

	this.nick = nick;
	this.raw("NICK " + this.nick);
};


Client.prototype.parse = function (incoming) {
	var match = incoming.match(/(?:(:[^\s]+) )?([^\s]+) (.+)/);

	var msg, params = match[3].match(/(.*?) ?:(.*)/);
	if (params) {
		// Message segment
		msg = params[2];
		// Params before message
		params = params[1].split(" ");

	} else {
		params = match[3].split(" ");
	}

	var prefix = match[1];
	var command = match[2];
	var user = incoming.match(/^:(.*)!/);
	var charcode = command.charCodeAt(0);

	if (charcode >= 48 && charcode <= 57 && command.length === 3) {
		command = parseInt(command, 10);
	}

	if (!user) {
		user = null;
	} else {
		user = user[1];
	}

	return {
		prefix: prefix,
		command: command,
		params: params,
		user: user,
		message: msg
	};
};


Client.prototype.parse_prefix = function (prefix) {
	var match = prefix.match(/^:(.*)!(\S+)@(\S+)/);
	if (match) {
		return {
			nick: match[1],
			user: match[2],
			host: match[3]
		};
	} else {
		return null;
	}
};


Client.prototype.get_channel = function (name) {
	if (typeof this.channels[name] === "undefined") {
		return this.channels[name] = new Client.Channel(this, name);
	}
	return this.channels[name];
};


Client.prototype.get_user = function (nick) {
	if (typeof this.users[nick] === "undefined") {
		return this.users[nick] = new Client.User(this, nick);
	}
	return this.users[nick];
};


Client.prototype.get_user_from_prefix = function (prefix) {
	var parse, user;
	parse = this.parse_prefix(prefix);
	user = this.get_user(parse.nick);

	if (!user.user) {
		user.user = parse.user;
	}

	if (!user.host) {
		user.host = parse.host;
	}

	return user;
};


Client.prototype.strip_color = function (text) {
	text = String(text);
	return text.replace(/\x03\d{0,2},?\d{1,2}|[\x02\x06\x07\x0f\x16\x17\x1b\x1d\x1f]/g, "");
};

Client.prototype.strip_control = function (text) {
	text = String(text);
	return text.replace(/[\x00\x01\x04\x05\x08-\x0e\x10-\x15\x18-\x1a\x1c\x1e]/g, "");
};

Client.prototype.ping_server = function () {
	var client = this;

	if (!this.needspong) {
		this.needspong = Date.now();
		this.raw("PING :" + this.needspong);

		this.pong_timeout = setTimeout(function () {
			if (client.needspong) {
				client.disconnect("No ping reply from server");
			}
		}, 300000); // 300 seconds

		return true;
	}
	return false;
};


Client.prototype.events = {
	secureConnect : function () {
		if (this.connection.authorized) {
			this.events.connect.call(this);
		} else {
			this.connection.end();
		}
	},

	connect : function () {
		this.raw("NICK " + this.nick);
		if (typeof this.password === "string") {
			this.raw("PASS " + this.password);
		}
		this.raw("USER " + this.user + " 0 * :" + this.real);
		if (typeof this.nickserv === "string") {
			this.get_user("NickServ").send("identify " + this.nickserv);
		}
	},

	data : function (chunk) {
		this.buffer += chunk;

		while (this.buffer) {
			var offset = this.buffer.indexOf("\r\n");
			if (offset < 0) {
				return;
			}

			var message = this.buffer.substr(0, offset);
			this.buffer = this.buffer.substr(offset + 2);
			console.log("raw message\n\n", message);

			this.emit("raw", message);

			message = this.parse(message);

			if (message !== false) {
				console.log(message);

				var channel_name;
				var channel;
				var user;
				var i;
				var len;
				var text;

				switch (message.command) {
				case 1: // RPL_WELCOME
					setTimeout(this.ping_server.bind(this), 60000);
					this.emit("welcome", this);
					break;

				case 5: //RPL_BOUNCE
					break;

				case 331: // RPL_NOTOPIC
					channel_name = message.params[1];
					channel = this.get_channel(channel_name);
					delete channel.topic;
					break;

				case 332: // RPL_TOPIC
					channel_name = message.params[1];
					channel = this.get_channel(channel_name);
					channel.topic = message.message;
					break;

				case 353: // RPL_NAMREPLY
					channel_name = message.params[message.params.length - 1];
					var names = message.message.replace(/^\s+|\s+$/g, '').split(/\s+/g);
					for (i = 0, len = names.length; i < len; i++) {
						var op = false, voice = false, nick = names[i];
						switch (nick[0]) {
						case "@":
							op = true;
							nick = nick.substr(1);
							break;
						case "+":
							voice = true;
							nick = nick.substr(1);
							break;
						}
						user = this.get_user(nick);
						this.get_channel(channel_name).userlist[nick] = {
							operator: op,
							voice: voice,
							user: user
						};
					}
					break;

				case "PING":
					this.raw("PONG :" + message.message);
					break;

				case "PONG":
					if (this.needspong === message.message) {
						this.lag_time = Date.now() - this.needspong;
						this.needspong = false;

						clearTimeout(this.pong_timeout);
						setTimeout(this.ping_server.bind(this), 60000);
					}
					break;

				case "NICK":
					var oldname = this.parse_prefix(message.prefix).nick;

					user = this.get_user(oldname);
					user.name = message.message;

					delete this.users[oldname];
					this.users[user.name] = user;

					for (i in this.channels) {
						if (this.channels.hasOwnProperty(i)) {
							channel = this.channels[i];

							if (channel.userlist.hasOwnProperty(oldname)) {
								var userobj = channel.userlist[oldname];
								delete channel.userlist[oldname];
								channel.userlist[user.name] = userobj;
							}
						}
					}

					this.emit("nick", message.message); // message.message is the new nick*/
					break;

				case "JOIN":
					channel_name = message.message;
					channel = this.get_channel(channel_name);
					user = this.get_user(message.user);

					channel.userlist[user.name] = {operator: false, voice: false, user: user};
					channel.emit("join", user, channel);
					this.emit("join", channel, user);


					break;

				case "TOPIC": // Topic changed
					channel_name = message.params[0];
					channel = this.get_channel(channel_name);
					var topic = message.message;

					channel.topic = topic;
					channel.emit("topic", topic);
					break;

				case "PRIVMSG":
					console.log(message.message.match(/^\!([a-zA-Z0-9]){2,20}/g));
					user = this.get_user_from_prefix(message.prefix);
					text = message.message;
					if (message.params[0] === this.nick) {
						this.emit("pm", user, text);
					} else {
						channel = this.get_channel(message.params[0]);
						this.emit("message", channel, user, text);
					}
					break;

				case "NOTICE":
					text = message.message;
					this.emit("notice", text);
					break;

				case "PART":
					user = this.get_user_from_prefix(message.prefix);
					channel_name = message.params[0];
					channel = this.get_channel(channel_name);

					channel.emit("part", user, channel);
					this.emit("part", channel, user);

					this.get_channel(channel_name).userlist[user.name];
					break;

				case "QUIT":
					user = this.get_user_from_prefix(message.prefix);

					for (i in this.channels) {
						if (this.channels.hasOwnProperty(i)) {
							delete this.channels[i].userlist[user.name];
						}
					}
					break;

				case "MODE":
					channel_name = message.params[0];
					var mode_str = message.params[1];
					var user_name = message.params[2];

					if (!user_name) {
						break;
					}

					channel = this.get_channel(channel_name);
					var userinfo = channel.userlist[user_name];
					switch (mode_str[0]) {
					case "+":
						if (/o/.test(mode_str)) {
							userinfo.operator = true;
						}
						if (/v/.test(mode_str)) {
							userinfo.voice = true;
						}
						break;
					case "-":
						if (/o/.test(mode_str)) {
							userinfo.operator = false;
						}
						if (/v/.test(mode_str)) {
							userinfo.voice = false;
						}
						break;
					}
					break;

				case "INVITE":
					user = this.get_user_from_prefix(message.prefix);
					channel = this.get_channel(message.message);
					if (message.params[0] === this.nick) {
						this.emit("invite", this, user, channel);
					}
					break;

				default:
					// If command is an error, emit it.
					if (typeof message.command === "number") {
						if (message.command >= 400 && message.command < 600) {
							this.emit("error", this, message.command, message.message);
						}
					}
					break;

				}
			}
		}
	},

	close : function () {
		this.disconnect("Stream has closed");
	},

	error : function () {
		this.disconnect("Stream error");
	},

	timeout : function () {
		this.disconnect("Timeout");
	},

	end : function () {
		this.disconnect("End");
	}
};


Client.Channel = function (client, name) {
	this.client = client;
	this.name = name;
	this.topic = null;
	this.userlist = {};
};

util.inherits(Client.Channel, events.EventEmitter);


Client.Channel.prototype.toString = function () {
	return this.name;
};

Client.Channel.prototype.self_command = function (command, message, options) {
	if (typeof options !== "object") {
		options = {};
	}

	if (typeof options.color === "undefined") {
		options.color = false;
	}

	if (typeof options.control === "undefined") {
		options.control = false;
	}

	if (typeof options.truncate === "undefined") {
		options.truncate = false;
	}

	if (typeof options.maxlength === "undefined") {
		options.maxlength = 382;
	}

	if (typeof options.maxlines === "undefined") {
		options.maxlines = 1;
	}

	if (typeof options.truncmsg === "undefined") {
		options.truncmsg = "\u2026";
	}

	// First we split the message by each line
	var lines = String(message).split(/[\r\n]+/g);

	// Then we get the number of lines we will output
	var linenums = options.truncate ? Math.min(options.maxlines, lines.length) : lines.length;

	for (var i = 0; i < linenums; i++) {

		// Then we remove all characters that are considered bad. (< 32)
		if (!options.color) {
			lines[i] = this.client.strip_color(lines[i]);
		}

		if (!options.control) {
			lines[i] = this.client.strip_control(lines[i]);
		}

		if (lines[i].length) {

			if (options.truncate) {
				var realsize = options.maxlength - options.truncmsg.length;
				if (lines[i].length > options.maxlength) {
					lines[i] = lines[i].substr(0, realsize) + options.truncmsg;
				}
			}

			this.client.raw(command + " " + this.name + " :" + lines[i]);
			this.emit("send", lines[i]);
		}

	}

};


Client.Channel.prototype.echo = function (message) {
	this.send(message);
};


Client.Channel.prototype.send_reply = function (user, message, options) {
	if (user === this) {
		this.send(message, options);
	} else {
		this.send(user.name + ": " + message, options);
	}
};


Client.Channel.prototype.send = function (message, options) {
	this.self_command("PRIVMSG", message, options);
};

Client.Channel.prototype.notice = function (message, options) {
	this.self_command("NOTICE", message, options);
};


Client.Channel.prototype.send_action = function (message, options) {
	var ctcp = "\x01";

	if (typeof options !== "object") {
		options = {
			control : true
		};
	} else {
		options.control = true;
	}

	this.self_command("PRIVMSG", ctcp + "ACTION " + message + ctcp, options);
};


Client.Channel.prototype.part = function (message) {
	var command = "PART " + this.name;
	if (message) {
		command += " :" + message;
	}
	this.client.raw(command);
};


Client.Channel.prototype.join = function (password) {
	var command = "JOIN " + this.name;

	if (password) {
		command += " :" + password;
	}
	this.client.raw(command);
};

Client.Channel.prototype.set_topic = function (topic) {
	this.client.raw("TOPIC " + this.name + " :" + topic.replace(/\n/g, " "));
};


Client.User = function (client, nick, user, host) {
	this.client = client;
	this.name = nick;
	this.user = user;
	this.host = host;
};

util.inherits(Client.User, Client.Channel);


Client.User.prototype.toString = function () {
	return "<" + this.name + ">";
};
