module.exports = function(Card) {

	//Card.validatesLengthOf('number', {is: 16});	
	//Card.validatesLengthOf('name', { min: 5, message: { min: 'Name should be 5- characters' } });
	Card.observe('before save', function removeCreditCardNumber(ctx,next) {
    if (ctx.instance) {
      ctx.instance.last4 = (ctx.instance.last4 + '').slice(-4)
    }
    next();
  });
};