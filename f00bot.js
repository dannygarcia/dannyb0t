var file = require('fs');
var path = require('path');
var util = require("util");
var http = require("http");

var Cleverbot = require("cleverbot-node");
var twit = require("twit");

var extras = require("./lib/extras");
var JSONdb = require("./lib/db");
var Bot = require("./lib/irc");

var QUIET = true;

var T = new twit({
    consumer_key:         "R5xk3yzpOtcEg7cZIoxzw",
	consumer_secret:      "tpBuHvwkEadk0lrTxkWhljpc1bhpDKTvmDAhBCM",
	access_token:         "1078181256-wKgOPg5h77kFS1PjIatAdzIWUONoPcBpsBh1URR",
	access_token_secret:  "M3d699fl0lz7gWPU0rql3WykMhQaTiR49YT8J5XdfmQ"
});

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

		if (this.db && this.db.collection.cues) {
			var sap = "will";
			var cue = this.db.collection.cues["#" + sap];
			var text = "Hi #" + sap + "!\n" + cue;

			if (user.host.indexOf(sap) !== -1 && cue) {
				context.client.get_channel(context.name).echo(text);
			}
		}
	});

	this.on("pm", function (context, text) {
		console.log(context, text);

		var channel = profile[0].channels[0];

		if (text.indexOf("$") !== -1) {
			text = text.replace(/(\s)?\$(\s?)/img, "");
			context.client.get_channel(channel).echo(text);
			T.post('statuses/update', { status: f000ize }, function(err, reply) {});

		}
	});

	if (!QUIET) {
		this.on('message', this.onMessage);
	}

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

	this.register_listener(/\#([a-zA-Z0-9]){2,20}/g, this.trycmd);

	this.register_listener( /([a-zA-Z0-9])\+\+/, this.addPoints);
	this.register_listener( /([a-zA-Z0-9])\-\-/, this.removePoints);

	this.register_listener(/f00bot/, this.askCleverbot);

	this.register_command('help', this.help, {help: "List of available commands."});
	this.register_command('tldr', this.tldr, {help: "Lists out all of the links posted in IRC over the last 2 hours."});
	this.register_command('srsly', this.srsly, {help: "Lists out the links that are not images over the last 2 hours"});
	this.register_command('lulz', this.lulz, {help: "Lists out images only over the last 2 hours"});
	this.register_command('msg', this.msg, {help: "save a message for later for a user.  syntax: !msg [nick] [msg]"});
	this.register_command('poll', this.addPoll, {help: "create a new poll. !poll [question]"});
	this.register_command('msgs', this.messages, {help: "see any messages people have left for you"});
	this.register_command('xkcd', this.xkcd, {help: "random xkcd link"});
	this.register_command('gis', this.gis, {help: "Find random Google Images."});
	this.register_command('gif', this.gif, {help: "Find random Google Image GIF files."});
	this.register_command('join', this.onJoin);

	this.register_command('set', this.set, {help: "add a canned response. syntax: !set #[name] [String]"});
	this.register_command('unset', this.unset, {help: "remove a canned response. syntax: !unset #[name]"});

	this.register_command('cues', this.sendCues, {help: "displays all known cues"});
	this.register_command('score', this.score, {help: "high scores. [name]++ or [name]-- to add or remove points."});
};

f00bert.prototype.sendCues = function (context, text) {
	var cues = [], limit = 20, currLimit = limit, curr = [],
	cuekeys = Object.keys(this.db.collection.cues || {}).sort();

	for (var i = 0, j = cuekeys.length; i < j; i++) {
		var key = cuekeys[i];

		if (i === currLimit) {
			cues.push(curr.join(" "));
			curr = [];

			currLimit += limit;
		}

		curr.push(key);
	}

	cues.push(curr.join(" "));
	context.client.get_user(context.sender.name).send(cues.join('\n'));
};

f00bert.prototype.set = function (context, text) {
	var cmd = text.split(/\s/g);

	var trigger = cmd[0];
	var tl = trigger.length;

	var rest = text.substring(tl+1, text.length);

	if (!this.db.collection.cues) {
		this.db.collection.cues = {};
	}

	var taken;

	for (var key in this.db.collection.cues) {
		if (rest === this.db.collection.cues[key]) {
			taken = key;
			break;
		}
	}

	if (!taken && !this.db.collection.cues[trigger]) {
		this.db.collection.cues[trigger] = rest;
		console.log("Set", trigger, this.db.collection.cues[trigger]);
	} else {
		if (taken && trigger !== taken) {
			context.channel.echo("Sorry, " + taken + " stole your gif and also your thunder.");
		} else {
			context.channel.echo("Sorry, " + trigger + " is already taken.");
		}
	}
};

f00bert.prototype.unset = function (context, text) {
	var cmd = text.split(/\s/g);

	var trigger = cmd[0];
	var tl = trigger.length;

	var rest = text.substring(tl+1, text.length);

	if (!this.db.collection.cues || !this.db.collection.cues[trigger]) {
		context.channel.echo(trigger + " is not a thing.");
		return;
	}

	console.log("Unset", trigger, this.db.collection.cues[trigger]);
	delete this.db.collection.cues[trigger];
};


f00bert.prototype.trycmd = function (context, text) {
	var cmd = text.split(/\s/g);

	if (!this.db.collection.cues || (cmd[0] && cmd[0].charAt(0) === '/')) {
		return;
	}

	var i = 0;

	while (cmd[i]) {
		if (cmd[i].charAt(0) === "#") {
			if (this.db.collection.cues[cmd[i]]) {
				context.channel.echo(this.db.collection.cues[cmd[i]]);
			} else {
				context.channel.echo("Nothing under " + cmd[i] + ". How about this:");
				this.gis.call(this, context, cmd[i].replace("#", ""));
			}
		}

		i++;
	}
};

f00bert.prototype.askCleverbot = function (context, text) {
	this.cleverbot = this.cleverbot || new Cleverbot();
	var cleverize = text.replace(/f00bot/igm, "Cleverbot");

	console.log("Asking:", cleverize);
	this.cleverbot.write(text, function (response) {
		var f000ize = response.message.replace(/cleverbot/igm, "f00bot");
		context.channel.echo(f000ize);
		T.post('statuses/update', { status: f000ize }, function(err, reply) {});
	});
};

f00bert.prototype.handlePoints = function (context, text, positive) {
	var user = text.match(/([\w]+)(?:\+\+|\-\-)/);

	if (!user || !user[1]) {
		return;
	}

	var u = user[1].toLowerCase();
	var collection = this.db.collection;

	collection.stats = collection.stats || {};

	if (context.sender && context.sender.name) {
		var n = context.sender.name.toLowerCase();

		if (n === u) {
			context.channel.echo("No gaming the system, " + context.sender.name + ".");
			return;
		}

		collection.stats[n] = collection.stats[n] || {};

		if (collection.stats[n].voted) {
			var timeSince = (new Date().getTime() - collection.stats[n].voted.time) / 1000;
			console.log(timeSince);

			if (timeSince < 60 && collection.stats[n].voted.user === u) {
				context.channel.echo("You can vote for " + u + " again in ~" + Math.round(60 - timeSince) + " seconds, " + context.sender.name + ".");
				return;
			}
		}

		collection.stats[n].voted = {
			time : new Date().getTime(),
			user : u
		};
	}

	collection.stats[u] = collection.stats[u] || {};
	collection.stats[u].points = collection.stats[u].points || 0;

	var sarcasm = {
		"++" : [
			"Hooray.",
			"Not that they mean anything.",
			"Seriously, they don't mean anything.",
			"You must feel loved. Nobody loves me.",
			"Sweet, more imaginary points.",
			"Somewhere Drew Carey is smiling.",
			"Achievement unlocked.",
			"Quite the accomplishment.",
			"Ding!",
			"Remember that one time Danny showed us porn?",
			"Remember that one time Landon showed us porn?"
		],

		"--" : [
			"What an asshole.",
			"Might as well end it now.",
			"Is it time for lunch yet?",
			"Now you know how I feel.",
			"You humans and your points...",
			"Let's start a slow clap.",
			"Come on, people now. Smile on your brother.",
			"Somewhere Ryan Stiles is sobbing quietly.",
			"That's no way to make friends.",
			"Dick move."
		]
	};

	var group = (positive ? sarcasm["++"] : sarcasm["--"]);
	var rand = Math.floor(Math.random() * group.length);

	collection.stats[u].points += 1 * (positive ? 1 : -1);
	context.channel.echo(user[1] + ' now has ' + collection.stats[u].points + ' points. ' + group[rand]);

	this.db.activity();
};

f00bert.prototype.addPoints = function (context, text) {
	return this.handlePoints.call(this, context, text, true);
};

f00bert.prototype.removePoints = function (context, text) {
	return this.handlePoints.call(this, context, text, false);
};

f00bert.prototype.score = function(context, text){
	//pull the users stats and dump them to chan

	var users = this.db.collection.stats;

	var sorted = [];

	for(var user in users) {
		if (users[user].points >= 1) {
			sorted.push([user, users[user].points]);
		}

	}

	sorted.sort(function (a, b) { return b[1] - a[1]; } );
	statsmsg = '';

	for (var i = 0; i < 5; i++) {
		statsmsg += sorted[i][0] + ': ' + sorted[i][1] + '\n';
	}

	context.channel.echo(statsmsg);
};



f00bert.prototype.onJoin = function(context, text){
	console.log('JOIN EVENT \n\n ', context, text, '\n\n');
};

f00bert.prototype.onMessage = function (context, text) {
	// Five minutes
	var interval = 10 * (60 * 1000);

	var randomKeywords = [
		"kitten",
		"fail",
		"puppy",
		"happy",
		"otter",
		"awkward",
		"hamster",
		"nope",
		"hedgehog",
		"random",
		"rainbow",
		"unicorn"
	];

	if (this.awkwardTimer) {
		console.log("Awkward timer restarted.");
		clearTimeout(this.awkwardTimer);
	}

	this.awkwardTimer = setTimeout(function () {
		var r = Math.floor(Math.random() * randomKeywords.length);

		this.gif.call(this, context, randomKeywords[r]);
		this.onMessage.call(this, context);
	}.bind(this), interval);
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

f00bert.prototype.gis = function(context, text, trigger, args){
	text = text.replace(/\s/g, "+").split("&")[0];

	var ent = require("ent");
	var jsdom = require("jsdom");
	var gis = "http://www.google.com/search?hl=en&safe=active&tbm=isch&q=" + text + (args || "");

	var channel = (typeof context.echo !== "undefined") ? context : context.channel;
	console.log(text, gis);

	jsdom.env(
		gis,
		["http://code.jquery.com/jquery.js"],
		function (errors, window) {
			if (errors || !window) {
				return console.error(errors);
			}

			var $ = window.$;
			var images = $("img");
			var gifs = images.filter(function (img) {
				return (/\.gif/.test(img.src));
			});

			images = gifs.length ? gifs : images;

			var idx = Math.floor(Math.random() * images.length);
			var parent = images.eq(idx).closest("a");
			var raw = parent.attr("href").split("imgurl=")[1].split("&")[0];
			var src = window.decodeURIComponent(raw);
			channel.echo(src);
			// T.post('statuses/update', { status: (text + ': ' + src) }, function(err, reply) {
			//	console.log(err, reply);
			// });
		}
	);
};

f00bert.prototype.gif = function(context, text){
	return this.gis.call(this, context, text, null, "+filetype:gif");
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
	this.checkForYouTube.call(this, context, text);

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

f00bert.prototype.checkForYouTube = function (context, text) {
	var regExp = /(?:youtube.com\/(?:.*)v=|youtu.be\/)([a-zA-Z0-9_-]+)/;
	var match = text.match(regExp);

	if (match && match.length) {
		var request = require("request");
		var ent = require("ent");

		var user = match[1];
		var yt = "https://gdata.youtube.com/feeds/api/videos/" + match[1] + "?alt=json";

		request({
			url : yt,
			json : true
		}, function (error, response, body) {
			var entry = body.entry;

			if (!entry) {
				return;
			}

			var media = entry["media$group"];

			if (!media) {
				return;
			}

			var title = media["media$title"];
			var duration = media["yt$duration"];

			if (title && duration) {
				var duration = parseFloat(duration.seconds);
				var hours = Math.floor(duration / 3600);

				duration = duration - hours * 3600;
				var minutes = Math.floor(duration / 60).toString();
				var seconds = (duration - minutes * 60).toString();

				if (minutes.length < 2) {
					minutes = "0" + minutes;
				}

				if (seconds.length < 2) {
					seconds = "0" + seconds;
				}

				if (hours && hours.length < 2) {
					hours = "0" + hours;
				}

				var time = " [" + (hours ? hours + ":" : "") + [minutes, seconds].join(":") + "]";

				console.log(title["$t"], minutes, seconds);
				context.channel.echo("Video: " + title["$t"] + time);
			}
		});
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
	channels: ["#FF0000"]
}];


(new f00bert(profile)).init();
