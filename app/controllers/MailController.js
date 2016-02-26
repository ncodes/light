/**
 * MailController performs mail operations
 */

var Controller = {}; module.exports = Controller;

/**
 * Handles incoming mail
 * @param  {object} mailObj contains information about the mail
 * @return {object} 
 */
Controller.inbound = function(mailObj) {
	console.log("Process incoming")
}

/**
 * Usually called each time a new connection is received
 * @param  {object} conn connection information
 * @return {object}      
 */
Controller.connected = function(conn) {
	console.log("New connection received")
}

/**
 * Called whenever an error occurs 
 * @param  {object} err error information
 * @return {object}
 */
Controller.error = function(err) {
	console.log("Error: processing")
}