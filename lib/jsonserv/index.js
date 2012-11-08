var Utils = require("util");
var File = require("fs");
var JSONSaver = require("../jsonsaver");

var JsonServer = module.exports = function(filename) {
	this.filename = filename;
	this.changed = false;
	this.loaded = false;
	this.db = new JSONSaver(filename);
};

JsonServer.prototype.dumplink = function(limit){
	var db = this.db.object.links;

	if (!limit) {
		limit = 10;
	}

	var results = [];

	for (var i = 0; i < limit; i++) {
		var link = db.links[i];

		if (link.type !== 'gif') {
			results.push(db.links[i]);
		}

	}

	return links;
};


JsonServer.prototype.insert = function(link, domain, user){

	var db = this.db.object.tldr;

	db.tldr.push({"link": link, "domain": domain[0], "user":user});
	this.db.activity();

};

JsonServer.prototype.learn = function(key, value) {

	var db = this.db.object.factoids;

	var popularity = 0;
	key = key.toLowerCase();

	if (typeof db[key] !== "undefined") {
		if (typeof db[key].alias !== "undefined") {
			return this.learn(db[key].alias, value);
		}
		popularity = db[key].popularity || 0;
	}

	db[key] = {value: value, popularity: popularity};
	this.db.activity();
};


JsonServer.prototype.alias = function(alias, key) {
	key = key.toLowerCase();
	alias = alias.toLowerCase();

	var db = this.db.object.factoids;

	if (typeof db[key] === "undefined") throw new Error("Factoid `"+key+"` doesn't exist.");

	if (typeof db[key].alias !== "undefined") {
		return this.alias(alias, db[key].alias);
	}

	if (alias === key) throw new Error("Cannot alias yourself.");

	db[alias] = {alias: key};
	this.db.activity();
	return key;
};


JsonServer.prototype.find = function(key, incpop) {
	key = key.toLowerCase();
	var db = this.db.object.tldr;

	if (typeof db[key] === "undefined") {
		throw new Error("Factoid `"+key+"` was not found.");
	}

	if (typeof db[key].alias !== "undefined") {
		return this.find(db[key].alias);
	}

	var thing = db[key];
	if (incpop) {
		thing.popularity = thing.popularity || 0;
		thing.popularity++;
	}

	return thing.value;
};


JsonServer.prototype.search = function(pattern, num) {
	if (typeof num !== "number") num = 5;
	var found = [], cat, db = this.db.object.factoids;
	pattern = pattern.toLowerCase();

	for (var i in db) {
		if (db.hasOwnProperty(i)) {
			if (typeof db[i].value === "undefined") continue;

			cat = (i+" "+db[i].value).toLowerCase();
			if (~cat.indexOf(pattern)) {
				found.push(i);
			}
		}
	}

	found.sort(function(a, b) { return db[b].popularity - db[a].popularity; });
	return found.slice(0, num);
};


JsonServer.prototype.forget = function(key) {
	key = key.toLowerCase();
	var db = this.db.object.factoids;

	if (typeof db[key] === "undefined") {
		throw new Error("`"+key+"` was not a factoid.");
	}
	delete db[key];
	this.db.activity();
	return true;
};


JsonServer.prototype.clean = function() {
	var db = this.db.object.factoids, j, i;
	for (i in db) {
		if (db.hasOwnProperty(i)) {
			if (typeof db[i].alias !== "undefined") {
				for (j in db[i]) {
					if (db[i].hasOwnProperty(j)) {
						if (j !== "alias") delete db[i][j];
					}
				}
				continue;
			}
			if (typeof db[i].value !== "undefined") {
				for (j in db[i]) {
					if (db[i].hasOwnProperty(j)) {
						if (j !== "value" && j !== "popularity") delete db[i][j];
						if (j !== "value") delete db[i][j];
					}
				}
				continue;
			}
			delete db[i];
		}
	}
	this.db.activity();
};
