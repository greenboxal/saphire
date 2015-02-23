var module = require('module');
var callsites = require('v8-callsites');
var SaphireClass = require('./class');

var moduleStack = [];

// Top
function TopDefineMetaclass(klass, value) {
    var target;
    var receiver = exports.getCurrentModule();

    if (receiver) {
        target = receiver.getConstructor();
    } else {
		throw new Error("this must be called inside an open module/class");
    }

    if (!value) {
        value = klass;
        klass = null;
    }

    if (value instanceof Array) {
        klass = value[0];
        value = value[1];
    }

	if (!klass) {
		if (value.name == '') {
			klass = target;
		} else if (target[value.name]) {
			if (!(target[value.name] instanceof Class) || SaphireClass.getType(target[value.name]) != SaphireClass.CLASS) {
				throw new TypeError(value.name + " is not a class");
			}

			klass = target[value.name];
		} else {
			throw new Error("class not found");
		}
	}

    exports.applyModuleScope(SaphireClass.singletonClassOf(klass), value);
};

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

exports.applyModuleScope = function(module, fn) {
    try {
        exports.enterModuleScope(SaphireClass.fromConstructor(module));

		Function.prototype.call.call(fn, module);
    } catch(ex) {
        throw ex;
    } finally {
        exports.exitModuleScope();
    }
};

exports.exitModuleScope = function() {
    moduleStack.pop();
};

exports.enterModuleScope = function(module) {
    moduleStack.push(module);
};

exports.getCurrentModule = function() {
    return moduleStack[moduleStack.length - 1];
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
	exports.defineGlobalProperty('defmeta', {
		set: TopDefineMetaclass,
		get: function() {
			return TopDefineMetaclass;
		}
	});
};

