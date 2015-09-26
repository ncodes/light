/**
 * Cookie settings
 */

module.exports = {

	// cookie secret
 	secret: process.env.COOKIE_SECRET || "secret",

 	// cookie max age
 	maxAge: 3600000
}