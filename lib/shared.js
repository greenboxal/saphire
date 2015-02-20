var SaphireClass = require('./class');

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

exports.defineModule = function(name, fn) {
	return new exports.Module(name, fn);
};

exports.getModuleName = function(module) {
    module = SaphireClass.fromConstructor(module);

    if (module.singleton) {
        var name;
        var owner = module.getAttachedSingletonClass();

        if (owner instanceof exports.Module) {
            name = exports.getModuleName(owner);
        } else {
            name = typeof owner;
        }

        return "#<Class:" + name + ">";
    }

    return module.getName();
};

exports.getObjectName = function(obj) {
    if (obj instanceof exports.Module) {
        return exports.getModuleName(obj);
    }

    return '#<' + SaphireClass.getClassOf(obj).getName() + '>';
};

