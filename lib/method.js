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
		throw new Error("this must be called from inside an open module/class");
    }

    SaphireClass.defineMethod(receiver, value.name, value);
};

function TopDefineGetter(value) {
    var receiver = SaphireVM.getCurrentModule();

    if (!receiver) {
		throw new Error("this must be called from inside an open module/class");
    }

    SaphireClass.defineGetter(receiver, value.name, value);
};

function TopDefineSetter(value) {
    var receiver = SaphireVM.getCurrentModule();

    if (!receiver) {
		throw new Error("this must be called from inside an open module/class");
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

// Object
function ObjectSend() {
	var args = Array.prototype.slice.call(arguments);
	var name = args.shift();

	this[name].apply(this, args);
};

function ObjectMethod(name) {
	return exports.create(SaphireClass.getClassOf(this), this, name, Shared.Method);
};

function ObjectSingletonMethod(name) {
	return exports.create(SaphireClass.singletonClassOf(this), SaphireClass.getClassOf(this), name, Shared.Method);
};

function ObjectDefineSingletonMethod(name, fn) {
	SaphireClass.defineMethod(SaphireClass.singletonClassOf(this), name, fn);
};

// UnboundMethod
function UnboundMethodGetBind(receiver) {
	var meth = this.__meth__;
	var methclass = meth.receiverClass;
	var rclass = SaphireClass.getClassOf(receiver, true);

	if (methclass.type != SaphireClass.MODULE &&
		methclass != rclass &&
		!(receiver instanceof methclass.getConstructor())) {
		if (methclass.singleton) {
			throw new TypeError("singleton method called for a different object");
		} else {
			throw new TypeError("bind argument must be an instance of " + methclass.name);
		}	
	}

	if (meth.ownerClass.type == SaphireClass.MODULE) {
		var ic = meth.ownerClass.findClass(meth.ownerClass);

		if (ic) {
			rclass = ic;
		} else {
			rclass = methclass.createIncludeClass(rclass);
		}
	}

	return exports.createMethod(Shared.Method, meth.name, meth.fn, meth.ownerClass, receiver, rclass);
};

// Method
function MethodGetArity() {
	return this.__meth__.fn.length;
}

function MethodToString() {
	var meth = this.__meth__;
	var klass = meth.ownerClass;
	var name = '#<' + SaphireClass.getClassOf(this, true).getName() + ': ';
	var sep = '#';

	if (klass.singleton) {
		var attached = klass.getAttachedSingletonClass();

		if (meth.receiver == undefined) {
			name += Shared.getObjectName(klass);
		} else if (receiver == attached) {
			name += Shared.getObjectName(attached);
			sep = '.';
		} else {
			name += Shared.getObjectName(meth.receiver);
			name += '(' + Shared.getObjectName(attached) + ')';
			sep = '.';
		}
	} else {
		name += meth.receiverClass.getName();

		if (klass != meth.receiverClass) {
			name += '(' + klass.getName() + ')';
		}
	}

	name += sep + this.name;

	if (meth.originalName != meth.name) {
		name += '(' + meth.originalName + ')';
	}

	name += '>';

	return name;
};

function MethodCall() {
	return this.__meth__.fn.apply(this.__meth__.receiver, arguments);
};

function MethodApply(args) {
	return this.__meth__.fn.apply(this.__meth__.receiver, args);
};

function MethodToFunction() {
	return this.__meth__.fn.bind(this.__meth__.receiver);
};

function MethodGetReceiver() {
	return this.__meth__.receiver;
};

function MethodGetName() {
	return this.__meth__.name;
};

function MethodGetOriginalName() {
	return this.__meth__.originalName;
};

function MethodGetOwner() {
	return this.__meth__.ownerClass.getConstructor();
};

function MethodUnbind() {
	var meth = this.__meth__;

	return exports.createMethod(Shared.UnboundMethod, meth.name, meth.fn, meth.ownerClass, meth.receiver, meth.receiverClass);
};

exports.createMethod = function(mclass, name, fn, ownerClass, receiver, receiverClass) {
	var method = {};

	SaphireClass.setClassOf(method, mclass);

	Object.defineProperty(method, '__meth__', {
		enumerable: false,
		configurable :false,
		writable: false,
		value: {
			fn: fn,
			name: name,
			originalName: fn.name,
			ownerClass: ownerClass,
			receiverClass: receiverClass,
			receiver: receiver
		}
	});

	return method;
};

exports.createFromFunction = function(fn, definedClass, klass, receiver, name, mclass) {
	klass = SaphireClass.fromConstructor(klass);
	definedClass = SaphireClass.fromConstructor(definedClass);

	var rclass = klass;

	if (!fn) {
		throw new Error("undefined method '" + name + "' for class '" + RubyClass.getClassName(klass) + "'");
	}

	klass = definedClass;

	while (rclass != klass && (rclass.singleton || rclass.type == SaphireClass.ICLASS))
		rclass = rclass.getSuperclass();

	return exports.createMethod(mclass, name, fn, klass, receiver, rclass);
};

exports.create = function(klass, receiver, name, mclass) {
	var method = SaphireClass.getDefinedMethod(klass, name, true);

	return exports.createFromFunction(method, method.owner, klass, receiver, name, mclass);
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

	// Kernel
	SaphireClass.defineMethod(Shared.SuperObject, '__send__', ObjectSend);
	SaphireClass.defineMethod(Shared.Kernel, 'send', ObjectSend);
	SaphireClass.defineMethod(Shared.Kernel, 'method', ObjectMethod);
	SaphireClass.defineMethod(Shared.Kernel, 'singletonMethod', ObjectSingletonMethod);
	SaphireClass.defineMethod(Shared.Kernel, 'defineSingletonMethod', ObjectDefineSingletonMethod);

	// Method
	Shared.Method = new Shared.Class('Method');
	SaphireClass.defineAllocator(Shared.Method, null);
	SaphireClass.undefineMethod(SaphireClass.singletonClassOf(Shared.Method), 'create');
	SaphireClass.defineMethod(Shared.Method, 'call', MethodCall);
	SaphireClass.defineMethod(Shared.Method, 'apply', MethodApply);
	SaphireClass.defineGetter(Shared.Method, 'arity', MethodGetArity);
	SaphireClass.defineMethod(Shared.Method, 'toFunction', MethodToFunction);
	SaphireClass.defineMethod(Shared.Method, 'toString', MethodToString);
	SaphireClass.defineGetter(Shared.Method, 'receiver', MethodGetReceiver);
	SaphireClass.defineGetter(Shared.Method, 'name', MethodGetName);
	SaphireClass.defineGetter(Shared.Method, 'originalName', MethodGetOriginalName);
	SaphireClass.defineGetter(Shared.Method, 'owner', MethodGetOwner);
	SaphireClass.defineMethod(Shared.Method, 'unbind', MethodUnbind);

	// UnboundMethod
	Shared.UnboundMethod = new Shared.Class('UnboundMethod');
	SaphireClass.defineAllocator(Shared.UnboundMethod, null);
	SaphireClass.undefineMethod(SaphireClass.getMetaclass(Shared.UnboundMethod), 'create');
	SaphireClass.defineGetter(Shared.UnboundMethod, 'arity', MethodGetArity);
	SaphireClass.defineMethod(Shared.UnboundMethod, 'toFunction', MethodToFunction);
	SaphireClass.defineMethod(Shared.UnboundMethod, 'toString', MethodToString);
	SaphireClass.defineGetter(Shared.UnboundMethod, 'name', MethodGetName);
	SaphireClass.defineGetter(Shared.UnboundMethod, 'originalName', MethodGetOriginalName);
	SaphireClass.defineGetter(Shared.UnboundMethod, 'owner', MethodGetOwner);
	SaphireClass.defineMethod(Shared.UnboundMethod, 'bind', UnboundMethodGetBind);

	SaphireVM.defineGlobal('Method', Shared.Method);
	SaphireVM.defineGlobal('UnboundMethod', Shared.UnboundMethod);
};

