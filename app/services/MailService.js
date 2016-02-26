/**
 * Mail Service contains smtp functionalities
 */

var MailService = {},
	mailin = require("mailin");
module.exports = MailService;


/**
 * Start SMTP server
 * @param  {options} option options to configure server
 * @return {[type]}        
 */
MailService.serve = function (options) {

	var options = options || {};
	options.port = options.port || 25;

	mailin.start({
		port: options.port,
	  	disableWebhook: true 
	});

	mailin.on('startMessage', function (connection) {
		controllers.mail.connected(connection);
	})

	mailin.on('error', function (err) {
		controllers.mail.error(err);
	})

	/* Event emitted after a message was received and parsed. */
	mailin.on('message', function (connection, data, content) {
	  	controllers.mail.inbound(data, connection);
	});
}