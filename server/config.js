var fs = require('fs');
var path = require('path');


module.exports = {

	appName: 'com.voncrankcyclingapp',
	id: 'com.voncrankcyclingapp',
	gcmServerApiKey: process.env.GCM_SERVER_API_KEY || 'AIzaSyDSgn1mqTju61LCfwmMDNh3WGWLTTyBTf0',
	apnsCertData: readCredentialsFile('apnsCert.pem'),
	apnsKeyData:readCredentialsFile('apnsKey.pem'),
	
	stripeAPIKey: process.env.STRIPE_API_KEY || 'sk_test_szwGPT6h5YU5a9KJZvIu0KPo',

	admin: {
		name:      process.env.ADMIN_NAME     || 'Shaan Administrator',
		email:     process.env.ADMIN_EMAIL    || 'admin@voncrank.com',
		password:  process.env.ADMIN_PASSWORD || 'shaan123',
		telephone: process.env.ADMIN_PHONE    || '+123455678'
	}  
}

function readCredentialsFile(name) {
	return fs.readFileSync(
		path.resolve(__dirname,'../', 'credentials', name),
		'UTF-8'
		);
}