/**
 * Load controllers, models, services etc
 */

var Promise = require('Bluebird'),
	fs 	 = require('fs'),
	path	 = require('path'),
	Bluebird = require('Bluebird'),
	lodash	 = require('lodash'),
	async	 = require('async'),
	request	 = require('request');

// global config object
global.light = { config: {}}

// get all modules in a directory
function getDirModules(dirPath, moduleName, ignoreFiles) {
	var ignoreFiles = ignoreFiles || [];
	var moduleName = moduleName || "modules";
	return new Bluebird(function(resolve, reject){
		var modules = {}
		fs.readdir(dirPath, function(err, files) {
			if (err) return reject("Error occurred while trying to load " + moduleName + " from dir " + dirPath + " " + err)
		    
		    // remove any file that matches the ignore file list
			// also ignore directories
		    files = files.filter(function(file){
		    	var ok = true
		    	ignoreFiles.forEach(function(f) {
		    		ok = (file.indexOf(f) === -1 && file.indexOf('.js') !== -1) ? true : false
		    	});
		    	return ok;
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
					function(config, controllers, models, services){
						global.light.config = config;
						global.controllers = controllers;
						global.models = models;
						global.services = services;
						global._ = lodash;
						global.async = async;
						global.request = request

						// add nunjucks view helper
						// expects view helper file to be in services folder
						if (nunjucksEnv) {
							nunjucksEnv.addGlobal('helper', global.services.view_helper)
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
			}

		], function(err, result){
			if (err) throw new Error(err);
			return resolve()
		})
	});
}
