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

commands[linkCommand].apply(null, linkArgs);

function init(){
	var file = fs.createWriteStream("./links.json", {flags: "wx"});

	file.on("error", function(err){
		console.log(err);	
	});

	file.on("open", function(err){
		file.write("{}");	
	});
}

function link(sourcePath, linkPath){
	fs.symlink(sourcePath, linkPath, function(err){
		if(err){
			console.log("Error: this link seems to already exist: " + linkPath);	
		}	
	})

	var linkFile = path.dirname(sourcePath) + "/links.json";
	
	fs.readFile(linkFile, {encoding: "utf8"}, function(err, data){
		var links = JSON.parse(data);
		var sourcePathAbsolute = path.resolve(sourcePath);
		var linkPathAbsolute = path.resolve(linkPath)

		if (!(sourcePathAbsolute in links) || links[sourcePathAbsolute].constructor !== Array){
			links[sourcePathAbsolute] = []; 
		}

	  if (links[sourcePathAbsolute].indexOf(linkPathAbsolute) === -1){
			links[sourcePathAbsolute].push(linkPathAbsolute);					 
	  }	

		fs.writeFile(linkFile, JSON.stringify(links), function(err){
			if (err){
				console.log(err);	
			}	
		});
	});
}

function rmlink(sourcePath, linkPath){
	var linkFile = path.dirname(sourcePath) + "/links.json";

	fs.readFile(linkFile, {encoding: 'utf8'}, function(err, data){
		var links = JSON.parse(data);
		var sourcePathAbsolute = path.resolve(sourcePath);

		if (linkPath != null){
			var linkPathAbsolute = path.resolve(linkPath);		
		}

		rm(links, sourcePathAbsolute, linkPathAbsolute);

		fs.writeFile(linkFile, JSON.stringify(links), function(err){
			if (err){
				console.log(err);	
			}	
		});
	});

	function rm(obj, key, prop){
		if (prop != null){	
			fs.unlink(prop, function(err){
				if (err){
					console.log(err);	
				}
			});

			obj[key] = obj[key].filter(function(element){
				return element != prop;	
			});
		}
		else {
			obj[key].forEach(function(element){
				fs.unlink(element, function(err){
					if (err){
						console.log(err);	
					}
				})	
			});	
	
			delete obj[key];
		}
	}
}

function sync(linkFilePath){
	fs.readFile(linkFilePath, {encoding: "utf8"}, function(err, data){
		var links = JSON.parse(data);

		for (sourcePath in links){
			links[sourcePath].forEach(function(element){
				link(sourcePath, element);
			});	
		}
	});
}


