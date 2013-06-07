module.exports = function (context, text, profile) {
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
	var postTechTweet = require("./postTechTweet").call(this);

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
					postTechTweet(profile, null, null, twitterMatch[2]);
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
					postTechTweet(profile, title.$t + time, text);
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
						postTechTweet(profile, title, text);
					}
				}
			}.bind(this)
		);
	}
};
