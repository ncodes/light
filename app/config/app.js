/**
 * App settings
 */

module.exports = {

	// xodus server host address
 	xodusServerHost: 'http://localhost:3000',

 	// back office client id
 	backOfficeClientID: process.env.BO_CLIENT_ID || "backoffice",

 	// back office client secret
 	backOfficeClientSecret: process.env.BO_CLIENT_SECRET || "backofficesecret",
 	
}