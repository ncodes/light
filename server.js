var express    	= require('express');       
var app        	= express();                
var bodyParser 	= require('body-parser');
var nunjucks  	= require('nunjucks'); 
var morgan 		= require('morgan');
var con 		= require('consolidate');
var api			= require('./api')			

// configure app
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + '/assets'));
app.use(morgan('combined'))
env = nunjucks.configure('views', {
    autoescape: true,
    watch: true,
    express: app
});

// load api (controllers, models, services, view helpers etc)
api.load(app, env).then(function(){
	
	var routes	= require('./app/config/routes');
	
	// set port
	var port = process.env.PORT || 1337; 
	
	// Register routes
	app.use('/', routes.root);

	// start server
	app.listen(port);
	console.log('Server started on port:' + port);
});