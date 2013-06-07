var fs = require("fs");
var path = require("path");
var colors = require("colors");

var args = process.argv.slice(2);
var profilePath = args[0] ? args[0] : "./profile.js";
var dbPath = args[1] ? args[1] : path.join(__dirname, "f00bot-db.json");

if (!fs.existsSync(profilePath)) {
	console.error(("No file named " + profilePath + " exists. Edit and rename profile-sample.js to get started").yellow);
	process.exit();
}

var profile = require(profilePath);

// Import f00bot
var f00bot = require("./src/core")(profile, dbPath);
module.exports = new f00bot(profile).init();
