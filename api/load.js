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
	request	 = require('request'),
	morgan = require('morgan'),
	log4js = require('log4js');

// global config object
global.light = { config: {}}
var Loader = {}

// get all modules in a directory
// returns an object of directories associated with all contained module
// e.g { dirName: { moduleFileA: module, moduleFileB: module }}
Loader.getDirModules = function (dirPath, moduleName, ignoreFiles) {
	
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

// filter out keys that do not have a surfix.
// if removeSurfix is set, it will remove the surfix from the key. (defaut: true)
// if lowerCaseKey is set, it will convert final keys that matched the surfix to lowercase (default: true)
Loader.filterObjectBySurfix = function (flatObject, surfix, removeSurfix, lowerCaseKey) {
	var removeSurfix = (removeSurfix === undefined) ? true : removeSurfix;
	var lowerCaseKey = (lowerCaseKey === undefined) ? true : lowerCaseKey;
	var newObj = {};
	lodash.keys(flatObject).forEach(function(key){
		if (lodash.endsWith(key, surfix)) {
			var val = flatObject[key];
			key = (!removeSurfix) ? key : key.replace(new RegExp(surfix + "$"), "");
			key = (!lowerCaseKey) ? key : key.toLowerCase();
			newObj[key] = val;
		}
	});
	return newObj;
}

module.exports = function (app, nunjucksEnv) {
	return new Promise(function(resolve, reject){
		async.series([

			// add logger
			function AddLogger(done) {
				app.use(morgan('dev'));
				var logger = log4js.getLogger();
				light.log = logger
  				done()
			},

			// load modules
			function LoadModules(done) {
				Promise.join(

					Loader.getDirModules('./app/config', 'config', ['routes.js']),
					Loader.getDirModules('./app/controllers', 'controllers'),
					Loader.getDirModules('./app/models', 'models'),
					Loader.getDirModules('./app/services', 'services'),
					Loader.getDirModules('./app/policies', 'policies'),
					Loader.getDirModules('./app/responses', 'responses'),

					function(config, controllers, models, services, policies, responses){
						
						global.light.config = config;
						global.controllers = Loader.filterObjectBySurfix(controllers, "Controller");
						global.models = models;
						global.services = Loader.filterObjectBySurfix(services, "Service");
						global.policies = Loader.filterObjectBySurfix(policies, "Policy");
						global._ = lodash;
						global.async = async;
						global.request = request
						
						// add nunjucks view helper
						// expects view helper file to be in services folder
						if (nunjucksEnv) {
							nunjucksEnv.addGlobal('helper', global.light.config.view_helpers || {})
						}

						// add custom responses to response object
						app.use(function(req, res, next){
							_.extend(res, responses)
							next();
						})

						done(null, true)
				})
			},

			// load environment config and extend existing config
			function ExtendConfig(done) {

				process.env.NODE_ENV = process.env.NODE_ENV || "development"

				// if NODE_ENV environment is set, find the current environment specific config file and
				// use extend light.config with this new file
				if (process.env.NODE_ENV) {
					Loader.getDirModules('./app/config/env', 'envConfigModules').then(function(envConfigModules){
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
			},

			// expose response and request in global object
			function ExposeReqResInLightObject(done) {
				app.use(function(req, res, next){
					light._req = req;
					light._res = res;
					next()
				});
				done()
			}

		], function(err, result){
			if (err) throw new Error(err);
			return resolve()
		})
	});
}
