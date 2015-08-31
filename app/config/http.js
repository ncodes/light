/**
 * Define and load middlewares. 
 * Add new middleware to `middlewares` object and specify their order
 * of execution in `order` array. Only middlewares in the `order` array
 * will be executed
 */

var expressValidator = require('express-validator');

module.exports = {

	// define the middlewares in your preferred order of execution.
	// middlewares must be defined in `this.middleware` object
	order: [
		"bodyParser",
		"formValidation"
		// "hello"
	],

	// define middleware here.
	// Add middleware by name to the `this.order` object 
	// according to preferred order of execution
	middlewares: {

		// example middleware
		// hello: function(req, res, next) {
		// 	console.log("Hello! I am a middleware!")
		// 	next()
		// }

		// form validation
		// repo: https://github.com/ctavan/express-validator
		formValidation: expressValidator()
	}
}