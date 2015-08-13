#!/usr/bin/env node

var fs = require("fs");
var path = require("path");


var shellArgs = process.argv.slice(2);
var linkCommand = shellArgs[0];
var linkArgs = shellArgs.slice(1);

var commands = {
	init: init,
	link: link,
	rmlink: rmlink,
	sync: sync
}; 

// Run autolink with command arguments
(function () {
	if (!commands.hasOwnProperty(linkCommand)){
		console.log("Error: unknown command");	
		return;
	}	

	commands[linkCommand].apply(null, linkArgs);
})();

// Initialize an linkFile in current directory
// A linkFile keeps track of the links made by a user
// The structure of a linkFile: {sourcePathAbsolute: [linkPathAbsolute]}
function init(){
	var file = fs.createWriteStream("./links.json", {flags: "wx"});

	file.on("error", function(err){
		console.log(err);	
	});

	file.on("open", function(err){
		file.write("{}");	
	});
}

// Create a symbolic link
function link(sourcePath, linkPath){
	fs.symlink(sourcePath, linkPath, function(err){
		if (err){
			console.log(err);
			return;
		}
	
		var linkFile = path.dirname(sourcePath) + "/links.json";
		
		fs.readFile(linkFile, {encoding: "utf8"}, function(err, data){
			var links = JSON.parse(data);
			var sourcePathAbsolute = path.resolve(sourcePath);
			var linkPathAbsolute = path.resolve(linkPath)

			// Make a new entry for a sourcePathAbsolute in linkFile if one does not exist
			if (!(links.hasOwnProperty(sourcePathAbsolute)) || links[sourcePathAbsolute].constructor !== Array){
				links[sourcePathAbsolute] = []; 
			}

			// Add linkPathAbsolute to sourcePathAbsolute array in linkFile if one does not exist
			if (links[sourcePathAbsolute].indexOf(linkPathAbsolute) === -1){
				links[sourcePathAbsolute].push(linkPathAbsolute);					 
			}	

			fs.writeFile(linkFile, JSON.stringify(links), function(err){
				if (err){
					console.log(err);	
				}	
			});
		});
	});
}

// Remove a symbolic link if one exists in the linkFile in the sourcePath's directory
function rmlink(sourcePath, linkPath){
	var linkFile = path.dirname(sourcePath) + "/links.json";

	fs.readFile(linkFile, {encoding: 'utf8'}, function(err, data){
		var links = JSON.parse(data);
		var sourcePathAbsolute = path.resolve(sourcePath);

		if (typeof linkPath !== "undefined"){
			var linkPathAbsolute = path.resolve(linkPath);		
		}

		rm(links, sourcePathAbsolute, linkPathAbsolute);

		fs.writeFile(linkFile, JSON.stringify(links), function(err){
			if (err){
				console.log(err);	
			}	
		});
	});

	// Handles removal of link in filesystem and in linkFile
	function rm(obj, key, prop){
		// Remove specific symbolic link from a sourcePathAbsolute entry
		if (typeof prop !== "undefined"){	
			fs.unlink(prop, function(err){
				if (err){
					console.log(err);	
					return;
				}
			
				obj[key] = obj[key].filter(function(element){
					return element != prop;	
				});
			});
		}
		// Remove all symbolic links from a sourcePathAbsolute entry along with the entry itself
		else {
			var errors = [];

			obj[key].forEach(function(element){
				fs.unlink(element, function(err){
					if (err){
						console.log(err);	
						errors.push(err);
					}
				})	
			});	
			
			if (errors.length === 0){
				delete obj[key];
			}
			else {
				console.log("Errors: Did not remove links");
			}
		}
	}
}

// Synchronize a filesystem with the symbolic links specified at linkFilePath -- a links.json file
function sync(linkFilePath){
	if (typeof linkFilePath === "undefined"){
		console.log("Error: No link file path provided");
		return;
	}

	fs.readFile(linkFilePath, {encoding: "utf8"}, function(err, data){
		if (err){
			console.log(err);
			return;
		}

		var links = JSON.parse(data);

		for (sourcePath in links){
			links[sourcePath].forEach(function(element){
				link(sourcePath, element);
			});	
		}
	});
}


