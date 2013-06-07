var path = require("path");

var args = process.argv.slice(2);
var profilePath = args[0] ? args[0] : "./profile";
var dbPath = args[1] ? args[1] : path.join(__dirname, "f00bot-db.json");

var profile = require(profilePath);

// Import f00bot
var f00bot = require("./src/core")(profile, dbPath);
module.exports = new f00bot(profile).init();
