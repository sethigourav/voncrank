

var Config = require('../config');
var stripe = require('stripe')(Config.stripeAPIKey);

module.exports = {

	JOB_ASSIGNED: 'JOB_ASSIGNED',
	JOB_ACCEPTED: 'JOB_ACCEPTED',
	JOB_COMPLETED: 'JOB_COMPLETED',

	_sendNotificationToUser: function(userId,alert,payload){

		var app = require('../server');
		
		var	PushModel = app.models.push;
		var Notification = app.models.notification;

		payload = payload || {};
		payload.expirationInterval = 3600; // Expires 1 hour from now.
	    payload.badge = 1;
	    payload.sound='ping.aiff';
	    payload.alert = alert;
	    payload.message = alert
	    
		var note = new Notification(payload);
		console.log(payload);

		PushModel.notifyByQuery({userId: userId }, note, function (err) {

			if (err) {
				console.error('Cannot notify %j: %s', userId, err.stack);
				return;
			}
			console.log('pushing notification to %j', userId);
		});
	},

	notifyMechanicOfAssignedJob: function(mechanic,job){

		this._sendNotificationToUser(mechanic.id,'You have a new job request',{ 'ji': job.id })
		console.log(' Notfied notifyMechanicOfAssignedJob... ');		
	},

	notifyCustomerOfAcceptedJob: function(customerId,job){

		Account.findById(job.mechanicId, function(err, mechanic){

			var message =  mechanic.name + ' has accepted your job request';

			this._sendNotificationToUser(customerId, message, {'mi': job.mechanicId });
			console.log('Notified customer of accepted job');

		});		
	},

	updateStripeCustomerId: function(accountId,stripeCustomerId){

		var app = require('../server');
		
		var	Account = app.models.Account;

		Account.findById(accountId, function(err, account){

			account.updateAttributes({ stripeCustomerId: stripeCustomerId }, function(err, done){
				console.log('Updated stripeCustomerId from API');
			});
		});
	},

	addCardForStripeCustomer: function(stripeCustomerId, card){

		card.object = 'card'
		console.log(card)
		stripe.customers.createSource(
			stripeCustomerId,
			{source: card},
			function(err, card) {
				if(err){
					console.log('Error adding card source for stripe Customer')
					console.log(err);
				}
			});
	},

	chargeCard: function(stripeCustomerId, amount,currency,cb){

		stripe.customers.retrieve(
			stripeCustomerId,
			function(err, customer) {
				if(err)
					return cb("There's some error while retrieving account info from stripe");

				console.log(customer);

				stripe.charges.create({
					amount: amount,
					currency: currency || "gbp",
          			//source: "tok_190VVjGUVtBBO2Zhw9VOojt6", // obtained with Stripe.js
          			description: "Voncrank service Charge",
          			customer: customer.id
          		}, function(err, charge) {
          			if(err){
          				cb(err);
          			}
          			else{
          				cb(null, charge);
          			}
          		});
			});

		/*s */
	}
};







