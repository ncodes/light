/**
 * Load controllers, models, services etc
 */

var Promise 		= require('bluebird'),
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
	util 			= require('util'),
	nconf 			= require('nconf'),
	bunyan 			= require('bunyan'),
	Logger			= require('./logger'),
	redisURL 		= require('redis-url');

// global config object
global.light = { config: {}, _config: {} }

var Loader = {}

// get all modules in a directory
// returns an object of directories associated with all contained module
// e.g { dirName: { moduleFileA: module, moduleFileB: module }}
Loader.getDirModules = function (dirPath, moduleName, ignoreFiles) {
	
	var ignoreFiles = ignoreFiles || ['gitignore','gitkeep'];
	
	return new Promise(function(resolve, reject){
		
		// holds modules in current directory
		var modules = {}
		
		// read contents in directory
		fs.readdir(dirPath, function(err, files) {
			
			if (err) {
				return reject({ 
					moduleName: moduleName,
					message: "Unable to load directory => " + dirPath
				});
			}
		    
		    // remove any file that matches the ignore file list
			// also ignore directories. Also ignore files with _ prefix
		    files = files.filter(function(file){
		    	return file.match(/[.]{1}js$/) && lodash.indexOf(ignoreFiles, file) === -1 && file[0] != "_"
		    });
		   
		    // load module
		    files.forEach(function(file){
    			var m = require(path.join(dirPath, file))
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

module.exports = function (lightConfig, app, nunjucksEnv) {
	return new Promise(function(resolve, reject){

		light._config = lightConfig.get();
		var appName = lightConfig.get("appName") || "LightApp";
		var appDir = lightConfig.get("appDir");
		var configDir = lightConfig.get("_light:directories:config");
		var fullConfigDir = path.join(appDir, configDir);

		async.series([

			// bunyan logger
			function LoadBunyanLogger(done) {
				var logs = [{ type: 'stdout', format: 'pretty', level: 'debug' }];
				Logger.setup(appName, logs)
				global.log = Logger.logger;
				done()
			},

			// add an express logger
			function AddLogger(done) {

				// do not add logger in test environment
				if (app.get("env") !== "test"){
					app.use(morgan('dev'));
				}
				
				var logger = log4js.getLogger();
				light.log = logger
  				done()
			},

			// load configurations
			function LoadConfig(done) {
				Loader.getDirModules(fullConfigDir, 'config', ['routes.js']).then(function(config){
					global.light.config = config;
					return done(null, true);
				}).catch(done);
			},

			// expose response and request in global object
			function ExposeReqResInLightObject(done) {
				app.use(function(req, res, next){
					light._req = req;
					light._res = res;
					next()
				});
				done();
			},

			// load specific environment configuration files 
			// from the '/config/env' directory and extend global config object.
			// This is optional feature. The '/config/env' directory need not to be provided.
			function ExtendConfig(done) {
				if (app.get("env")) {
					Loader.getDirModules(path.join(fullConfigDir, "env"), 'envConfigModules').then(function(envConfigModules){
						var currentEnvConfig = envConfigModules[app.get("env")];
						lodash.keys(currentEnvConfig).forEach(function(key){
							lodash.extend(light.config[key], currentEnvConfig[key])
						})
						return done(null, true)
					}).catch(function(err){
						// log warning and move on...
						log.warn("Light.ExtendConfig:", err.message)
						return done(null, true)
					});
				} else {
					return done(null, true)
				}
			},

			// load modules
			function LoadModules(done) {
				Promise.join(
					Loader.getDirModules(path.join(appDir, "app", "controllers"), "controllers"),
					Loader.getDirModules(path.join(appDir, "app", "models"), 'models'),
					Loader.getDirModules(path.join(appDir, "app", "services"), 'services'),
					Loader.getDirModules(path.join(appDir, "app", "policies"), 'policies'),
					Loader.getDirModules(path.join(appDir, "app", "responses"), 'responses'),

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

				}).catch(function(err){
					log.error("Light.LoadModules:", err.message)
					done(err, null)
				})
			},

			// load middlewares. Middlewares and their load order must
			// be defined in config/http.js
			function LoadMiddlewares(done) {

				if (light.config.http) {
					
					var executionOrder = light.config.http.order || [ "bodyParser" ];
					var middlewares = light.config.http.middlewares || {};
					
					// session options
					var config = light.config;
					var sessionOps = {
				  		secret: config.session.secret,
				  		saveUninitialized: config.session.saveUninitialized,
				  		resave: config.session.resave,
				  		cookie: { maxAge: config.cookie.maxAge || null }
					}

					// in production: set cookie `secure` property to true
					if (app.get('env') === 'production') {
						if (light.config.cookie.securedCookie) {
					  		sessionOps.cookie.secure = true;
					  		app.set('trust proxy', 1);
						}
					}
					
					executionOrder.forEach(function(name){
						
						switch (name) {
							
							case "bodyParser": // bodyParser (middleware is usually not defined in http.middlewares)
								app.use(bodyParser.urlencoded({ extended: true }));
								app.use(bodyParser.json({ limit: '10mb' }));
								break;

							case "cookieParser": 
								app.use(cookieParser(light.config.cookie.secret));
								break;

							case "session": 
								app.use(session(sessionOps))
								break;

							case "session-redis":

								// create redis connection
								var redisClient = redisURL.connect(light.config.database.REDIS_URL)
								redisClient.on("error", function (err) {
								    console.error("> RedisError:", err.message, err.code)
								    if (err.code === "NOAUTH") {
								    	console.error("  Ensure your redis database password is correct")
								    }
								    process.exit(-1)
								});
								sessionOps.store = new RedisStore({ client: redisClient });
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
				} else {
					log.warn("Light.Bootstrap:", "No bootstrap.js file in " , configDir)
					done();
				}
			},

			// modify res.render to not prepend view file extension when not present.
			// The extension to prepend can be set in light.config.app.viewExt or 'html' is used
			function PrependViewFieldExtension(done) {
				app.use(function(req, res, next){
					res.show = function (viewFileName, obj) {
						if (viewFileName.indexOf(".") === -1) {
							viewFileName = viewFileName += "." + (light.config.app.viewExt || "html")
						}
						return res.render(viewFileName, obj)
					}
					next()
				});
				done();
			}

		], function(err, result){
			if (err) {
				log.error("Light did not load correctly. exiting..")
				return reject(err)
			}
			return resolve()
		})
	});
}
