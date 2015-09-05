/**
 * View helper functions
 */

module.exports = {
	
	log: function(m){
		light.log.debug(m)
	},

	// extracts the first error message from form validation error object using its parameter name
	// example error object: [ { param: 'email', msg: 'Please provide your email.', value: '' } ]
	getFieldErrMsg: function(errors, param) {
		var errObj = _.findWhere(errors, { 'param': param });
		var msg = _.result(errObj, 'msg');
		return (msg) ? msg : '';
	},

	// http helper
	http: {
		getReq: function() {
			return light._req;
		}
	},

	// session helper (only read-only access)
	session: {
		
		// get session data by key
		get: function(key) {
			return light._req.session[key];
		},

		// get flash data by key
		getFlash: function(key) {
			if (light._req.flash == undefined) throw new Error("flash module not installed");
			return light._req.flash(key)
		}
	}
}