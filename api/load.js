/**
 * Load controllers, models, services etc
 */

var Promise = require('Bluebird'),
	fs 	 			= require('fs'),
	path	 		= require('path'),
	lodash	 		= require('lodash'),
	async	 		= require('async'),
	bodyParser 		= require('body-parser');
	request	 		= require('request'),
	morgan 			= require('morgan'),
	log4js 			= require('log4js'),
	cookieParser 	= require('cookie-parser'),
	session 		= require('express-session'),
	RedisStore 		= require('connect-redis')(session),
	flash 			= require('connect-flash'),
	util 			= require('util');

// global config object
global.light = { config: {}}

var Loader = {}

// get all modules in a directory
// returns an object of directories associated with all contained module
// e.g { dirName: { moduleFileA: module, moduleFileB: module }}
Loader.getDirModules = function (dirPath, moduleName, ignoreFiles) {
	
	var ignoreFiles = ignoreFiles || ['gitignore','gitkeep'];
	var moduleName = moduleName || "modules";
	
	return new Promise(function(resolve, reject){
		
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
// if camelCaseKey is set, it will convert final keys that matched the surfix to camel case (default: true)
Loader.filterObjectBySurfix = function (flatObject, surfix, removeSurfix, camelCaseKey) {
	var removeSurfix = (removeSurfix === undefined) ? true : removeSurfix;
	var camelCaseKey = (camelCaseKey === undefined) ? true : camelCaseKey;
	var newObj = {};
	lodash.keys(flatObject).forEach(function(key){
		if (lodash.endsWith(key, surfix)) {
			var val = flatObject[key];
			key = (!removeSurfix) ? key : key.replace(new RegExp(surfix + "$"), "");
			key = (!camelCaseKey) ? key : lodash.camelCase(key);
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

			// load configurations
			function LoadConfig(done) {
				Loader.getDirModules('./app/config', 'config', ['routes.js']).then(function(config){
					global.light.config = config;
					return done(null, true);
				}).catch(done);
			},

			// load environment config and extend existing config
			function ExtendConfig(done) {
				
				// if NODE_ENV environment is set, find the current environment specific config file and
				// use extend light.config with this new file
				if (app.get("env")) {
					Loader.getDirModules('./app/config/env', 'envConfigModules').then(function(envConfigModules){
						var currentEnvConfig = envConfigModules[app.get("env")];
						lodash.keys(currentEnvConfig).forEach(function(key){
							lodash.extend(light.config[key], currentEnvConfig[key])
						})
						return done(null, true)
					}).catch(function(err){
						return done(err)
					});
				} else {
					return done(null, true)
				}
			},

			// load modules
			function LoadModules(done) {
				Promise.join(

					Loader.getDirModules('./app/controllers', 'controllers'),
					Loader.getDirModules('./app/models', 'models'),
					Loader.getDirModules('./app/services', 'services'),
					Loader.getDirModules('./app/policies', 'policies'),
					Loader.getDirModules('./app/responses', 'responses'),

					function(controllers, models, services, policies, responses){
						
						global.controllers = Loader.filterObjectBySurfix(controllers, "Controller");
						global.models = models;
						global.services = Loader.filterObjectBySurfix(services, "Service");
						global.policies = Loader.filterObjectBySurfix(policies, "Policy");
						global._ = lodash;
						global.async = async;
						global.request = request;
						global.util = util;
						
						// add nunjucks view helper
						// expects view helper file to be in services folder
						if (nunjucksEnv) {
							var viewObj = light.config.view_helpers || {}
							nunjucksEnv.addGlobal('helper', viewObj);		// deprecated
							nunjucksEnv.addGlobal('view', viewObj);
						}

						// add custom responses to response object
						app.use(function(req, res, next){
							_.extend(res, responses)
							next();
						})

						done(null, true)
				})
			},

			// load middlewares. Middlewares and their load order must
			// be defined in config/http.js
			function LoadMiddlewares(done) {

				if (light.config.http) {
					
					var executionOrder = light.config.http.order || [ "bodyParser" ];
					var middlewares = light.config.http.middlewares || {};
					
					// session options
					var sessionOps = {
				  		secret: light.config.session.secret,
				  		saveUninitialized: light.config.session.saveUninitialized,
				  		resave: light.config.session.resave,
				  		cookie: {}
					}

					// in production: set cookie `secure` property to true
					if (app.get('env') === 'production') {
						light.log.debug("Alert!! Ensure https is enabled. Because session will not work in http connections")
				  		sessionOps.cookie.secure = true;
					}

					executionOrder.forEach(function(name){
						
						switch (name) {
							
							case "bodyParser": // bodyParser (middleware is usually not defined in http.middlewares)
								app.use(bodyParser.urlencoded({ extended: true }));
								app.use(bodyParser.json());
								break;

							case "cookieParser": 
								app.use(cookieParser(light.config.cookie.secret));
								break;

							case "session": 
								app.use(session(sessionOps))
								break;

							case "session-redis": 
								sessionOps.store = new RedisStore({
									host: light.config.database.redis.host,
									port: light.config.database.redis.port
								});
								app.use(session(sessionOps));
								break

							case "flash": 
								app.use(flash());

							default:
								// load all middlewares
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
