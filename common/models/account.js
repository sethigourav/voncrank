
var Util = require('../../server/lib/util')
var Events = require('../../server/lib/events')
var Job = require('../../server/lib/job')

module.exports = function(Account) {

  Account.validatesPresenceOf('name','telephone','password')
  Account.validatesLengthOf('name', { min: 5, message: { min: 'Name should be 5+ characters' } });
  Account.validatesLengthOf('password', {min: 5, message: {min: 'Password is too short'}});
  Account.validatesUniquenessOf('email', {message: 'Email already exists'});
  

  Account.observe('access', function filterOutInactiveAccounts(ctx, next) {
    //role.principals.findOne({ where:{ principalId: defaultAdminAccount.id } }, function(err, principal){

    //console.log(ctx.req)
    //ctx.query.where = ctx.query.where || { };
    //ctx.query.where.active = { neq: false }
    //console.log(ctx.query)
    next();
  });


  Account.afterRemote('*.__create__jobs', Job.assignToAMechanic);

  Account.afterRemote('create', function(ctx, account, next){

    var Role = Account.app.models.Role;
    var Cart = Account.app.models.Cart;
    var Container = Account.app.models.Container;
    var Inventory = Account.app.models.Inventory;
    
    if(account && account.id){
      Util.assignRoleToPrincipal(Role, account.type.toUpperCase(), account.id);
      Util.createStorageContainer(Container, account.id.toString());
      Util.createStripeCustomer(account.id,account.email);
      //account.container.create();      
      account.inventory.create();
      account.cart.create();
    }
    next();
  });

  Account.inventory =  function(mechanicId, cb){ 
  	var Inventory = Account.app.models.Inventory;

  	Inventory.findOne({ where: { mechanicId: mechanicId }}, function(err, inst){
  		console.log(err);
  		console.log(inst);

  		if(inst)
  			cb(inst);
  		else
  			cb(Util.error('Mechanic has no inventory', 204 ));
  	});
  }

  Account.cart = function(accountId, cb){

    Account.findById(accountId, function(err,account){

      if(err)
        cb(err);
      else{
        account.cart(function(err, cart){          
          cb(null,cart)
        });
      }
    });   
  };

  Account.cartItems = function(accountId,partNumber,quantity,price,cb){

    var Part = Account.app.models.Part;

    /*Util.executeSequentially([

      function(next) { (function(next){  
        
          Account.findById(accountId, function(err,account){

            if(err)
                cb(err);
             else
              next();
          });

        })(next);
      },

      function(next) { (function(next){  


        
        })(next); 
      },  
      function(next) { (function(next){  console.log('third function'); next();  })(next); }
      ], cb);*/


      Account.findById(accountId, function(err,account){

        if(err)
          cb(err);
        else{
          account.cart(function(err, cart){          
            if(err)
              cb(err);
            else{
              if(cart){
                cart.items(function(err, items){

                  var foundId = false;
                  var newId = (items || []).length + 1;

                  items.forEach(function(item, index){

                    if(item.partNumber == partNumber){
                      foundId = item.id;
                      item.quantity = quantity
                    }
                    item.id = index + 1
                  });

                  if(foundId){
                    cart.items.updateById(foundId,{ quantity:quantity,price:price}, function(err,done){
                      if(err)
                        cb(err)
                      else
                        cb(null,cart);
                    });
                  }else{
                    cart.items.create({ id: newId, partNumber:partNumber,quantity:quantity,price:price}, function(err, done){
                      if(err)
                        cb(err)
                      else
                        cb(null,cart);
                    });
                  }                                   
                });             
              }else
              cb(Util.error("Cart not found"));
            }
          });
        }
      });
    }

    Account.cards = function(accountId,name,number,expMonth,expYear,cvv,cb){

      Account.findById(accountId, function(err,account){

        if(err)
          cb(err);
        else{
          account.card.create({
            last4:number,
            name: name,
            expMonth: expMonth,
            expYear:expYear
          }, function(err, cardd) {

            if(err)
              cb(err, 400);
            else{
              var card = {};

              card.number = number;
              card.exp_month = expMonth;
              card.exp_year = expYear;
              card.cvc = cvv;

              Events.addCardForStripeCustomer(account.stripeCustomerId, card);
              console.log('Card added %s', JSON.stringify(card));
              cb(null, cardd);

            }
          });
        }
      });
    };

    Account.chargeCard = function(accountId,amount,currency, cb){

      Account.findById(accountId, function(err,account){
        console.log(account);
        if(err){
          return cb(err);
        }
        else if( !account.stripeCustomerId ){
          return cb(Util.error("User is not registered with stripe"));
        }

        Events.chargeCard(account.stripeCustomerId, amount,currency, cb);

      });      

      //cb(null);
    };

    Account.orders = function(accountId,cartId, cb){

      Account.findById(accountId, function(err, account){
        if(err)
          return cb(err);



      });


    }

    Account.remoteMethod(
      'orders',
      {
        accepts: [{arg:'id', type:'string', required:true },
                  {arg:'cartId', type:'string'}
                 ],
        returns: { arg: 'order', type: 'Object', root:true },
        http: { path: '/:id/orders', verb:'post'}         
      })

    Account.remoteMethod(
      'chargeCard',
      {
        accepts: [{arg: 'id', type: 'string', required:true },
                  {arg: 'amount', type: 'number'},
                  {arg: 'currecny', type: 'string'} 
                  ],
        returns: {arg: 'charge', type: 'Object', root:true},
        http: {path: '/:id/charge', verb: 'post'}          
      }
      );


    Account.remoteMethod(

      'cards',
      {
        accepts: [
        {arg: 'id', type: 'string', required:true },
        {arg: 'name', type: 'string', required:true },                  
        {arg: 'number', type: 'number', required:true },
        {arg: 'expMonth', type: 'number'},
        {arg: 'expYear', type: 'number'},
        {arg: 'cvv', type: 'number'}
        ],
        returns: {arg: 'cardd', type: 'Object',root: true},
        http: {path: '/:id/cards', verb: 'post'}
      }
      );


    Account.remoteMethod(
      'inventory',
      {
        accepts: {arg: 'id', type: 'string', required:true },      
        returns: {arg: 'inventory', type: 'Object', root: true},
        http: {path: '/:id/inventory', verb: 'get'}          
      }
      );

    Account.remoteMethod(
      'cart',
      {
        accepts: {arg: 'id', type: 'string', required:true },      
        returns: {arg: 'cart', type: 'Object',root: true},
        http: {path: '/:id/cart', verb: 'get'}
      }
      );
    Account.remoteMethod(
      'cartItems',
      {
        accepts: [
        {arg: 'id', type: 'string', required:true },
        {arg: 'partNumber', type: 'string', required:true },
        {arg: 'quantity', type: 'number'},
        {arg: 'price', type: 'number'}
        ],
        returns: {arg: 'cart', type: 'Object',root: true},
        http: {path: '/:id/cart/items', verb: 'post'}
      }
      );

  };
