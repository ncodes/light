/**
 * Helper functions
 */

 module.exports = {

 	// render a static view file
 	static: function(viewName, data) {
 		var data = data || {}
	 	return function(req, res, next) {
			var flashData = req.flash() || {};
	 		_.extend(data, flashData)
	 		res.show(viewName, flashData)
	 	}
	 }
}