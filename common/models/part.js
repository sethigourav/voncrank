module.exports = function(Part) {

	var ensureUniquePartNumberInCategory = function(err, done){

		var self = this;
		process.nextTick(function () {
            Part.findOne(
            	{ where: 
            		{ 
            			number:self.number , categoryId: self.categoryId
            		}
            	}, function(e, inst){
            	if(inst) err();
            	done();
            });    
        });
	}

	Part.validateAsync('number', ensureUniquePartNumberInCategory, {message: 'Part number already exists'});	
};