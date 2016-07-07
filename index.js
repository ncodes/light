var Light 		= {};
var nconf 		= require('nconf');
var express    	= require('express');       
var app        	= express();                
var nunjucks  	= require('nunjucks'); 
var morgan 		= require('morgan');
var api			= require('./api');
var path 		= require("path");
module.exports = Light;

Light.on = function(appDir, cb) {

	var lightConfigPath = path.join(appDir, "light.json")

	// load light configuration
	nconf.argv().env().file(lightConfigPath);
	nconf.set("appDir", appDir);
	var appConfigDir = path.join(appDir, nconf.get("_light:directories:config"));

	// setup nunjucks template
	var env = nunjucks.configure(path.join(appDir, 'views'), {
	    autoescape: nconf.get("_light:nunjucks:escape"),
	    watch: nconf.get("_light:nunjucks:watch"),
	    express: app,
	    tags: {
		    variableStart: nconf.get("_light:nunjucks:variableStart") || "{{",	
		    variableEnd: nconf.get("_light:nunjucks:variableEnd") || "}}"
	  	}
	});

	api.on(nconf, app, env).then(function(){

		// define template
		app.use(express.static(path.join(appDir, "assets")));

		try {
			var routes	= require(path.join(appConfigDir, "routes"));
		} catch(e) {
			log.error(path.join(appConfigDir, "routes") + ":", e);
			return cb(e, null);
		}
		
		// Register routes
		app.use('/', routes.root);

		return cb(null, app)

	}).catch(function(err){
		log.error(err.message)
		return cb(err)
	});
}