/**
 * Load controllers, models, services etc
 */

var Promise = require('Bluebird'),
	fs 	 = require('fs'),
	path	 = require('path'),
	Bluebird = require('Bluebird'),
	lodash	 = require('lodash'),
	async	 = require('async'),
	bodyParser 	= require('body-parser');
	request	 = require('request');

// global config object
global.light = { config: {}}

// get all modules in a directory
function getDirModules(dirPath, moduleName, ignoreFiles) {
	
	var ignoreFiles = ignoreFiles || ['gitignore','gitkeep'];
	var moduleName = moduleName || "modules";
	
	return new Bluebird(function(resolve, reject){
		
		// holds modules in current directory
		var modules = {}
		
		// read contents in directory
		fs.readdir(dirPath, function(err, files) {
			
			if (err) return reject("Error occurred while trying to load " + moduleName + " from dir " + dirPath + " " + err)
		    
		    // remove any file that matches the ignore file list
			// also ignore directories. Also ignore files with _ prefix
		    files = files.filter(function(file){
		    	return file.match(/[.]{1}js$/) && lodash.indexOf(ignoreFiles, file) === -1 && file[0] != "_"
		    });
		   
		    // load module
		    files.forEach(function(file){
    			var m = require('.' + dirPath + '/' + file)
		    	var modParse = path.parse(file)
		    	modules[modParse.name] = m
		    });

		    resolve(modules)
		});
	});
}

module.exports = function (app, nunjucksEnv) {
	return new Promise(function(resolve, reject){
		async.series([

			// load modules
			function LoadModules(done) {
				Promise.join(

					getDirModules('./app/config', 'config', ['routes.js']),
					getDirModules('./app/controllers', 'controllers'),
					getDirModules('./app/models', 'models'),
					getDirModules('./app/services', 'services'),
					getDirModules('./app/policies', 'policies'),

					function(config, controllers, models, services, policies){
						
						global.light.config = config;
						global.controllers = controllers;
						global.models = models;
						global.services = services;
						global.policies = policies;
						global._ = lodash;
						global.async = async;
						global.request = request
						
						// add nunjucks view helper
						// expects view helper file to be in services folder
						if (nunjucksEnv) {
							nunjucksEnv.addGlobal('helper', global.services.view_helper || {})
						}

						done(null, true)
				})
			},

			// load environment config and extend existing config
			function ExtendConfig(done) {

				process.env.NODE_ENV = process.env.NODE_ENV || "development"

				// if NODE_ENV environment is set, find the current environment specific config file and
				// use extend light.config with this new file
				if (process.env.NODE_ENV) {
					getDirModules('./app/config/env', 'envConfigModules').then(function(envConfigModules){
						var currentEnvConfig = envConfigModules[process.env.NODE_ENV];
						_.extend(light.config, currentEnvConfig)
						return done(null, true)
					}).catch(function(err){
						return done(err)
					});
				} else {
					return done(null, true)
				}
			},

			// load middlewares. Middlewares and their load order must
			// be defined in config/http.js
			function LoadMiddlewares(done) {

				if (light.config.http) {
					var executionOrder = light.config.http.order || [ "bodyParser" ];
					var middlewares = light.config.http.middlewares || {};
					executionOrder.forEach(function(name){
						switch (name) {
							
							case "bodyParser": // bodyParser (middleware is usually not defined in http.middlewares)
								app.use(bodyParser.urlencoded({ extended: true }));
								app.use(bodyParser.json());
								break;

							default:
								if (middlewares[name]) {
									app.use(middlewares[name])
								}
						}
					})
				}
				done(null, true)
			},

			// call bootstrap module. Pass `done` to it. 
			// if `done` is not called, server doesn't start
			function Bootstrap(done) {
				if (light.config.bootstrap || lodash.isFunction(light.config.bootstrap)) {
					light.config.bootstrap(function(){ done(null, true); })
					delete light.config.bootstrap;
				}
			}

		], function(err, result){
			if (err) throw new Error(err);
			return resolve()
		})
	});
}
