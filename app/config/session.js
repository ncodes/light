/**
 * Session settings
 */

module.exports = {
	
 	// session secret
 	secret: process.env.SESSION_SECRET || "secret",

 	// see link for doc: https://github.com/expressjs/session#saveuninitialized
 	saveUninitialized: false,

 	// see link for doc: https://github.com/expressjs/session#resave
 	resave: false

}