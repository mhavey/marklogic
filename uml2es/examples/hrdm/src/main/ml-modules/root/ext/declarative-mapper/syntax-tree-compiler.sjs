/*jshint esversion: 6 */
/* globals fn */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */
'user strict';

/*
 * Build a function to be called when the input is processed.
 * Functions are not called at this time.
 * Use JSEP to build an AST which is then walked.
 * @version 0.1.0
 * @author Nic Gibson
 * @date 2018-03-27
 * @todo consider how we might handle recursive loops.
 */

const logger = require('/ext/declarative-mapper/logging.sjs');
const CompileError = require('/ext/declarative-mapper/errors/CompileError.sjs');
const { CompileErrorAccumulator, CompileErrorListError }
    = require('/ext/declarative-mapper/errors/CompileErrorListError.sjs');
const parser = require('/ext/declarative-mapper/expression-parser.sjs');
const utils = require('/ext/declarative-mapper/utils.sjs');
const CONST = require('/ext/declarative-mapper/const.sjs');

/*
 * NOTE on compiler state
 * The compiler state is a map containing data useful
 * to the compilation process including
 *     known functions (built ins)
 *     previously compiled functions
 */

/**
  * Compile the AST and start the walk
  * @param {string} expression - the expression to be compiled
  * @param {object} compilerContext - the compiler state
  * @param {boolean} circularCheck - set to true to test for circular references
  * @return {function} a functional evaluation of the expression
*/
function compileExpression(expression, compilerContext) {
    const ast = parser.parseExpression(expression, compilerContext);
    return buildFunction(ast, compilerContext);
}

/**
 * Given a parsed expression, compile it and wrap it with a tracer
 * function if required.
 * @param {object} ast - the parsed expression as an AST
 * @param {object} compilerContext - the compiled context
 * @return {function} - the compiled function
 */
function buildFunction(ast, compilerContext) {
    // Compile to functions
    const compiled = compileAST(ast, compilerContext);

    if (compilerContext.flags && compilerContext.flags.trace) {
        return traceOuterWrapper(compiled, ast);
    } else {
        return compiled;
    }
}

/**
 * Compile a rewritten AST. At this point the AST consists of call
 * expressions and literals.
 * @param {object} ast - call or literal expressoin
 * @param {object} compilerContext - the current compiler state
 * @return {function} compiled subtree
 */
function compileAST(ast, compilerContext) {
    switch (ast.type) {
        case 'Literal':
            return compileLiteral(ast);
        case 'CallExpression':
            return compileCallExpr(ast, compilerContext);
        case 'Identifier':
            throw new CompileError(
                'Bare identifier found, did you mean to quote it? ' +
                'Identifer is "' + ast.name + '"', ast, compilerContext);
        default:
            throw new CompileError('Unexpected compilation target: ' + ast.type,
                ast, compilerContext);
    }
}

/**
 * Compile a literal expression. At this point the AST consists of call
 * expressions and literals.
 * @param {object} ast - literal expression
 * @return {function} compiled subtree
 */
function compileLiteral(ast) {
    const literalFn = function () {
        return ast.value;
    };
    literalFn.expression = utils.expressionFromAST(ast);
    return literalFn;
}

/**
 * Compile call expression. At the point at which this is called the entire
 * AST has been rewritten as nested call expressions and literals
 * @param {object} ast - a call expression (function call) or literal
 * @param {object} compilerContext - compilation state
 * @return {function} compiled subtree
 */
function compileCallExpr(ast, compilerContext) {
    // Build the array of argument functions
    const thisFunction = identifyFunction(ast, compilerContext);

    const finalArgs = [].concat(
        thisFunction.metadata.needsDocument ?
            function () {
                let docs = compilerContext.runtimeContext[CONST.DOCS_KEY];
                if (docs && 0 < docs.length) {
                    return docs[docs.length - 1];
                }
                return compilerContext.runtimeContext.doc;
            } : [],
        thisFunction.metadata.needsContext ?
            function () {
                return compilerContext.runtimeContext;
            } : [],
        ast.arguments.map((arg) => compileAST(arg, compilerContext)));

    // If the metadata requires lateEvaluation, this is simple:
    let compiledFunction = null;
    if (thisFunction.metadata.lateEvaluation) {
        compiledFunction = function (runtimeContext) {
            try {
                return thisFunction.implementation(...finalArgs);
            } catch (e) {
                e.expression = utils.expressionFromAST(ast);
                e.runtimeContext = runtimeContext;
                throw e;
            }
        };
    } else {
        // Create a function that evaluates its arguments before calling.
        // We need to check if runtimeContext is a function because it
        // will be if we were called from a late evaluating function.
        compiledFunction = function (runtimeContext) {
            const context = typeof runtimeContext == 'function' ?
                runtimeContext() : runtimeContext;
            const argValues = finalArgs.map(
                (arg) => arg(context));
            try {
                return thisFunction.implementation(...argValues);
            } catch (e) {
                e.expression = utils.expressionFromAST(ast);
                e.runtimeContext = runtimeContext;
                throw e;
            }
        };
    }

    // Tag with metadata - it might be useful one day.
    compiledFunction.metadata = thisFunction.metadata;

    return compilerContext.flags.trace ?
        traceFnWrapper(ast.callee.name, compiledFunction, compilerContext) :
        compiledFunction;
}

/**
 * Parse variables into tree and find references
 * @param {object} compilerContext - current compilation context
 * @return {object} parsed variables and references
 */
function parseVariables(compilerContext) {
    const workingData = {};
    let errorList = new CompileErrorAccumulator();

    for (let variableName of Object.keys(compilerContext.variables)) {
        const expression = compilerContext.variables[variableName];
        let tree = null;
        try {
            tree = parser.parseExpression(expression, compilerContext);

            const references = findVariableReferences(tree, compilerContext);

            logger.debug('compileVariables',
                'References to variable ' + '"' + variableName + '": ',
                xdmp.quote(references));

            workingData[variableName] = {
                tree: tree,
                references: references,
                expression: expression,
                metadata: {}
            };
            logger.debug('compileVariables', 'Parsed variable ' + variableName +
                ' to ' + xdmp.quote(workingData[variableName]));
        } catch (e) {
            errorList.addVarError(e, variableName );
            xdmp.log("Got error: "+variableName);
        }
    }
    if (errorList.hasErrors) {
        throw new CompileErrorListError(errorList);
    }

    return workingData;
}

/**
 * build variable functions and place in compilerContext
 * @param {object} compilerContext - current compilation context
 * @param {object} workingData - parsed variables
 */
function buildVarFuncs(compilerContext, workingData) {
    let errorList = new CompileErrorAccumulator();

    for (let variableName of Object.keys(compilerContext.variables)) {
        const variableData = workingData[variableName];
        let varFunction = null;
        try {
            varFunction = buildFunction(
                variableData.tree,
                compilerContext);
        } catch (e) {
            errorList.addVarError(e, variableName );
        }
        if (varFunction) {
            compilerContext.runtimeContext.variables[variableName] = varFunction;
        }
    }
    if (errorList.hasErrors) {
        throw new CompileErrorListError(errorList);
    }
}

/**
 * Given a map of variables, compile each one to a function
 * and return a new map. This is used to build the variables
 * object used in the runtime context.
 * Variables need to be checked for circular references
 * before compilation.
 * @param {object} compilerContext - current compilation context
 * @return {object} same as compilerContext.runtimeContext.variables
 */
function compileVariables(compilerContext) {
    // First parse each variable into trees, get the references
    // and build the structure we use in the main compiler
    compilerContext.runtimeContext.variables = {};


    if (!compilerContext.variables) {
        compilerContext.runtimeContext.variables = {};
        return compilerContext.runtimeContext.variables;
    }

    const workingData = parseVariables(compilerContext);

    // Check for circular references (this can raise exceptions)
    let variableName = null;
    try {
        for (variableName of Object.keys(workingData)) {
            circularCheck(variableName, workingData);
        }
    } catch (e) {
        const err = new CompileErrorAccumulator();
        err.addVarError(e, variableName);
        throw new CompileErrorListError(errorList);
    }

    buildVarFuncs(compilerContext, workingData);

    // Generate a sorted set of variable names in dependancy order so that
    // dependant variables can be evaluated last. Sort using the references
    // list as a key, sorting variables alphabetically where there is no
    // depedancy relationship.
    let variableSequence = Object.keys(compilerContext.variables);

    variableSequence.sort(function (a, b) {
        const aRefs = workingData[a].references;
        const bRefs = workingData[b].references;
        if (bRefs.indexOf(a) != -1) {
            return -1;
        } else if (aRefs.indexOf(b) != -1) {
            return 1;
        } else {
            return 0;
        }
    });

    logger.debug('compileVariables', 'Variable evaluation sequence set to ' +
        xdmp.quote(variableSequence));
    compilerContext.runtimeContext.variableSequence = variableSequence;

    return compilerContext.runtimeContext.variables;
}

/**
 * Given a variable name and an abstract syntax tree,
 * search the tree 'downwards' for any occurrence of the
 * variable name to ensure that circular references are avoided.
 * @param {string} variableName - the name of the variable
 *  (without the initial $)
 * @param {object} compiled - the variable compilation data
 *  false if not
 */
function circularCheck(variableName, compiled) {
    let thisReferences = compiled[variableName].references;
    // directly self-referential
    if (thisReferences.indexOf(variableName) != -1) {
        throw new CompileError(
            'Direct circular reference to ' + variableName + ' identified',
            compiled[variableName].tree,
            compiled[variableName].expression);
    }

    // indirectly self referential
    for (let otherVariableName of Object.keys(compiled)) {
        if (thisReferences.indexOf(otherVariableName &&
            variableName != otherVariableName) != -1) {
            let otherReferences = compiled[variableName].references;
            if (otherReferences.indexOf[variableName] != -1) {
                throw new CompileError(
                    'Indirect circular reference to ' + variableName + ' identified',
                    compiled[otherVariableName].tree,
                    compiled[otherVariableName].expression);
            }
        }
    }
}


/**
 * Given a variable find any other variables that it references. This is
 * used by the circular reference detection to find out if a variable
 * definition either references itself directly or indirectly.
 * @param {object} ast - the tree that defines a variable.
 * @param {object} compilerContext - the current compilation context
 * @return {array} - variables referenced
 */
function findVariableReferences(ast, compilerContext) {
    logger.debug('findVariable', 'Finding references for ' + xdmp.quote(ast));
    if (ast.type == 'CallExpression') {
        // Variable reference.
        if (ast.callee.name == 'get') {
            return ast.arguments[0].value;
        } else {
            return utils.flatten(
                ast.arguments.map((x) =>
                    findVariableReferences(x, compilerContext)));
        }
    } else if (ast.type == 'Literal') {
        return [];
    } else {
        throw new CompileError(
            'Impossible AST type found in variable tree - ' + ast.type, ast);
    }
}


/**
 * Use the compile context to find a function to be used in a call
 * expression, raising an error if not found.
 * @param {object} ast - the parsed expression
 * @param {object} compilerContext - the compilation state object
 * @return {function} a function reference.
 */
function identifyFunction(ast, compilerContext) {
    logger.debug(('identifyFunction'),
        'looking for function named ' + ast.callee.name
    );
    const fn = compilerContext.functions[ast.callee.name];
    if (!fn) {
        throw new CompileError('Unknown function - ' +
            ast.callee.name, ast);
    }

    return fn;
}

/**
 * Wrap a compiled tree for tracing.
 * @param {function} func - the compiled tree
 * @param {object} ast -the parsed expression tree
 * @return {any} - whatever func returns
 */
function traceOuterWrapper(func, ast) {
    logger.debug('traceWrapper',
        'generating trace wrapper ' +
        '\nEXPRESSION:' + utils.expressionFromAST(ast) +
        `\n\nAST: ` + xdmp.quote(ast));

    return function (runtimeContext) {
        logger.debug(
            ('expression call'), utils.expressionFromAST(ast) + ' executed ' +
            ' with compiled state ' + xdmp.quote(runtimeContext));
        let result = func(runtimeContext);
        logger.debug(('expression call'), 'returned + ' + xdmp.quote(result));
        return result;
    };
}

/**
 * Wrap a compiled sub-tree for tracing.
 * @param {string} fnName - the name of the function
 * @param {function} func - the compiled tree
 * @param {object} compilerContext - the current compiler context
 * @return {any} - whatever func returns
 */
function traceFnWrapper(fnName, func, compilerContext) {
    logger.debug('traceWrapper', 'generating trace wrapper for ' + fnName);

    return function (runtimeContext) {
        logger.debug(('expression call', fnName),
            'called with context: ' + xdmp.quote(runtimeContext));
        const result = func(runtimeContext);
        logger.debug(('expression call', fnName),
            'returned: ' + xdmp.quote(result));
        return result;
    };
}

exports.compileExpression = compileExpression;
exports.compileVariables = compileVariables;
