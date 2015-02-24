// First of all, enable natives syntax
require('setflags').setFlags('--allow-natives-syntax');

var Shared = require('./shared');
var SaphireVM = require('./vm');
var SaphireClass = require('./class');
var SaphireObject = require('./object');
var SaphireMethod = require('./method')
var SaphireError = require('./error')

// Initialization process
SaphireVM.initialize();
SaphireClass.initialize();
SaphireObject.initialize();
SaphireMethod.initialize();
SaphireError.initialize();

