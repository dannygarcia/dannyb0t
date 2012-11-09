var Utils = require("util");
var File = require("fs");
var Path = require("path");


var _prototype = {
	filename: null,
	changed: false,
	loaded: false,
	collection: {},

	init: function(file){
		this.file = file;
		File.readFile(file, function (err, rawdata) {
		try {
			if (err) {
				throw err;
			}
			Utils.puts("Loaded file: "+Path.basename(file));
			var data = JSON.parse(rawdata);
			if (Object.keys(this.collection)) {
				for (var i in this.collection) {
					if (this.collection.hasOwnProperty(i)) {
						data[i] = this.collection[i];
					}
				}
			}
			this.collection = data;
			this.loaded = true;
		} catch (e) {
			Utils.puts("JSON Parse Error: "+e);
		}

	}.bind(this));

	process.on("exit", function() {
		if (this.changed) {
			this.flush();
		}
	}.bind(this));
	},

	activity:  function() {
		this.changed = true;

		if (this.timeout !== null) {
			clearTimeout(this.timeout);
		}

		if (!this.instantwrite) {
			this.timeout = setTimeout(function() {
				if (this.changed) {
					this.flush();
				}
			}.bind(this), this.wait);
		} else {
			if (this.changed) {
				this.flush();
			}
		}
	},
	flush: function(){
		var self = this;
		try {
			var write = JSON.stringify(this.collection, null, "\t");
			File.writeFile(this.file, write, function (err) {
				if (err) throw err;
				Utils.puts("Wrote file: " + Path.basename(self.file));
			});
			this.changed = false;
			return true;
		} catch (e) {
			Utils.puts("Cannot stringify data: "+e.name+": "+e.message);
			return false;
		}
	}

};

var db = function(){};
db.prototype = _prototype;
module.exports = db;
