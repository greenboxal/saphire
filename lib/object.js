var fs = require('fs');
var path = require('path');
var Shared = require('./shared');
var SaphireVM = require('./vm');
var SaphireClass = require('./class');

function SuperObjectAllocator(klass) {
	return Object.create(klass.prototype);
};

function ModuleAllocator(klass) {
	return new SaphireClass(klass, SaphireClass.MODULE).getConstructor();
};

function ModuleInitialize(name, fn) {
	if (name instanceof Function) {
		fn = name;
		name = null;
	}

	if (!name && fn) {
		name = fn.name;
	}

	SaphireClass.setName(this, name);

	if (fn) {
		fn.apply(this);
	}
};

function ModuleGetName() {
	return SaphireClass.getName(this);
};

function ModuleGetAncestors() {
	var results = [];

	for (var p = SaphireClass.fromConstructor(this); p; p = SaphireClass.getSuperclass(p)) {
		if (p.type == SaphireClass.ICLASS) {
			results.push(p.getMetaclass().getConstructor());
		} else if (p.getOrigin() == p) {
			results.push(p.getConstructor());
		}
	}

	return results;
};

function ModuleInclude() {
	var args = Array.prototype.slice.call(arguments);

	for (var i = 0; i < args.length; i++) {
		if ((!args instanceof Shared.Module)) {
			throw new TypeError("expected object to be module");
		}
	}

	for (var i = args.length - 1; i >= 0; i--) {
		var mod = args[i];

		mod.appendFeatures(this);
		mod.included(this);
	}
};

function ModulePrepend() {
	var args = Array.prototype.slice.call(arguments);

	for (var i = 0; i < args.length; i++) {
		if ((!args instanceof Shared.Module)) {
			throw new TypeError("expected object to be module");
		}
	}

	for (var i = args.length - 1; i >= 0; i--) {
		var mod = args[i];

		mod.prependFeatures(this);
		mod.prepended(this);
	}
};

function ModuleAppendFeatures(obj) {
	SaphireClass.includeModule(obj, this);
};

function ModulePrependFeatures(obj) {
	SaphireClass.prependModule(obj, this);
};

function ModuleExtendObject(obj) {
	SaphireClass.includeModule(SaphireClass.getSingletonClass(obj), this);
};

function ModuleAutoload(name, modulePath) {
	var callerContext = SaphireVM.getCallSite(1);

	if (modulePath[0] === '.') {
		modulePath = path.resolve(callerContext.getFileName(), '..', modulePath);
	}

	if (this.name) {
		Object.defineProperty(this, name, {
			configurable: true,
			enumerable: false,
			get: function() {
				var value = require(modulePath);

				Object.defineProperty(this, name, {
					configurable: true,
					enumerable: false,
					value: value
				});

				return value;
			}
		});
	}
};

function ModuleToString() {
    return Shared.getModuleName(this);
};

function ClassAllocator(klass) {
	return new SaphireClass(Shared.Class, SaphireClass.CLASS).getConstructor();
};

function ClassAllocate() {
	return exports.allocate(this);
};

function ClassCreate() {
	var obj = this.allocate();

	obj.initialize.apply(obj, arguments);

	return obj;
};

function ClassInitialize(name, superclass, fn) {
	if (SaphireClass.getSuperclass(this) || this == Shared.Object) {
		throw new TypeError("already initialized class");
	}

	if (superclass instanceof Function) {
		fn = superclass;
		superclass = undefined;
	}

	if (name instanceof Shared.Class) {
		superclass = name;
		name = undefined;
	}

	if (!name && fn) {
		name = fn.name;
	}

	if (!superclass) {
		superclass = Shared.SuperObject;
	} else if (superclass != Shared.Object && !SaphireClass.getSuperclass(superclass)) {
		throw new TypeError("can't inherit uninitialized class");
	}

	SaphireClass.setName(this, name);
	SaphireClass.setSuperclass(this, superclass);
	SaphireClass.makeMetaclass(this);

	superclass.inherited(this);

	ModuleInitialize.call(this, name, fn);

	return this;
};

function ClassGetSuperclass() {
	var superclass = SaphireClass.getSuperclass(this);

	if (!superclass) {
		if (this == Shared.Object) {
			return null;
		}

		throw new TypeError("uninitialized class");
	}
	
	while (superclass.type == SaphireClass.ICLASS) {		
		superclass = superclass.getSuperclass();
	}

	return superclass.getConstructor();
};

function ObjectGetMetaclass() {
	return SaphireClass.getSingletonClass(this).getConstructor();
};

function ObjectOpenMetaclass(fn) {
	fn.apply(SaphireClass.getSingletonClass(this).getConstructor());
};

function ObjectGetConstructor() {
	return SaphireClass.getRealClassOf(this).getConstructor();
}

function ObjectExtend() {
	var args = Array.prototype.slice.call(arguments);

	for (var i = 0; i < args.length; i++) {
		if ((!args instanceof Shared.Module)) {
			throw new TypeError("expected object to be module");
		}
	}

	for (var i = args.length - 1; i >= 0; i--) {
		var mod = args[i];

		mod.extendObject(this);
		mod.extended(this);
	}
};

function ObjectKindOf(klass) {
	var cl = SaphireClass.getClassOf(this);
	var c = SaphireClass.getOrigin(klass);

	while (cl) {
		if (cl == c) {
			return true;
		}

		cl = cl.getSuperclass();
	}

	return false;
};

function ObjectInstanceOf(klass) {
	return ObjectGetConstructor.call(this) == klass;
};

function ObjectTap(fn) {
	fn.call(null, this);

	return this;
};

function ObjectGetSuper() {
	var fn = this.arguments.callee.caller;

	// Find the topmost function call bound to a class
	while (fn && !(fn instanceof Shared.UnboundMethod)) {
		fn = fn.caller;
	}

	if (!fn) {
		throw new TypeError("could not call super with no class function on the stack");
	}

	return SaphireClass.getClassOf(this, true).findSuperMethod(fn).bind(this);
};

function ObjectToString() {
	return Shared.getObjectName(this);
};

exports.allocate = function(klass) {
	var allocator = SaphireClass.getAllocator(klass);

	if (!SaphireClass.getSuperclass(klass) && klass != Shared.Object) {
		throw new TypeError("can't instantiate uninitialized class");
	}

	if (SaphireClass.fromConstructor(klass).singleton) {
		throw new TypeError("can't create instance of singleton class")
	}

	if (!allocator) {
		throw new TypeError("allocator undefined for " + SaphireClass.getName(klass));
	}

	var obj = allocator(klass);

	if (ObjectGetConstructor.call(obj) != SaphireClass.getRealClass(klass).getConstructor()) {
		throw new TypeError("wrong instance allocation");
	}

	return obj; 
};

exports.initialize = function() {
	// SuperObject
	SaphireClass.defineAllocator(Shared.SuperObject, SuperObjectAllocator);
	SaphireClass.defineMethod(Shared.SuperObject, "initialize", Shared.getDummyFunction());
	
	// Module
	SaphireClass.defineAllocator(Shared.Module, ModuleAllocator);
	SaphireClass.defineAccessor(Shared.Module, 'name', ModuleGetName);
	SaphireClass.defineAccessor(Shared.Module, 'ancestors', ModuleGetAncestors);
	SaphireClass.defineMethod(Shared.Module, 'initialize', ModuleInitialize);
	SaphireClass.defineMethod(Shared.Module, 'included', Shared.getDummyFunction());
	SaphireClass.defineMethod(Shared.Module, 'autoload', ModuleAutoload);
	SaphireClass.defineMethod(Shared.Module, 'prepended', Shared.getDummyFunction());
	SaphireClass.defineMethod(Shared.Module, 'extended', Shared.getDummyFunction());
	SaphireClass.defineMethod(Shared.Module, 'include', ModuleInclude);
	SaphireClass.defineMethod(Shared.Module, 'prepend', ModulePrepend);
	SaphireClass.defineMethod(Shared.Module, 'appendFeatures', ModuleAppendFeatures);
	SaphireClass.defineMethod(Shared.Module, 'prependFeatures', ModulePrependFeatures);
	SaphireClass.defineMethod(Shared.Module, 'extendObject', ModuleExtendObject);
	SaphireClass.defineMethod(Shared.Module, 'toString', ModuleToString);
	SaphireClass.defineMethod(Shared.Module, 'inspect', ModuleToString);

	// Class
	SaphireClass.defineAllocator(Shared.Class, ClassAllocator);
	SaphireClass.defineMethod(Shared.Class, 'allocate', ClassAllocate);
	SaphireClass.defineMethod(Shared.Class, 'create', ClassCreate);
	SaphireClass.defineMethod(Shared.Class, 'initialize', ClassInitialize);
	SaphireClass.defineMethod(Shared.Class, 'inherited', Shared.getDummyFunction());
	SaphireClass.defineAccessor(Shared.Class, 'superclass', ClassGetSuperclass);
	SaphireClass.undefineMethod(Shared.Class, 'extendObject');
	SaphireClass.undefineMethod(Shared.Class, 'appendFeatures');

	// Kernel
	Shared.Kernel = Shared.defineModule('Kernel');
	SaphireClass.includeModule(Shared.SuperObject, Shared.Kernel);
	SaphireClass.defineAccessor(Shared.Kernel, 'metaclass', ObjectGetMetaclass);
	SaphireClass.defineAccessor(Shared.Kernel, 'constructor', ObjectGetConstructor);
	SaphireClass.defineAccessor(Shared.Kernel, 'class', ObjectGetConstructor);
	SaphireClass.defineMethod(Shared.Kernel, 'openMetaclass', ObjectOpenMetaclass);
	SaphireClass.defineMethod(Shared.Kernel, 'extend', ObjectExtend);
	SaphireClass.defineMethod(Shared.Kernel, 'isA', ObjectKindOf);
	SaphireClass.defineMethod(Shared.Kernel, 'kindOf', ObjectKindOf);
	SaphireClass.defineMethod(Shared.Kernel, 'instanceOf', ObjectInstanceOf);
	SaphireClass.defineMethod(Shared.Kernel, 'tap', ObjectTap);
	SaphireClass.defineMethod(Shared.Kernel, 'toString', ObjectToString);

	SaphireVM.defineGlobal('Object', Shared.Object);
	SaphireVM.defineGlobal('SuperObject', Shared.SuperObject);
	SaphireVM.defineGlobal('Module', Shared.Module);
	SaphireVM.defineGlobal('Class', Shared.Class);
};

