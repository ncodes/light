/**
 * Helper functions for routes
 */

 module.exports = {

 	// render a static view file
 	static: function(viewName, data) {
	 	return function(req, res, next) {
	 		res.render(viewName, data)
	 	}
	 }
}