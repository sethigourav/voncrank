
var Util = require('../../server/lib/util.js')
var Events = require('../../server/lib/events')
var fs = require('fs');
module.exports = function(Job) {

	//Job.disableRemoteMethod('create', true);
	Job.disableRemoteMethod('upsert', true);
	Job.disableRemoteMethod('destroyById', true);

  Job.validate('status', function(err){//INITIAL,ASSIGNED,ACCEPTED,POSTPONED,DECLINED,COMPLETED
    var status = this.status || ''
    if(this.isNewRecord()){
      if(this.status != 'INITIAL' && this.status != ''){
        err();
      }
    }
  },{ message: 'Job/Order status is invalid.If it is supplied it must be set to INITIAL' });


  Job.observe('save', function logQuery(ctx, next) {      
      
      console.log('Current context: ' + JSON.stringify( ctx ));
      next();
  });
  
	Job.validate('serviceType', function(error){
		
    if(!
        [
          'Leisure Service',
          'Puncture Repair',
          'Commuter Service',
          'Pro Service',
          'Specific Service'
        ].includes(this.serviceType)
      )
        error();
	},{message: 'serviceType must be on of pre-defined types defined by admin.'});

	Job.assignments = function(jobId,mechanicId,status,cb) {
      
      var Account = Job.app.models.Account;
				
      Account.findById(mechanicId,{ "type": "Mechanic"}, function(err, inst){

      	console.log( 'mechanic exists:  ' + inst);
      	if(!!inst){      	    
      	 	if(!inst.available)
      	 		cb(Util.error('Mechanic is offline. mechanicId: ' + mechanicId, 400));
      	}else
      		cb(Util.error('Invalid mechanicId: ' + mechanicId, 400));      	
      });

      Job.findById(jobId, {}, function(err, inst){

      	console.log('found job inst:' + JSON.stringify(inst));
      	
      	if(!!inst)
      		switch (inst.status){
            case 'INITIAL':
              cb(Util.error('Job is currently not assigned to a mechanic.Can not modify status', 400));
              break;
      			case 'ACCEPTED':
              if(status == 'COMPLETED'){
                inst.updateAttributes({'mechanicId':mechanicId, 'status': status},function(err,inst){
                  return cb(null, 'Job status updated to '+ status);                  
                });
              }
      				cb(Util.error('Can not modify job status from ' + inst.status + ' to ' + status, 400));
 		  			break;
      			case 'ASSIGNED':
              if(status == 'ACCEPTED' || status == 'POSTPONED'){
                inst.updateAttributes({'mechanicId':mechanicId, 'status': status},function(err,inst){

                  if(!!inst){
                    Events.notifyCustomerOfAcceptedJob(inst.customerId, inst);
                    return cb(null, 'Job status updated to '+ status);                  
                  }                  
                });      				  
              }
              cb(Util.error('Can not modify job status from ' + inst.status + ' to ' + status, 400));
      				break;
      			case 'POSTPONED':
              if(status == 'ACCEPTED'){
                inst.updateAttributes({'mechanicId':mechanicId, 'status': status},function(err,inst){
                  return cb(null, 'Job status updated to '+ status);                  
                });
              }
      				cb(Util.error('Can not modify job status from ' + inst.status + ' to ' + status, 400));
      				break;
      			case 'COMPLETED':
      				cb(Util.error('Job is already comleted by mechanicId:' + inst.mechanicId, 400));
      				break;
      			default:
              cb(Util.error('Can not modify job status from ' + inst.status + ' to ' + status, 400));
      				break;
      		}
      		else
      			cb(Util.error('No job found with id:' + jobId, 400));
      });
    }

    Job.upload = function(ctx,jobId,cb){

      Job.findById(jobId, {}, function(err, job){
        var containerName = 'test';
        if(!job){
          console.log('Job not found '+ jobId);
          cb(Util.error('No job found with id:' + jobId, 400));
        }
        console.log('Found job instance'+ JSON.stringify(job));
          var Account = Job.app.models.Account;
          
          Account.findById( job.customerId, function(aerr, account){

            console.log('finding account '+ JSON.stringify(account));
            if(aerr)
              cb(aerr);
            if(!account){
              cb(Util.error('No customer account found for job '+ jobId, 400));
            }

            var Container = Job.app.models.Container;
            
            containerName = account.id.toString();
            Container.getContainer(containerName, function(cerror, c){
              var fileInfo = {};
              if(c){
                Container.upload(ctx.req, ctx.res, { container: c.name }, function(err,fileObj){
                  console.log(fileObj);
                  if(Object.keys(fileObj.files).length == 0){
                    console.log('No files found. Container exists');
                    
                    cb(Util.error('No files uploaded', 400));                
                  }else{

                    fileInfo = fileObj.files[Object.keys(fileObj.files)[0]];
                    console.log('getContainer fileInfo '+ JSON.stringify(fileInfo));

                    job.updateAttributes({ videoUrl: fileInfo[0].name }, function(ferr,done){                    
                      cb(null, job)
                    });
                  }
                });
              }else{
                console.log('Creating container '+ containerName);
                Container.createContainer({name: containerName}, function(uerr, c){

                  Container.upload(ctx.req, ctx.res, { container: c.name }, function(uperr,fileObj){
                  console.log(fileObj);
                    if(Object.keys(fileObj.files).length == 0){
                      console.log('No files found. Container created')
                      cb(Util.error('No files uploaded',400));                     
                    }
                    fileInfo = fileObj.files[Object.keys(fileObj.files)[0]];
                    console.log('createContainer fileInfo '+ JSON.stringify(fileInfo));
                    console.log('fileInfo before update ' + JSON.stringify(fileInfo));

                    job.updateAttributes({ videoUrl: fileInfo.name }, function(ferr,done){
                      cb(null, job)
                    });
                  });
                });
              }          
            }); // container ends   
          });      
      });
    }

	Job.remoteMethod(
        'assignments',
        {
          accepts: [
          				{arg: 'id', type: 'string', required:true },
          				{arg: 'mechanicId', type: 'string', required:true }
          			],
          returns: {arg: 'message', type: 'string'},
          http: {path: '/:id/assignments', verb: 'post'}
        }
    );

	Job.observe('access', function logQuery(ctx, next) {

  		console.log('Accessing %s matching %s', ctx.Model.modelName, JSON.stringify(ctx.query.where));
  		next();

    });

  Job.remoteMethod(
        'upload',
        {
          description: 'Uploads a video for job',
          accepts: [
                    {arg: 'ctx', type: 'object', 'http': {source: 'context'}},                    
                    {arg: 'id', type: 'string'}
                   ],
          returns: {
                      arg: 'fileObject', type: 'object', root: true
                  },
          http: { path: '/:id/upload',  verb: 'post'}
  });

	
};
