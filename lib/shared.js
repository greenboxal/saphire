var objectIdCounter = 0x100000;

function superCaller() {
	return exports.superref.apply(null, arguments);
};

exports.fetchObjectId = function() {
	return objectIdCounter++;
};

exports.getDummyFunction = function() {
	return new Function("return function $$saphire$" + exports.fetchObjectId() + "(){};")();
};

exports.getSuperCaller = function() {

};

exports.defineModule = function(name, fn) {
	return new exports.Module(name, fn);
};

