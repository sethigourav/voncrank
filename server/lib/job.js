var Job = function(){
	
	var Events = require('./events');

	Status = {

		INITIAL:'INITIAL',
		ASSIGNED:'ASSIGNED',
		CONFIRMED:'CONFIRMED',		
		POSTPONED:'POSTPONED',
		DECLINED:'DECLINED',
		COMPLETED:'COMPLETED'
	};

	this.assignToAMechanic = function(ctx, job, next){

		var app = require('../server');
		var loopback = require('loopback');

		var Account = app.models.Account;	
		console.log('Listening assignJobToMechanic ');
		
		var jobLocation = new loopback.GeoPoint(job.location);

		Account.findOne({ where:{
								available:{ neq:false }, 
								type:'Mechanic',
								location: {
							      near: jobLocation,
							      maxDistance: 100,
							      unit: 'kilometers'
							    }
							}
						}, function(err, mechanic){

			if(!!mechanic){
				console.log( 'mechanic found ' + JSON.stringify(mechanic));				
				job.updateAttributes({ status: this.Status.ASSIGNED, mechanicId: mechanic.id }, function(err, done){

					console.log(done);
					if(done){
						console.log('Assigned job to mechanic');
						console.log(Events);											
						Events.notifyMechanicOfAssignedJob(mechanic,job);
					}
				});
			}else{
				console.log('No nearby mechanic available . mechanic ' +JSON.stringify(mechanic))
			}			
		});

		next();
	}
}

module.exports  = new Job();


