var express    	= require('express');       
var app        	= express();                
var nunjucks  	= require('nunjucks'); 
var morgan 		= require('morgan');
var con 		= require('consolidate');
var api			= require('./api')			

// define template
app.use(express.static(__dirname + '/assets'));
env = nunjucks.configure('views', {
    autoescape: true,
    watch: true,
    express: app,
    tags: {
	    variableStart: '{{>',
	    variableEnd: '}}'
  	}
});

// load api (controllers, models, services, view helpers etc)
api.load(app, env).then(function(){

	// configure app
	var routes	= require('./app/config/routes');
	
	// set port
	var port = process.env.PORT || 1337; 
	
	// Register routes
	app.use('/', routes.root);

	// start server
	app.listen(port);
	console.log('Server started on port:' + port);
});