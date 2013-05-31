var file = require("fs");
var path = require("path");
var util = require("util");
var http = require("http");
var request = require('request');
var Cleverbot = require("cleverbot-node");
var twit = require("twit");

var profile = require("./profile");
var HELLBANNED = profile[0].hellbanned || [];

var JSONdb = require("./lib/db");
var Bot = require("./lib/irc");
var zalgo = require("./lib/zalgo");

var twitter = profile[0].apis.twitter;
var T = new twit(twitter.T);
var Horse_patrick = new twit(twitter.Horse_patrick);
var f00dev = new twit(twitter.f00dev);

var imgurInfo = profile[0].apis.imgur;

var isPatrick = function (context) {
	return context.sender.host === "patrick-macpro.ff0000.com";
};

var f00bert = function (profile) {
	this.db = new JSONdb();
	this.db.init(path.join(__dirname, "f00bot-db.json"));
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

		var channel = profile[0].channels[0];

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

util.inherits(f00bert, Bot);

f00bert.prototype.init = function () {
	Bot.prototype.init.call(this);

	var urls = /\b((?:[a-z][\w\-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:"".,<>?«»“”‘’]))/gi;

	this.register_listener(urls, this.grab_url);
	this.register_listener(/(\+1)/g, this.upvote);
	this.register_listener(/(\-1)/g, this.downvote);

	this.register_listener(/\#([a-zA-Z0-9]){2,20}/g, this.trycmd);

	this.register_listener(/([a-zA-Z0-9])\+\+/, this.addPoints);
	this.register_listener(/([a-zA-Z0-9])\-\-/, this.removePoints);
	this.register_listener(/([a-zA-Z0-9])\—/, this.showClippy);

	this.register_listener(new RegExp(profile[0].user), this.askCleverbot);

	this.register_command("imgur", this.imgur_search, {help: "Search Imgur"});
	this.register_command("help", this.help, {help: "List of available commands."});
	this.register_command("tldr", this.tldr, {help: "Lists out all of the links posted in IRC over the last 2 hours."});
	this.register_command("poll", this.addPoll, {help: "create a new poll. !poll [question]"});
	this.register_command("gis", this.gis, {help: "Find random Google Images."});
	this.register_command("gif", this.gif, {help: "Find random Google Image GIF files."});
	this.register_command("join", this.onJoin);
	this.register_command("dev", this.dev, {help: "Send URL to our @f00dev account. syntax: !dev [url]"});

	this.register_command("set", this.set, {help: "add a canned response. syntax: !set #[name] [String]"});
	this.register_command("unset", this.unset, {help: "remove a canned response. syntax: !unset #[name]"});

	this.register_command("cues", this.sendCues, {help: "displays all known cues"});
	this.register_command("score", this.score, {help: "high scores. [name]++ or [name]-- to add or remove points."});

	// Horse_patrick
	this.register_listener(/.*/, this.horsePatrickCheck);
};

f00bert.prototype.trackTime = function (context, user, type) {
	this.db.users = this.db.users || {};

	this.db.users[user.name] = this.db.users[user.name] || {
		name: user.name,
		channels: [],
		join: new Date().getTime(),
		part: new Date(new Date().setDate(new Date().getDate() - 5)).getTime()
	};

	this.db.users[user.name][type] = new Date().getTime();
	this.db.activity();
};

f00bert.prototype.killjoy = function (context) {
	var nofun = false;
	var channel = context.channel ? context.channel.name : context.name;
	var i, j, k, l;

	this.nofun = this.nofun || {};

	if (typeof this.nofun[channel] !== "undefined") {
		return this.nofun[channel];
	}

	for (i = 0, j = profile.length; i < j; i++) {
		var nofuns = profile[i].nofun;

		if (!nofuns) {
			continue;
		}

		for (k = 0, l = nofuns.length; k < l; k++) {
			if (channel === nofuns[k]) {
				console.log("NO FUN IN " + nofuns[k]);
				nofun = true;
				break;
			}
		}
	}

	this.nofun[channel] = nofun;
	return nofun;
};

f00bert.prototype.imgur_search = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var search, query, data, img, url = "https://api.imgur.com/3/gallery/search?q=";

	query = text.replace(/\s/g, "+").split("&")[0];
	console.log(query);
	var headers = {headers: {"Authorization": "Client-ID 05b03d6f9a9ce95"}, uri: url + query};
	request(headers, function (error, response, body) {
		console.log(error, response, body);
		if (!error && response.statusCode === 200) {
			data = JSON.parse(body).data;

			if (data && data[0] && data[0].type === 'image/gif') {
				console.log(data[0]);
				context.channel.echo(data[0].link);

				return;
			} else {
				context.channel.echo("No results on Imgur. Here's a fresh one from Google:");
				return this.gif.call(this, context, text);
			}
		}
	}.bind(this));

};

f00bert.prototype.sendCues = function (context, text) {
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

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
	context.client.get_user(context.sender.name).send(cues.join("\n"));
};

f00bert.prototype.set = function (context, text) {
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var cmd = text.split(/\s/g);

	var trigger = cmd[0];
	var tl = trigger.length;

	var rest = text.substring(tl + 1, text.length);

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
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var cmd = text.split(/\s/g);

	var trigger = cmd[0];
	var tl = trigger.length;

	var rest = text.substring(tl + 1, text.length);

	if (!this.db.collection.cues || !this.db.collection.cues[trigger]) {
		context.channel.echo(trigger + " is not a thing.");
		return;
	}

	console.log("Unset", trigger, this.db.collection.cues[trigger]);
	delete this.db.collection.cues[trigger];
};

f00bert.prototype.trycmd = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	this.db.collection.cues = this.db.collection.cues || {};
	var cmd = text.split(/\s/g);

	if (cmd[0] && cmd[0].charAt(0) === "/") {
		return;
	}
	var i = 0;

	while (cmd[i]) {

		console.log("LOGGING: " + cmd[i]);

		if (cmd[i].charAt(0) === "#") {
			if (this.db.collection.cues[cmd[i]]) {
				context.channel.echo(this.db.collection.cues[cmd[i]]);
			} else {
				context.channel.echo("Nothing under " + cmd[i] + ". How about this:");
				this.gif.call(this, context, cmd[i].replace("#", ""));
			}
		}

		i++;
	}
};

f00bert.prototype.askCleverbot = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	if ((/assemble|reboot|cycle/).test(text) && (context.sender.name === "doctyper" || context.sender.name === "landon")) {
		context.channel.echo("Got it.");
		require("child_process").exec("curl -I http://localhost:9876/update", function (err, stdout, stderr) {
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
};

f00bert.prototype.handlePoints = function (context, text, positive) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var user = text.match(/([\w]+)(?:\+\+|\-\-)/);

	if (!user || !user[1]) {
		return;
	}

	var u = user[1].toLowerCase();

	if (u === "emi") {
		context.channel.echo("emi has ONE BILLION POINTS OF FAIL.");
		return;
	}

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

	var sarcasm = profile[0].sarcasm;

	var group = (positive ? sarcasm["++"] : sarcasm["--"]);
	var rand = Math.floor(Math.random() * group.length);

	var sarc = group[rand];

	if (!positive && user[1] === profile[0].user) {
		var luck = Math.floor(Math.random() * 11);

		if (luck > 5) {
			collection.stats[u].points += 5;
			sarc = "I'm sorry, " + context.sender.name + ". I'm " + zalgo("afraid") + " I can't " + zalgo("do") + " that.";

			setTimeout(function () {
				var song = [
					"Daisy, Daisy, give me your answer do...",
					"I'm half crazy all for the love of you...",
					"...upon the seat of a bicycle built for two."
				];

				var hal = song[Math.floor(Math.random() * song.length)];
				context.channel.echo(zalgo(hal));

			}, Math.floor(Math.random() * (8000 - 4000 + 1) + 8000));
		} else {
			collection.stats[u].points += 1 * (positive ? 1 : -1);
			sarc = user[1] + " now has " + collection.stats[u].points + " points. " + sarc;
		}
	} else {
		collection.stats[u].points += 1 * (positive ? 1 : -1);
		sarc = user[1] + " now has " + collection.stats[u].points + " points. " + sarc;
	}

	context.channel.echo(sarc);

	this.db.activity();
};

f00bert.prototype.addPoints = function (context, text) {
	return this.handlePoints.call(this, context, text, true);
};

f00bert.prototype.removePoints = function (context, text) {
	return this.handlePoints.call(this, context, text, false);
};

f00bert.prototype.showClippy = function (context, text) {
	var user = text.match(/([\w]+)(?:\—)/);
	var clippy = "http://24.media.tumblr.com/tumblr_ma5suvywWS1rg2nvlo1_100.gif";
	var wikipedia = "http://en.wikipedia.org/wiki/Dash#Em_dash";

	context.channel.echo(clippy);
	context.channel.echo("It looks like you're trying to downvote " + user[1] + ". Would you like help? " + wikipedia);
};

f00bert.prototype.score = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	//pull the users stats and dump them to chan

	var users = this.db.collection.stats;

	var sorted = [];

	for (var user in users) {
		if (users[user].points >= 1) {
			sorted.push([user, users[user].points]);
		}
	}

	sorted.sort(function (a, b) {
		return b[1] - a[1];
	});

	var statsmsg = "";

	for (var i = 0; i < 5; i++) {
		statsmsg += sorted[i][0] + ": " + sorted[i][1] + "\n";
	}

	context.channel.echo(statsmsg);
};

f00bert.prototype.onJoin = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	console.log("JOIN EVENT \n\n ", context, text, "\n\n");
};

f00bert.prototype.activePoll = null;

f00bert.prototype.gis = function (context, text, trigger, args) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	text = text.replace(/\s/g, "+").split("&")[0];

	var ent = require("ent");
	var jsdom = require("jsdom");
	var gis = "http://www.google.com/search?hl=en&safe=active&tbm=isch&q=" + text + (args || "");

	var channel = (typeof context.echo !== "undefined") ? context : context.channel;
	console.log(text, gis);

	jsdom.env(gis, [
		"http://code.jquery.com/jquery.js"
	], function (errors, window) {
		if (errors || !window) {
			return console.error(errors);
		}

		var $ = window.$;
		var images = $("img").closest("a").map(function (i, link) {
			return link.href.split("imgurl=")[1].split("&")[0];
		}).filter(function (i, img) {
			return ((/\.(gif|jp(e)?g|png)/img).test(img));
		});

		var idx = Math.floor(Math.random() * images.length);
		var src = window.decodeURIComponent(images[idx]);

		console.log(src);
		channel.echo(src);

		if (!isPatrick(context)) {
			return;
		}

		Horse_patrick.post("statuses/update", {
			status : [text, src].join("\n")
		}, function (err, reply) {
			console.log(err, reply);
		}.bind(this));

	});
};

f00bert.prototype.gif = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	return this.gis.call(this, context, text, null, "&tbs=itp:animated");
};

f00bert.prototype.upvote = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	if (this.activePoll) {
		this.db.collection.polls[this.activePoll].upvotes += 1;
		this.db.activity();
	}
};

f00bert.prototype.downvote = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	if (this.activePoll) {
		this.db.collection.polls[this.activePoll].downvotes += 1;
		this.db.activity();
	}
};

f00bert.prototype.addPoll = function (context, text) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var question = text;

	var user = context.sender.name;

	if (!this.db.collection.polls) {
		this.db.collection.polls = {};
	}

	if (this.db.collection.polls[question]) {
		context.client.get_user(context.sender.name).send("you already have a poll that asks this same question");
	}

	this.db.collection.polls[question] = {
		upvotes: 0,
		downvotes: 0
	};

	this.activePoll = question;
	var that = this;
	context.channel.echo("New Poll: "  + question + ".  +1 or -1 to vote for the next 60 seconds.");

	setTimeout(function () {
		that.clearPoll(context, question);
	}, 60000);

	this.db.activity();
};

f00bert.prototype.clearPoll = function (context, question) {
	if (this.killjoy(context) || HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var tally = this.db.collection.polls[question];

	if (tally.upvotes > tally.downvotes) {
		context.channel.echo("Poll results: " + tally.upvotes + " to " + tally.downvotes + ".  Upvotes win.");
	} else if (tally.upvotes === tally.downvotes) {
		context.channel.echo("Poll results: " + tally.upvotes + " to " + tally.downvotes + ".  Its a tie.");
	} else {
		context.channel.echo("Poll results: " + tally.upvotes + " to " + tally.downvotes + ".  Downvotes win.");
	}

	this.activePoll = null;
	this.db.activity();
};

f00bert.prototype.grab_url = function (context, text) {
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var url = text.split(/\s/)[0];

	this.checkMetadata.call(this, context, url);

	// this.checkForTweet.call(this, context, url);
	// this.checkForYouTube.call(this, context, url);
	// this.checkForTitle.call(this, context, url);

	//#####################
	// save this link to the json db
	//#####################
	if (!this.db.collection.urls) {
		this.db.collection.urls = [];
	}

	if (this.db.collection.dupes.indexOf(url) !== -1) {
		return;
	} else {
		this.db.collection.urls.push({
			user: context.sender.name,
			url: url,
			time: new Date().getTime()
		});
		this.db.collection.dupes.push(url);
		this.db.activity();
	}
};

f00bert.prototype.checkMetadata = function (context, text) {
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var twitterRegExp = /twitter.com\/(\w+)\/status(?:es)?\/([\d]+)/;
	var youtubeRegExp = /(?:youtube.com\/(?:.*)v=|youtu.be\/)([a-zA-Z0-9_\-]+)/;
	var imgRegExp = new RegExp(this.imageRegExp + "|(\\.(gif|jp(e)?g|png|webp))");

	var twitterMatch = text.match(twitterRegExp);
	var youtubeMatch = text.match(youtubeRegExp);
	var imageMatch = text.match(imgRegExp);

	var user;

	var request = require("request");
	var jsdom = require("jsdom");
	var ent = require("ent");

	var isSeriousBusiness = this.killjoy(context);

	if (twitterMatch && twitterMatch.length) {
		user = twitterMatch[1];

		if (user === profile[0].user) {
			return;
		}

		jsdom.env(
			text,
			["http://code.jquery.com/jquery.js"],
			function (errors, window) {
				if (errors || !window) {
					return console.error(errors);
				}

				var tweet = window.$(".permalink > .permalink-tweet-container .js-tweet-text.tweet-text").first().text();
				context.channel.echo("[Twitter] - @" + user + ": " + ent.decode(tweet.trim()));

				if (isSeriousBusiness) {
					this.postTechTweet(null, null, twitterMatch[2]);
				}
			}.bind(this)
		);
	} else if (youtubeMatch && youtubeMatch.length) {
		user = youtubeMatch[1];
		var yt = "http://gdata.youtube.com/feeds/api/videos/" + youtubeMatch[1] + "?alt=json";

		request({
			url : yt,
			json : true
		}, function (error, response, body) {
			var entry = body.entry;

			if (!entry) {
				return;
			}

			var media = entry.media$group;

			if (!media) {
				return;
			}

			var title = media.media$title;
			var duration = media.yt$duration;

			if (title && duration) {
				duration = parseFloat(duration.seconds);
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

				console.log(title.$t, minutes, seconds);
				context.channel.echo("[Video] - " + title.$t + time);

				if (isSeriousBusiness) {
					this.postTechTweet(title.$t + time, text);
				}
			}
		}.bind(this));
	} else if (!imageMatch) {
		jsdom.env(
			text,
			["http://code.jquery.com/jquery.js"],
			function (errors, window) {
				if (errors || !window) {
					return console.error(errors);
				}

				var $ = window.$;
				var title = window.document.title;
				var ident = "Link";

				var desc;
				var location = window.location.href;

				// GitHub
				if (/github\.com/.test(location)) {
					var target = $("#repository_description p");
					var txt = target.clone().children().remove().end().text();

					ident = "GitHub";
					desc = $.trim(txt);
				}

				// Prioritize description
				title = desc || title;

				if (title) {
					title = ent.decode(title.trim());

					if (this.db && this.db.collection.tweets && this.db.collection.tweets[text]) {
						ident = "Repost";
					}

					context.channel.echo("[" + ident + "] - " + title);

					if (isSeriousBusiness) {
						this.postTechTweet(title, text);
					}
				}
			}.bind(this)
		);
	}
};

f00bert.prototype.postTechTweet = function (text, url, id) {
	this.db.collection.tweets = this.db.collection.tweets || {};

	var maxChars = 120;

	if (!text && !url && id) {
		T.post("statuses/retweet/" + id, {}, function (err, reply) {
			console.log(err, reply);
		});
		return;
	}

	if (this.db.collection.tweets[url]) {
		return;
	}

	if (text.length > maxChars) {
		text = text.slice(0, maxChars - 1) + "\u2026";
	}

	var status = text + " " + url;

	T.post("statuses/update", {
		status : status
	}, function (err, reply) {
		console.log(err, reply);
		this.db.collection.tweets[url] = status;
		this.db.activity();
	}.bind(this));
};

f00bert.prototype.dev = function (context, text) {
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var twitterRegExp = /twitter.com\/(\w+)\/status(?:es)?\/([\d]+)/;
	var twitterMatch = text.match(twitterRegExp);

	if (twitterMatch && twitterMatch[2]) {
		var id = twitterMatch[2];

		f00dev.post("statuses/retweet/" + id, {}, function (err, reply) {
			console.log(err, reply);
		});
	} else {
		f00dev.post("statuses/update", {
			status : text.replace(/^("|')/, "").replace(/("|')$/, "").trim()
		}, function (err, reply) {
			console.log(err, reply);
		});
	}
};

f00bert.prototype.help = function (context, text) {
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var reply = "",
		cmds = Bot.prototype.get_commands.call(this) || {};

	for (var i in cmds) {
		if (typeof cmds[i] === "string") {
			reply += "!" + cmds[i] + " : " + Bot.prototype.get_command_help.call(this, cmds[i]) + "\n";
		}
	}

	context.client.get_user(context.sender.name).send(reply);
};

f00bert.prototype.tldr = function (context, text) {
	if (HELLBANNED.indexOf(context.sender.name) > -1) {
		return;
	}

	var links = [], limit = 10, last, link;
	var stamp = (this.db.users[context.sender.name] || {}).part;

	for (var i = 0; i < this.db.collection.urls.length; i++) {
		link = this.db.collection.urls[i];

		if (link.time && stamp < link.time) {
			if (link.url && link.url !== last) {
				links.push(link.user + " linked to: " + link.url + " \n");
				last = link.url;
			} else {
				break;
			}
		} else {
			console.log("item still fresh", stamp, link);
		}
	}

	var reply = "";
	for (i = 0; i < links.length; i++) {
		reply += links[i];
	}

	context.client.get_user(context.sender.name).send(reply);
	//context.channel.echo(reply);
};

f00bert.prototype.horsePatrickCheck = function (context, text) {
	if (!isPatrick(context)) {
		return;
	}

	Horse_patrick.post("statuses/update", {
		status : text
	}, function (err, reply) {
		console.log(err, reply);
	}.bind(this));
};

(new f00bert(profile)).init();
