'use strict';

var Util = require('../lib/util')
var Config = require('../config')

module.exports = function(app) {

  var Account = app.models.Account;
  var Service = app.models.Service;
  var Role = app.models.Role;
  var Category = app.models.Category;
  var Inventory = app.models.Inventory;
  var RoleMapping = app.models.RoleMapping;
  var defaultAdminAccount = {};
  
  function adminRoleCreated(err,role,created){
    
      if (err) throw err;

    role.principals.findOne({ where:{ principalId: defaultAdminAccount.id } }, function(err, principal){

      if(!principal) //make shaan an admin
        role.principals.create({
            principalType: RoleMapping.USER,
            principalId: defaultAdminAccount.id
          }
          , 
          function(err, principal) {
            if (err) throw err;

        console.log('Created principal:', principal);
      });
    });
  }

  Util.createIfNotExists(Service, 
    [
      {name:'Leisure Service', price: 30, icon: 'Leisure_Service.png', description: "A service for a bike that doesn't get much use but needs some TLC.Leisure bike service checks, adjusts and tightens all components listed." },
      {name:'Puncture Repair', price: 15, icon: 'Puncture_Service.png',description:"The one stop shop to getting you flat tire repaired asap.All puncture repairs include inner tube"},
      {name:'Commuter Service', price: 60, icon: 'Commuter_Service.png',description:"A service for a bike that does substantial millage and endures all weather conditions.Commuter bike service checks, adjusts and tightens all components listed. Some parts will be removed to be cleaned.all components listed. "},
      {name:'Pro Service', price: 100, icon: 'Pro_Service.png',description:"A service for an elite bike that deserves the best treatment, it will be as good as new.Pro bike service checks, adjusts and tightens all components listed. Some parts will be removed to be cleaned." },
      {name:'Specific Service', price: 15, icon: 'Specific_Service.png',description:"A service to target the specfic problem. Some specfic service may add an additional cost" }
  ], function(err,inst){ 
      if(inst)  console.log('Created %d services', inst.length);
    });

  Util.createIfNotExists(Category,[
      {name: 'Essentials', displayOrder: 0},
      {name: 'Drivetrain', displayOrder: 1},
      {name: 'Wheels,Tires', displayOrder: 2},
      {name: 'Brakes', displayOrder: 3},
      {name: 'Handlebar,Saddle,Seatposts', displayOrder: 4},
      {name: 'Frame,Fork,Headset', displayOrder: 5},
      {name: 'Workshop Tools', displayOrder: 6},
      {name: 'Partner Tools', displayOrder: 7}      
    ], function(err,inst){ 
      if(inst)  console.log('Created %d categories', inst.length);
    });

  Account.findOrCreate(
    { where:{ email: Config.admin.email }}
    ,
    Config.admin
    ,
    function(err, account, created) {
      if (err) throw err;
      defaultAdminAccount = account;

      if(created)
        console.log('Created admin: ' + account);     
  });


  Role.findOrCreate( { where:{ name: 'ADMIN' }}, { name: 'ADMIN' }, adminRoleCreated );

  Role.findOrCreate( { where:{name: 'MECHANIC' }}, { name: 'MECHANIC' }, function(err, mechanic, created){
    console.log('mechanic role: ' + JSON.stringify(mechanic))
    if(created)
        console.log('Created mechanic role')
  });

  Role.findOrCreate( { where:{ name: 'CUSTOMER' }}, { name: 'CUSTOMER' }, function(err, customer, created){
    console.log('customer role: '+ JSON.stringify(customer))
    if(created)
      console.log('Created customer role')
  });
};
