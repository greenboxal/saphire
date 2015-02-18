var Shared = require('./shared');
var SaphireClass = require('./class');
var SaphireVM = require('./vm');

// Top Definitions
function GetSuper() {
	return SaphireVM.findSuperMethodFromCallSite(SaphireVM.getCallSite(1));
};

function TopDefineMethod(value) {
    var receiver = SaphireVM.getCurrentModule();

    if (!receiver) {
        receiver = SaphireClass.getSingletonClass(SaphireVM.getCallerReceiver());
    }

    SaphireClass.defineMethod(receiver, value.name, value);
};

function TopDefineGetter(value) {
    var receiver = SaphireVM.getCurrentModule();

    if (!receiver) {
        receiver = SaphireClass.getSingletonClass(SaphireVM.getCallerReceiver());
    }

    SaphireClass.defineGetter(receiver, value.name, value);
};

function TopDefineSetter(value) {
    var receiver = SaphireVM.getCurrentModule();

    if (!receiver) {
        receiver = SaphireClass.getSingletonClass(SaphireVM.getCallerReceiver());
    }

    SaphireClass.defineSetter(receiver, value.name, value);
};

// Module
function ModuleDefineMethod(name, fn) {
	SaphireClass.defineMethod(this, name, fn);
};

function ModuleDefineAccessor(name, fn) {
	SaphireClass.defineAccessor(this, name, fn);
};

function ModuleDefineGetter(name, fn) {
	SaphireClass.defineGetter(this, name, fn);
};

function ModuleDefineSetter(name, fn) {
	SaphireClass.defineSetter(this, name, fn);
};

function ModuleAlias(name, target) {
	SaphireClass.defineMethodAlias(this, name, target);
};


exports.initialize = function() {
	// Top
	SaphireVM.defineGlobalProperty('$super', {
		get: GetSuper
	});

	SaphireVM.defineGlobalProperty('defmeth', {
		set: TopDefineMethod,
		get: function() {
			return TopDefineMethod;
		}
	});
	
	SaphireVM.defineGlobalProperty('defget', {
		set: TopDefineGetter,
		get: function() {
			return TopDefineGetter;
		}
	});
	
	SaphireVM.defineGlobalProperty('defset', {
		set: TopDefineSetter,
		get: function() {
			return TopDefineSetter;
		}
	});

	// Module
	SaphireClass.defineMethod(Shared.Module, 'defineMethod', ModuleDefineMethod);
	SaphireClass.defineMethod(Shared.Module, 'defineAccessor', ModuleDefineAccessor);
	SaphireClass.defineMethod(Shared.Module, 'defineGetter', ModuleDefineGetter);
	SaphireClass.defineMethod(Shared.Module, 'alias', ModuleAlias);
};

