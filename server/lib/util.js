
var Util = function(){

	var Config = require('../config');
	var stripe = require('stripe')(Config.stripeAPIKey);
	var Events = require('./events');

	this.error = function(message,status){

		var statusMap = require("http").STATUS_CODES;
		status = status || 500;
		var error = new Error();
		error.status = status;
		error.message = message || 'Error';
		error.code =  statusMap[status + ''];
		return error;
	};

	this.assignRoleToPrincipal = function (Role, roleName, principalId){

		Role.findOne({ where: { name: roleName }}, function(err, role){
			console.log('Creating principal for role ' + JSON.stringify(role))	
			var RoleMapping = Role.app.models.RoleMapping;
			if(role){
				role.principals.create({
					principalType: RoleMapping.USER,
					principalId: principalId
				}
				, 
				function(err, principal) {
					if (err) throw err;
					if(principal)
						console.log('Assigned %s role to  %s ', roleName, principalId);
				});
			}
		});	   
	};


	this.createStripeCustomer = function(accountId,email){

		stripe.customers.create(
			{ email: email },
			function(err, customer) {
			    if(customer){
			    	console.log('Updating StripeCustomerId %s for %s from API', customer.id,accountId);
			    	Events.updateStripeCustomerId(accountId,customer.id)
			    }
    		})
	}


	this.createStorageContainer = function(Container,name){

		Container.createContainer({name: name}, function(err, c){
			if(c)
				console.log('Assigned container %s to new user', name);
		});
	};

	this.createIfNotExists = function (model, data, created){

		created  = typeof created == 'function' ? created : function(){ }    
		model.count(function(err, count){
			if(count == 0){
				model.create(data,created);
			}
		});
	}

	this.executeSequentially = function(callbacks, last) {
		var results = [];
		function next() {
			var callback = callbacks.shift();
			if(callback) {
				callback(function() {
					results.push(Array.prototype.slice.call(arguments));
					next();
				});
			} else {
				last(results);
			}
		}
		next();
	}
}

module.exports = new Util()



