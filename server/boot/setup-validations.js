'use strict';

module.exports = function(app) {

	//Validation is delayed because we can finish creating default admin account
	setTimeout(function(){
		console.log('Setting up account validations...')
		var Account = app.models.Account;
		Account.validatesInclusionOf('type', {in: ['Mechanic', 'Customer'], message: "must be on of 'Customer' or 'Mechanic' only.Invalid type provided"});
		//Account.validatesInclusionOf('gender', {in: ['M', 'F'], message: "must be 'M' or 'F'"});
	},3000);
};