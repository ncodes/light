/**
 * Cookie settings
 */

module.exports = {

	// cookie secret
 	secret: process.env.COOKIE_SECRET || "secret",

 	// cookie max age
 	maxAge: 3600000,

 	// whether to use secured cookie for https
 	securedCookie: (process.env.SECURED_COOKIE) ? true : false
}