/**
 * Helper functions
 */

 module.exports = {

 	// render a static view file
 	static: function(viewName, data) {
 		var data = data || {}
	 	return function(req, res) {
			var flashData = req.flash() || {};
	 		_.extend(data, flashData)
	 		return res.show(viewName, flashData)
	 	}
	 }
}