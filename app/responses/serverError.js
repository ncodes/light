/**
 * Extracted from sails.js
 *
 * 500 (Server Error) Response
 *
 * Usage:
 * return res.serverError();
 * return res.serverError(err);
 * return res.serverError(err, 'some/specific/error/view');
 *
 * NOTE:
 * If something throws in a policy or controller, or an internal
 * error is encountered, Sails will call `res.serverError()`
 * automatically.
 */
module.exports = function serverError (data, options) {

	// Get access to `req`, `res`, & `sails`
  	var req = this.req;
  	var res = this.res;
  	console.log(this)
  	res.status(500)

  	if (!data && !options) {
  		return res.render('500.html');
  	}

  	// log error
  	light.log.error(data)

  	// error: Error
  	if (data instanceof Error) {

  		// when data is an object
  		if (_.isPlainObject(options)) {

  			// if option.view is set, render error in it
  			if (options.view && _.isString(options.view)) {
  				return res.render(options.view);

  			} else {
  				return res.render('500.html');
  			}
  			
  		} else {

  			// if string, it should be a view
  			if (_.isString(options)) {
  				return res.render(options);

  			} else {
  				return res.render('500.html');
  			}
  		}
  	}

  	// error: json
  	if (_.isPlainObject(data)) { 
  		return res.json(data)
  	}
}

