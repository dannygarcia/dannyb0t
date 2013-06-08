module.exports = {
	host: "chat.ff0000.com",
	port: 6667,
	nick: "f00bot",
	user: "f00bot",
	real: "f00bot",
	channels: ["#test", "#srsly"],
	nofun: ["#srsly"],
	hellbanned: ["it_guy"],
	apis: {
		twitter: {
			"KEY_NAME": {
				consumer_key:         "CONSUMER_KEY",
				consumer_secret:      "CONSUMER_SECRET",
				access_token:         "ACCESS_TOKEN",
				access_token_secret:  "ACCESS_TOKEN_SECRET"
			}
		},
		imgur: {}
	},
	sarcasm: {
		"++" : [
			"Hooray.",
			"Not that they mean anything.",
			"Seriously, they don't mean anything."
		],

		"--" : [
			"What an asshole.",
			"Might as well end it now.",
			"Is it time for lunch yet?"
		]
	}
};
