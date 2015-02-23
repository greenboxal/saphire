var module = require('module');
var callsites = require('v8-callsites');
var SaphireClass = require('./class');

exports.findSuperMethodFromCallSite = function(callsite) {
	var receiver = callsite.getThis();

	if (!receiver) {
		throw new TypeError("can't get super for unbound method");
	}

	var receiverClass = SaphireClass.getClassOf(receiver, true);

	if (!receiverClass) {
		throw new TypeError("can't get super for untyped receiver");
	}

	// Find the method owning class on receiver class hierarchy
	var method = callsite.getFunction();
	var methodClass = receiverClass.findClass(method.owner);

	if (!methodClass) {
		throw new TypeError("no superclass for method '" + method.name + "'");
	}

	var superclass = methodClass.getSuperclass();

	if (!superclass) {
		throw new TypeError("no superclass for method '" + method.name + "'");
	}

	var fn = superclass.getDefinedMethod(method.name, true);

	if (!fn) {
		throw new TypeError("no superclass for method '" + method.name + "'");
	}

	return fn.bind(receiver);
};

exports.getCallerReceiver = function() {
    return exports.getCallSite(2).getThis();
};

exports.getCallSite = function(index) {
	return callsites(index + 1, exports.getCallSite)[index];
};

exports.defineGlobalProperty = function(name, desc) {
    Object.defineProperty(global, name, desc);
};

exports.defineGlobal = function(name, value) {
    exports.defineGlobalProperty(name, {
        writable: false,
        value: value
    });
};

exports.initialize = function() {
};

