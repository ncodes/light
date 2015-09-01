/**
 * Database settings
 */

module.exports = {
	
	redis: {

		// hostname
	 	host: process.env.REDIS_HOST || 'localhost',

	 	// port
	 	port: process.env.REDIS_PORT ||  6379
	}
}