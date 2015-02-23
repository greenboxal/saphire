var V8Clone = require('node-v8-clone');
var Reflect = require('harmony-reflect');
var Shared = require('./shared');
var Saphire = require('bindings')('saphire');

var prepareFunction = function(original) {
	var fn = Saphire.createStubFunction();

	%SetCode(fn, original);

	return fn;
};

var setFunctionName = function(fn, name) {
	%FunctionSetName(fn, name);
	%FunctionSetInstanceClassName(fn, name);
};

// Instantiates a new internal class
var SaphireClass = function(base, type, klass) {
	var proto;

	this.type = type || SaphireClass.CLASS;
	
	if (klass) {
		this.klass = klass;

		proto = klass.prototype;
	} else {
		this.klass = prepareFunction(function() {
			return arguments.callee.create.apply(arguments.callee, arguments);
		});

		proto = {};
	}

	SaphireClass.setClassOf(this.klass, base);

	Object.defineProperty(this.klass, '__iclass__', {
		configurable: false,
		enumerable: false,
		writable: false,
		readable: true,
		value: this
	});

	Object.defineProperty(proto, '__class__', {
		configurable: true,
		enumerable: false,
		writable: false,
		readable: true,
		value: this.klass
	});

	this.klass.prototype = proto;

	this.setName('');
	this.setSuperclass(null);
	this.setOrigin(this);
	this.defineAllocator(null);
};

// No objects fucking with my internal implementation
SaphireClass.prototype = Object.create(null);

// Class
SaphireClass.CLASS = 'CLASS';

// Included Class
SaphireClass.ICLASS = 'ICLASS';

// Module
SaphireClass.MODULE = 'MODULE';

// Native Class Constructor
SaphireClass.prototype.getConstructor = function() {
	return this.klass;
};

SaphireClass.prototype.getType = function() {
	return this.type;
};

// Module Origin(for prepend)
SaphireClass.prototype.getOrigin = function() {
	return this.origin;
};

SaphireClass.prototype.setOrigin = function(origin) {
	this.origin = origin;
};

// Class Name
SaphireClass.prototype.getName = function() {
	return this.name;
};

SaphireClass.prototype.setName = function(name) {
	this.name = name;
	setFunctionName(this.klass, name);
};

SaphireClass.prototype.getAllocator = function() {
	var klass = this;

	while (klass) {
		if (klass.allocator) {
			return klass.allocator;
		}

		klass = klass.superclass;
	}

	return null;
};

// Allocator(for Object.allocate)
SaphireClass.prototype.defineAllocator = function(allocator) {
	if (allocator === undefined) {
		delete this.allocator;
	} else {
		this.allocator = allocator;
	}
};

SaphireClass.prototype.undefineAllocator = function() {
	this.setAllocator(null);
};

// Superclass chain
SaphireClass.prototype.getSuperclass = function(external) {
	var superclass = this.superclass;

	if (external) {
		superclass = superclass ? superclass.getConstructor() : null;
	}

	return superclass;
};

SaphireClass.prototype.setSuperclass = function(superclass) {
	superclass = SaphireClass.fromConstructor(superclass);

	this.superclass = superclass;

	if (superclass) {
		Object.setPrototypeOf(this.klass.prototype, superclass.getConstructor().prototype);
	} else {
		Object.setPrototypeOf(this.klass.prototype, null);
	}
};

SaphireClass.prototype.getRealClass = function() {
	var klass = this;

	while (klass && (klass.singleton || klass.type == SaphireClass.ICLASS)) {
		klass = klass.getSuperclass();
	}

	return klass;
};

// Metaclass & Singletons
SaphireClass.prototype.getAttachedSingletonClass = function() {
	return this.klass.prototype.__attached__;
};

SaphireClass.prototype.setAttachedSingletonClass = function(attached) {
	Object.defineProperty(this.klass.prototype, '__attached__', {
		configurable: true,
		enumerable: false,
		writable: false,
		readable: true,
		value: attached
	});
};

SaphireClass.prototype.getMetaclass = function() {
	return SaphireClass.getClassOf(this.klass, true);
};

SaphireClass.prototype.setMetaclass = function(klass) {
	SaphireClass.setClassOf(this.klass, klass);
};

SaphireClass.prototype.hasMetaclass = function() {
	var metaclass = this.getMetaclass();
	var intern = SaphireClass.fromConstructor(metaclass);

	return metaclass &&
		intern.singleton &&
		intern.getAttachedSingletonClass() == this.klass;
};

SaphireClass.prototype.createMetaclass = function() {
	var metaclass = new SaphireClass(Shared.Class, SaphireClass.CLASS);

	metaclass.singleton = true;
	metaclass.setAttachedSingletonClass(this.klass);

	if (this.getMetaclass() == this) {
		this.setMetaclass(metaclass);
		metaclass.setMetaclass(metaclass);
	} else {
		var tmp = this.getMetaclass();

		this.setMetaclass(metaclass);
		metaclass.setMetaclass(tmp.ensureMetaclass());
	}

	var superclass = this.getSuperclass();

	while (superclass && superclass.type == SaphireClass.ICLASS) {
		superclass = superclass.getSuperclass();
	}

	metaclass.setSuperclass(superclass ? superclass.ensureMetaclass() : Shared.Class);

	return metaclass;
};

SaphireClass.prototype.ensureMetaclass = function() {
	if (this.hasMetaclass()) {
		return this.getMetaclass();
	} else {
		return this.createMetaclass();
	}
};

// Modules and includes
SaphireClass.prototype.findClass = function(klass) {
	var p = this;

	klass = SaphireClass.fromConstructor(klass);

	while (p) {
		if (p == klass) {
			break;
		}

		if (p.type == SaphireClass.ICLASS && p.module == klass) {
			break;
		}

		p = p.getSuperclass();
	}

	return p;
};

SaphireClass.prototype.createIncludeClass = function(superclass) {
	var module = this;
	var klass = new SaphireClass(Shared.Class, SaphireClass.ICLASS, function(){});

	if (module.type == SaphireClass.ICLASS) {
		module = module.module;
	}
	
	superclass = SaphireClass.fromConstructor(superclass);

	klass.module = module;
	klass.setName('I:' + module.getName());
	klass.setSuperclass(superclass);
	klass.setMetaclass(module);

 	var ObjectHasOwnProperty = Object.prototype.hasOwnProperty;

	klass.klass.prototype = new Proxy(klass.klass.prototype, {
		has: function(target, name) {
			return (name in module.klass.prototype) || (name in target);
		},
		get: function(target, name, receiver) {
			var desc = Object.getOwnPropertyDescriptor(module.klass.prototype, name);

			if (desc) {
				if (desc.get) {
					return desc.get.call(receiver);
				} else {
					return desc.value;
				}
			}

			var klass = superclass;

			while (klass) {
				var desc = Object.getOwnPropertyDescriptor(klass.klass.prototype, name);

				if (desc) {
					if (desc.get) {
						return desc.get.call(receiver);
					} else {
						return desc.value;
					}
				}
				
				klass = klass.getSuperclass();
			}

			return undefined;
		},
		getOwnPropertyDescriptor: function(target, name) {
			return Object.getOwnPropertyDescriptor(module.klass.prototype, name) ||
				Object.getOwnPropertyDescriptor(target, name);
		},
		hasOwn: function(target, name) {
			return ObjectHasOwnProperty.apply(module.klass.prototype, name) ||
				ObjectHasOwnProperty.apply(target, name);
		}
	});

	return klass;
};

SaphireClass.prototype.includeModulesAt = function(c, module, searchSuper) {
	var changed = 0;
	var klassPrototype = this.getOrigin().getMetaclass().prototype;

	module = SaphireClass.fromConstructor(module);

	for (; module; module = module.getSuperclass()) {
		var skip = false;
		var superclassSeen = false;

		if (module.getOrigin() != module) {
			continue;
		}

		// NOTE: Proxies should be fucking this
		if (klassPrototype && klassPrototype == module.klass.prototype) {
			return -1;
		}

		for (var p = this.getSuperclass(); p; p = p.getSuperclass()) {
			switch (p.type) {
				case SaphireClass.ICLASS:
					if (p.module == module) {
						if (!superclassSeen) {
							// shitty 4chan says: cp? inb4 calling the mods
							c = p;
						}

						skip = true;
						break;
					}
					break;
				case SaphireClass.CLASS:
					if (!searchSuper) {
						break;
					}

					superclassSeen = true;
					break;
			}
		}

		if (skip) {
			continue;
		}

		var ci = module.createIncludeClass(c.getSuperclass());
		c.setSuperclass(ci);
		c = ci;

		if (module.prototype && Object.keys(module.prototype).length > 0) {
			changed = 1;
		}
	}

	return changed;
};

SaphireClass.prototype.includeModule = function(module) {
	var changed = 0;

	module = SaphireClass.fromConstructor(module);

	if (module.type != SaphireClass.MODULE) {
		throw new TypeError("module should be a 'Module' instance");
	}

	changed = this.includeModulesAt(this.getOrigin(), module, true);

	if (changed < 0)
		throw new Error("cyclic include detected");
};

SaphireClass.prototype.prependModule = function(module) {
	var changed = 0;

	module = SaphireClass.fromConstructor(module);

	if (module.type != SaphireClass.MODULE) {
		throw new TypeError("module should be a 'Module' instance");
	}

	var origin = this.getOrigin();

	if (origin == this) {
		origin = new SaphireClass(this, SaphireClass.ICLASS);

		var originPrototype = this.klass.prototype;
		this.klass.prototype = {};
		origin.klass.prototype = originPrototype;

		Object.defineProperty(this.klass.prototype, '__class__', {
			configurable: true,
			enumberable: false,
			writable: false,
			value: this.klass
		});

		origin.setSuperclass(this.getSuperclass());
		origin.setName(this.getName());

		this.setSuperclass(origin);
		this.setOrigin(origin);
	}

	changed = this.includeModulesAt(this, module, false);

	if (changed < 0)
		throw new Error("cyclic include detected");
};

// Methods
SaphireClass.prototype.getDefinedMethod = function(name, inherited) {
	var klass = this;
	var isSetter = name[name.length - 1] === '=';

	if (isSetter) {
		name = name.slice(0, name.length - 1);
	}

	while (klass) {
		var prop = Object.getOwnPropertyDescriptor(klass.klass.prototype, name);

		if (prop) {
			var isAccessor = prop.get || prop.set;
			
			if (isSetter) {
				return this.getDefinedMethod('__set_' + name, inherited);
			} else {
				return isAccessor ? this.getDefinedMethod('__get_' + name, inherited) : prop.value;
			}

			break;
		}

		if (!inherited) {
			break;
		}

		klass = klass.getSuperclass();
	}

	return null;
};

SaphireClass.prototype.defineMethodAlias = function(name, method) {
	var desc = Object.getOwnPropertyDescriptor(this.klass.prototype, method);

	if (!desc) {
		return false;
	}

	Object.defineProperty(this.klass.prototype, name, desc);

	return true;
};

SaphireClass.prototype.defineMethod = function(name, method) {
	if (!method) {
		 method = name;
		 name = null;
	}

	if (!name) {
		name = method.name;
	}

	method = prepareFunction(method);
	method.owner = this.klass;

	setFunctionName(method, name);

	Object.defineProperty(this.klass.prototype, name,  {
		configurable: true,
		enumerable: false,
		writable: false,
		value: method
	});

	return true;
};

SaphireClass.prototype.defineAccessor = function(name, get, set) {
	var getterName = '__get_' + name;
	var setterName = '__set_' + name;
	var prop = Object.getOwnPropertyDescriptor(this.klass.prototype, name);

	if (!prop) {
		prop = {
			configurable: true,
			enumerable: false,
			get: function() {
				return this[getterName]();
			},
			set: function(value) {
				return this[setterName](value);
			}
		};

		setFunctionName(prop.get, name);
		setFunctionName(prop.set, name + '=');

		Object.defineProperty(this.klass.prototype, name, prop);
	}

	if (get) {
		this.defineMethod(getterName, get);
	}

	if (set) {
		this.defineMethod(setterName, set);
	}
};

SaphireClass.prototype.defineSetter = function(name, fn) {
	this.defineAccessor(name, undefined, fn);
};

SaphireClass.prototype.defineGetter = function(name, fn) {
	this.defineAccessor(name, fn, undefined);
};

SaphireClass.prototype.undefineMethod = function(name) {
	Object.defineProperty(this.klass.prototype, name, {
		configurable: true,
		enumerable: false,
		value: undefined
	});
};

SaphireClass.prototype.undefineAccessor = function(name) {
	this.undefineMethod('__get_' + name);
	this.undefineMethod('__set_' + name);
};

SaphireClass.prototype.removeMethod = function(name) {
	delete this.klass.prototype[name];
};

SaphireClass.prototype.removeAccessor = function(name) {
	delete this.klass.prototype['__get_' + name];
	delete this.klass.prototype['__set_' + name];
};

// Expose all prototype methods as static too
Object.keys(SaphireClass.prototype).forEach(function(key) {
	SaphireClass[key] = function() {
		var args = Array.prototype.slice.call(arguments);
		var klass = SaphireClass.fromConstructor(args.shift());

		return SaphireClass.prototype[key].apply(klass, args);
	};
});

// Gets a SaphireClass from a constructor
SaphireClass.fromConstructor = function(constructor) {
	if (constructor instanceof SaphireClass) {
		return constructor;
	}

	return constructor ? constructor.__iclass__ || null : null;
};

// Creates singleton class for object
SaphireClass.makeMetaclass = function(obj) {
	if (obj &&
		(obj.__iclass__ instanceof SaphireClass) &&
		obj.__iclass__.type == SaphireClass.CLASS) {
		return obj.__iclass__.createMetaclass();
	} else {
		return SaphireClass.createSingletonClass(obj);
	}
};

SaphireClass.createSingletonClass = function(obj) {
	var originalClass = SaphireClass.getClassOf(obj, true);
	var klass = new SaphireClass(Shared.Class, SaphireClass.CLASS);

	klass.singleton = true;
	klass.setSuperclass(originalClass);

	SaphireClass.setClassOf(obj, klass);
	
	klass.setAttachedSingletonClass(obj);

	var realClass = originalClass.getRealClass();
	var metaclass = realClass.getMetaclass();

	klass.setMetaclass(metaclass);

	return klass;
};

SaphireClass.singletonClassOf = function(obj) {
	if (obj instanceof Number || obj instanceof Boolean) {
		throw new TypeError("can't define singleton");
	}

	var klass = SaphireClass.getClassOf(obj, true);

	if (!klass.singleton || klass.getAttachedSingletonClass() != obj) {
		klass = SaphireClass.makeMetaclass(obj);
	}

	return klass;
};

// Get object singleton class
SaphireClass.getSingletonClass = function(obj) {
	var klass = SaphireClass.singletonClassOf(obj);

	if (klass.type == SaphireClass.CLASS) {
		klass.ensureMetaclass();
	}

	return klass;
};

// Changes object class
SaphireClass.setClassOf = function(obj, klass) {
	if (obj instanceof SaphireClass) {
		throw new Error("can't set class of SaphireClass");
	}

	if (klass instanceof SaphireClass) {
		klass = klass.getConstructor();
	}

	if (klass) {
		Object.setPrototypeOf(obj, klass.prototype);
	} else {
		Object.setPrototypeOf(obj, null);
	}
};

// Get object class, if internal is true returns it interal class(SaphireClass)
SaphireClass.getClassOf = function(obj, internal) {
	if (obj instanceof SaphireClass) {
		throw new Error("can't get class of SaphireClass");
	}

	var klass = obj.__class__;

	if (internal) {
		klass = SaphireClass.fromConstructor(klass);
	}

	return klass;
};

// Get real object class
// i.e.: not a singleton and not an included class
SaphireClass.getRealClassOf = function(obj) {
	return SaphireClass.getClassOf(obj, true).getRealClass();
};

// Creates new basic class from scratch
SaphireClass.createBasicClass = function(name, superclass) {
	var klass = new SaphireClass(Shared.Class, SaphireClass.CLASS);

	klass.setName(name);
	klass.setSuperclass(superclass);

	return klass;
};

// Create new basic class from existing constructor
SaphireClass.createNativeClass = function(name, klass, superclass) {
	var klass = new SaphireClass(Shared.Class, SaphireClass.CLASS, klass);

	klass.setName(name);
	klass.setSuperclass(superclass);

	return klass;
};

// Initializes class hierarchy
SaphireClass.initialize = function() {
	Shared.Object = SaphireClass.createNativeClass('Object', Object, null).getConstructor();
	Shared.SuperObject = SaphireClass.createBasicClass('SuperObject', Object).getConstructor();
	Shared.Module = SaphireClass.createBasicClass('Module', Shared.SuperObject).getConstructor();
	Shared.Class = SaphireClass.createBasicClass('Class', Shared.Module).getConstructor();

	SaphireClass.setClassOf(Shared.SuperObject, Shared.Class);
	SaphireClass.setClassOf(Shared.Object, Shared.Class);
	SaphireClass.setClassOf(Shared.Module, Shared.Class);
	SaphireClass.setClassOf(Shared.Class, Shared.Class);
};

module.exports = SaphireClass;

