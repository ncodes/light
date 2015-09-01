/**
 * View helper functions
 */

module.exports = {
	
	log: function(m){
		light.log.debug(m)
	},

	// session helper (only read-only access)
	session: {
		get: function(key) {
			return light._req.session[key];
		}
	}
}