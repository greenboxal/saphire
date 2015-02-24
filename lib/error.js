var Shared = require('./shared');
var SaphireVM = require('./vm');
var SaphireClass = require('./class');

function ErrorInitialize(message) {
	Error.captureStackTrace(this, arguments.callee);

	Object.defineProperty(this, 'name', {
		enumerable: false,
		value: this.constructor.name
	});

	Object.defineProperty(this, 'message', {
		enumerable: false,
		value: message
	});
};

exports.initialize = function() {
	// Base Class
	SaphireClass.createNativeClass('Error', Error, Shared.SuperObject);

	// Use 'constructor' property from SuperObject
	%DeleteProperty(Error.prototype, 'constructor', 1);

	// NOTE: This won't be called when constructing Error
	SaphireClass.defineMethod(Error, 'initialize', ErrorInitialize);

	// Basic Types
	Shared.StandardError = new Shared.Class('StandardError', Error);
	Shared.ScriptError = new Shared.Class('ScriptError', Error);
	Shared.SecurityError = new Shared.Class('SecurityError', Error);

	// Script Errors
	Shared.SyntaxError = SaphireClass.createNativeClass('SyntaxError', SyntaxError, Shared.ScriptError);
	Shared.EvalError = SaphireClass.createNativeClass('EvalError', EvalError, Shared.ScriptError);
	Shared.NotImplementedError = new Shared.Class('NotImplementedError', Shared.ScriptError);

	// Standard Errors
	Shared.RangeError = SaphireClass.createNativeClass('RangeError', RangeError, Shared.StandardError);
	Shared.ReferenceError = SaphireClass.createNativeClass('ReferenceError', ReferenceError, Shared.StandardError);
	Shared.URIError = SaphireClass.createNativeClass('URIError', URIError, Shared.StandardError);
	Shared.TypeError = SaphireClass.createNativeClass('TypeError', TypeError, Shared.StandardError);
	Shared.NameError = new Shared.Class('NameError', Shared.NameError);
	Shared.NoMethodError = new Shared.Class('NoMethodError', Shared.NameError);
	Shared.ArgumentError = new Shared.Class('ArgumentError', Shared.ArgumentError);
	Shared.IndexError = new Shared.Class('IndexError', Shared.IndexError);
	Shared.KeyError = new Shared.Class('KeyError', Shared.IndexError);

	SaphireVM.defineGlobal('StandardError', Shared.StandardError);
	SaphireVM.defineGlobal('ScriptError', Shared.ScriptError);
	SaphireVM.defineGlobal('SecurityError', Shared.SecurityError);
	SaphireVM.defineGlobal('NotImplementedError', Shared.NotImplementedError);
	SaphireVM.defineGlobal('NameError', Shared.NameError);
	SaphireVM.defineGlobal('NoMethodError', Shared.NoMethodError);
	SaphireVM.defineGlobal('ArgumentError', Shared.ArgumentError);
	SaphireVM.defineGlobal('IndexError', Shared.IndexError);
	SaphireVM.defineGlobal('KeyError', Shared.KeyError);
	SaphireVM.defineGlobal('NotImplementedError', Shared.NotImplementedError);
};

