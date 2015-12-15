var express    	= require('express');       
var app        	= express();                
var nunjucks  	= require('nunjucks'); 
var morgan 		= require('morgan');
var api			= require('./api');
var yargs 		= require('yargs').argv;

// configure nunjucks 
var env = nunjucks.configure('views', {
    autoescape: true,
    watch: true,
    express: app,
    tags: {
	    variableStart: '{{>',	// replace to "{{" if you are not using angular in your view
	    variableEnd: '}}'
  	}
});

// load api (controllers, models, services, view helpers etc)
api.load(app, env).then(function(){
	
	// define template
	app.use(express.static(__dirname + '/assets'));

	// configure app
	var routes	= require('./app/config/routes');
	
	// set port
	var port = yargs.port || process.env.PORT || 1337; 
	
	// Register routes
	app.use('/', routes.root);

	// handle 404 errors
	app.use(function(req, res, next) {
		light.log.error("Page not found");
		res.notFound();
	});

	// delegate error handling to custom error handler
	app.use(function(err, req, res, next) {
		light.log.error(err);
		res.serverError(err);
	});

	// start server
	app.listen(port);
	console.log('Server started on port:' + port);
});

module.exports = app;