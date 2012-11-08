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

	this.on('join', function(context, user){

		if (this.db.collection.messages[user.name] && this.db.collection.messages[user.name].count > 0) {

			var reply = '';
			var mailbox = this.db.collection.messages[user.name];

			for (var sender in mailbox){
				var messages = mailbox[sender];
				for (var i = 0; i < messages.length; i++) {
					reply += sender + ': ' + messages[i] + '\n';
				}
			}

			context.client.get_user(user.name).send(reply);
			if (this.db.collection.messages[user.name]) {
				this.db.collection.messages[user.name] = {count: 0};
				this.db.activity();
			}
		}
	});

	this.imageRegExp = "(" + this.imageDomains.join("|") + ")";
	this.imageRegExp = this.imageRegExp.replace(/\./g, "\\.");
	this.imageRegExp = this.imageRegExp.replace(/\\/g, "\\");
};


util.inherits(f00bert, Bot);


f00bert.prototype.init = function() {

	Bot.prototype.init.call(this);

	var urls = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/gi;
	this.register_listener( urls, this.grab_url );
	this.register_listener( /(\+1)/g, this.upvote);
	this.register_listener( /(\-1)/g, this.downvote);
	this.register_command('help', this.help, {help: "List of available commands."});
	this.register_command('tldr', this.tldr, {help: "Lists out all of the links posted in IRC over the last 2 hours."});
	this.register_command('srsly', this.srsly, {help: "Lists out the links that are not images over the last 2 hours"});
	this.register_command('lulz', this.lulz, {help: "Lists out images only over the last 2 hours"});
	this.register_command('msg', this.msg, {help: "save a message for later for a user.  syntax: !msg [nick] [msg]"});
	this.register_command('poll', this.addPoll, {help: "create a new poll. !poll [question]"});
	this.register_command('msgs', this.messages, {help: "see any messages people have left for you"});
	this.register_command('xkcd', this.xkcd, {help: "random xkcd link"});
	this.register_command('join', this.onJoin);
};




f00bert.prototype.onJoin = function(context, text){
	console.log('JOIN EVENT \n\n ', context, text, '\n\n');
};

f00bert.prototype.activePoll = null;

f00bert.prototype.xkcd = function(context, text){
	var ent = require("ent");
	var jsdom = require("jsdom");
	var xkcd = "http://dynamic.xkcd.com/comic/random/";

	jsdom.env(
		xkcd,
		["http://code.jquery.com/jquery.js"],
		function (errors, window) {
			if (errors || !window) {
				return console.error(errors);
			}

			var img = window.$("#comic img"),
				src = img.attr("src"),
				alt = img.attr("title");

			context.channel.echo([src, ent.decode(alt)].join("\n"));
		}
	);
};

f00bert.prototype.messages = function(context, text){

	if (this.db.collection.messages[context.sender.name] && this.db.collection.messages[context.sender.name].count > 0) {

		var reply = '';
		var mailbox = this.db.collection.messages[context.sender.name];

		for (var sender in mailbox){
			var messages = mailbox[sender];
			for (var i = 0; i < messages.length; i++) {
				reply += sender + ': ' + messages[i] + '\n';
			}
		}

		context.client.get_user(context.sender.name).send(reply);
		this.clearmessages(context, text);
	} else {
		context.client.get_user(context.sender.name).send("Nobody likes you because you have no messages.");
	}

};

f00bert.prototype.upvote = function(context, text){
	if (this.activePoll) {
		this.db.collection.polls[this.activePoll].upvotes +=1;
		this.db.activity();
	}
};

f00bert.prototype.downvote = function(context, text){
	if (this.activePoll) {
		this.db.collection.polls[this.activePoll].downvotes +=1;
		this.db.activity();
	}
};

f00bert.prototype.addPoll = function(context, text){

	var question = text;

	var user = context.sender.name;

	if (!this.db.collection.polls) {
		this.db.collection.polls = {};
	}

	if (this.db.collection.polls[question]) {
		context.client.get_user(context.sender.name).send('you already have a poll that asks this same question');
	}

	this.db.collection.polls[question] = {
		upvotes: 0,
		downvotes: 0
	};

	this.activePoll = question;
	var that = this;
	context.channel.echo('New Poll: '  + question + '.  +1 or -1 to vote for the next 60 seconds.');
	setTimeout(function(){
		that.clearPoll(context, question);
	}, 60000);

	this.db.activity();
};

f00bert.prototype.clearPoll = function(context, question){
	var tally = this.db.collection.polls[question];

	if (tally.upvotes > tally.downvotes) {
		context.channel.echo('Poll results: ' + tally.upvotes + ' to ' + tally.downvotes + '.  Upvotes win.');
	} else if (tally.upvotes === tally.downvotes) {
		context.channel.echo('Poll results: ' + tally.upvotes + ' to ' + tally.downvotes + '.  Its a tie.');
	} else {
		context.channel.echo('Poll results: ' + tally.upvotes + ' to ' + tally.downvotes + '.  Downvotes win.');
	}

	this.activePoll = null;
	this.db.activity();

};

f00bert.prototype.clearmessages = function(context, text){
	if (this.db.collection.messages[context.sender.name]) {
		this.db.collection.messages[context.sender.name] = {count: 0};
	}

	this.db.activity();
};


f00bert.prototype.msg = function(context, text){

	if (!this.db.collection.messages) {
		this.db.collection.messages = {};
	}


	var split = text.split(' ');



	if (!this.db.collection.messages[split[0]]) {
		this.db.collection.messages[split[0]] = {count: 0};
	}

	if (!this.db.collection.messages[split[0]][context.sender.name]) {
		this.db.collection.messages[split[0]][context.sender.name] = [];
	}

	var msg = '';
	for (var i = 0; i < split.length; i++) {
		if (i > 0) {
			msg += split[i] += ' ';
		}
	}

	this.db.collection.messages[split[0]][context.sender.name].push(msg);
	this.db.collection.messages[split[0]].count +=1;
	this.db.activity();
};


f00bert.prototype.gifmanager = function(context, text){

};

f00bert.prototype.grab_url = function(context, text){

	this.checkForTweet.call(this, context, text);

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

f00bert.prototype.checkForTweet = function (context, text) {
	var regExp = /twitter.com\/(\w+)\/status(?:es)?\/[\d]+/;
	var match = text.match(regExp);

	if (match && match.length) {
		var jsdom = require("jsdom");
		var ent = require("ent");

		var user = match[1];

		jsdom.env(
			text,
			["http://code.jquery.com/jquery.js"],
			function (errors, window) {
				if (errors || !window) {
					return console.error(errors);
				}

				var text = window.$(".js-tweet-text.tweet-text").text();
				context.channel.echo("@" + user + ": " + ent.decode(text.trim()));
			}
		);
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
	real: "testbot",
	channels: ["#FF0000"]
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
