var file = require('fs');
var path = require('path');
var util = require("util");
var http = require("http");

var JSONdb = require("./lib/db");
var Bot = require("./lib/irc");

var f00bert = function(profile) {
	this.db = new JSONdb();
	this.db.init(path.join(__dirname, "f00bot-db.json"));
	Bot.call(this, profile);
	this.set_log_level(this.LOG_ALL);
	this.set_trigger("!");

	this.imageDomains = [
		"d.pr",
		"imgur.com"
	];

	this.imageRegExp = "(" + this.imageDomains.join("|") + ")";
	this.imageRegExp = this.imageRegExp.replace(/\./g, "\\.");
	this.imageRegExp = this.imageRegExp.replace(/\\/g, "\\");
};


util.inherits(f00bert, Bot);

f00bert.prototype.init = function() {

	Bot.prototype.init.call(this);

	var urls = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
	this.register_listener( urls, this.grab_url );

	this.register_command('help', this.help, {help: "List of available commands."});
	this.register_command('tldr', this.tldr);
	this.register_command('srsly', this.srsly);
	this.register_command('lulz', this.lulz);

};

f00bert.prototype.gifmanager = function(context, text){

};

f00bert.prototype.grab_url = function(context, text){
	//#####################
	// save this link to the json db
	//#####################
	if (!this.db.collection.urls) {
		this.db.collection.urls = [];
	}

	if (this.db.collection.dupes.indexOf(text) !== -1) {
		return;
	} else {
		var death = Math.floor(new Date().getTime()/1000);
		this.db.collection.urls.push({user: context.sender.name, url: text, death: (death + (3600 * 2))});
		this.db.collection.dupes.push(text);
		this.db.activity();
	}

};

f00bert.prototype.help = function (context, text) {
	var reply = '',
		cmds = Bot.prototype.get_commands.call(this) || {};

	for (var i in cmds) {
		if (typeof cmds[i] === "string") {
			reply += "!" + cmds[i] + " : " + Bot.prototype.get_command_help.call(this, cmds[i]) + '\n';
		}
	}

	context.client.get_user(context.sender.name).send(reply);
};


f00bert.prototype.tldr = function(context, text, mode){
	var links = [], limit = 10, last, link;
	var stamp = Math.floor(new Date().getTime()/1000);

	var imgRegExp = new RegExp(this.imageRegExp + "|(\\.(gif|jp(e)?g|png|webp))");

	for (var i = 0; i < this.db.collection.urls.length; i++) {
		link = this.db.collection.urls[i];

		if (stamp > link.death) {
			this.db.collection.urls.remove(i);
			this.db.collection.dupes.remove(i);
		} else {
			console.log('item still fresh', stamp, link);
		}
		try	{
			if (link.url && link.url !== last) {
				if (mode === "srsly" && (imgRegExp).test(link.url)) {
					continue;
				}

				if (mode === "lulz" && !(imgRegExp).test(link.url)) {
					continue;
				}

				links.push(link.user + ' linked to: ' + link.url + ' \n');
				last = link.url;
			} else {
				break;
			}
		} catch (err){
			console.log('EOL');
		}

	}

	var reply = '';
	for (i = 0; i < links.length; i++) {
		reply += links[i];
	}

	context.client.get_user(context.sender.name).send(reply);
	//context.channel.echo(reply);
};

f00bert.prototype.srsly = function (context, text) {
	return this.tldr(context, text, "srsly");
};

f00bert.prototype.lulz = function (context, text) {
	return this.tldr(context, text, "lulz");
};



var profile = [{
	host: "chat.ff0000.com",
	port: 6667,
	nick: "f00bot",
	user: "f00bot",
	real: "f00bot",
	channels: ["#ff0000"]
}];


(new f00bert(profile)).init();


if (!Array.prototype.indexOf) {

	Array.prototype.indexOf = function(searchElement /*, fromIndex */) {

    if (this === void 0 || this === null)
      throw new TypeError();

    var t = Object(this);
    var len = t.length >>> 0;
    if (len === 0)
      return -1;

    var n = 0;
    if (arguments.length > 0) {
      n = Number(arguments[1]);
      if (n !== n)
        n = 0;
      else if (n !== 0 && n !== (1 / 0) && n !== -(1 / 0))
        n = (n > 0 || -1) * Math.floor(Math.abs(n));
    }

    if (n >= len)
      return -1;

	var k = n >= 0 ? n : Math.max(len - Math.abs(n), 0);

	for (; k < len; k++) {
		if (k in t && t[k] === searchElement)
			return k;
		}
		return -1;
	};

}

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};
