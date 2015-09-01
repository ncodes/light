var express    	= require('express');       
var app        	= express();                
var nunjucks  	= require('nunjucks'); 
var morgan 		= require('morgan');
var con 		= require('consolidate');
var api			= require('./api');
var cookieParser = require('cookie-parser');
var session = require('express-session');	

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

	var sess = {
  		secret: "mysecret",
  		saveUninitialized: false,
  		resave: false,
  		cookie: {}
	}
	
	if (app.get('env') === 'production') {
  		sess.cookie.secure = true;
	}

	// define template
	app.use(express.static(__dirname + '/assets'));
	app.use(cookieParser(light.config.cookSessSecret))
	app.use(session(sess))

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