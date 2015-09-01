/**
 * Not found response
 */

 module.exports = function (data, options) {
 	var req = light._req;
 	var res = light._res;
 	
 	res.status(404)
	
	// render default 404 page 	
	// res.notFound()
 	if (!data) {
 		return res.render('404.html')
 	}

 	// render custom view, and send data
 	// res.notFound({ err: "msg" }, "/my404.html")
 	if (data && options && _.isString(options)) {
 		return res.render(options, data)
 	}

 	// res.notFound({ err: "msg" })
 	return res.json(data)
 }