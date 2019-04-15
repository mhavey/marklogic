'use strict';

const utils = require('/ext/declarative-mapper/utils.sjs');
const CompileError = require('/ext/declarative-mapper/errors/CompileError.sjs');
// private method names to this module
const addError = Symbol('addError');
const stack = Symbol('stack');
const compilerContext = Symbol('compilerContext');

/**
 * Accumulates compiler errors
 */
class CompileErrorAccumulator {
    constructor() {
        this.errorList = [];
        this.stack = null;
        this.compilerContext = null;
    }

    get hasErrors() { return this.errorList.length > 0; }

    get errors() { return this.errorList; }

    [stack]() { return this.stack; }

    [compilerContext]() { return this.compilerContext; }

    addVarError(compileError, varName) {
        this[addError](compileError, { variableName: varName });
    }

    addExpressionError(compileError) {
        this[addError](compileError, compileError.location);
    }

    [addError](compileError, location) {
        if (!(compileError instanceof CompileError)) 
            throw compileError;
            
        this.errorList.push({
            "message": compileError.message,
            "parseTree": compileError.tree,
            "expression": (typeof compileError.parseTree == 'string' ? compileError.parseTree : utils.expressionFromAST(compileError.tree)),
            "location": location
        });
        if (this.errorList.length == 1) {
            this.stack = compileError.stack;
            this.compilerContext = compileError.context;
        }
    }
}
/**
 * Accumulates errors from multiple CompileErrors
 */
class CompileErrorListError extends Error {
    /**
    * Constructors a new CompileError.
    * @param {compilesErrorAccumulator} accumulated error object
    */
    constructor(compileErrorAccumulator) {
        super("Compile Errors");
        this.name = 'CompileErrorListError';

        this.errorList = compileErrorAccumulator.errors
        this.stack = compileErrorAccumulator[stack]();
        this.compilerContext = compileErrorAccumulator[compilerContext]();
    }
    get errors() { return this.errorList; }
    get context() { return compilerContext; }
}

module.exports = {
    CompileErrorAccumulator,
    CompileErrorListError,
};