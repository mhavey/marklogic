'use strict';

/*
 * Parse an expression into an abstract syntax tree.
 * Optionally, rewrite that tree into an optimal one
 * @version 0.1.0
 * @author Nic Gibson
 * @date 2018-08-21
 */

const logger = require('/ext/declarative-mapper/logging.sjs');
const jsep = require('/ext/declarative-mapper/lib/jsep.sjs');
const CompileError = require('/ext/declarative-mapper/errors/CompileError.sjs');
const utils = require('/ext/declarative-mapper/utils.sjs');

/* Remove all binary ops and unary ops and then add back the ones we want. */
jsep.removeAllUnaryOps();
jsep.removeAllBinaryOps();
jsep.addUnaryOp('@'); // Shorthand for extract()
jsep.addUnaryOp('$'); // Shorthand for get()
jsep.addBinaryOp('+', 9);
jsep.addBinaryOp('-', 9);
jsep.addBinaryOp('*', 10);
jsep.addBinaryOp('/', 10);
jsep.addBinaryOp('=>', 15); // Acts as a pipeline

jsep.addBinaryOp('||', 12); // concatenate args as strings.
/* Boolean operators - allow textual and symbolic */
jsep.addBinaryOp('<', 5);
jsep.addBinaryOp('>', 5);
jsep.addBinaryOp('>=', 5);
jsep.addBinaryOp('<=', 5);
jsep.addBinaryOp('==', 5);
jsep.addBinaryOp('!=', 5);
jsep.addBinaryOp('<>', 5);
jsep.addBinaryOp('lt', 5);
jsep.addBinaryOp('gt', 5);
jsep.addBinaryOp('ge', 5);
jsep.addBinaryOp('le', 5);
jsep.addBinaryOp('eq', 5);
jsep.addBinaryOp('ne', 5);
jsep.addBinaryOp('and', 4);
jsep.addBinaryOp('or', 4);
jsep.addBinaryOp('&', 4);
jsep.addBinaryOp('|', 4);

/* Binary operator to function name mapping :*/
const binaryOperatorMap = {
    '||': 'concat2',
    '+': 'add',
    '-': 'subtract',
    '/': 'divide',
    '*': 'multiply',
    '>': 'gt',
    'gt': 'gt',
    '<': 'lt',
    'lt': 'lt',
    '>=': 'gte',
    'ge': 'gte',
    '<=': 'lte',
    'le': 'lte',
    '==': 'eq',
    'eq': 'eq',
    '!=': 'ne',
    '<>': 'ne',
    'ne': 'ne',
    '&': 'and',
    'and': 'and',
    '|': 'or',
    'or': 'or',
};

/**
 * Build the processing tree by parsing and then rewriting the tree
  * @param {string} expression - the expression to be compiled
  * @param {object} compilerContext - the compiler state
  * @return {object} the rewritten tree.
 */
function parseExpression(expression, compilerContext) {
    // Check for whitespace only expression and fake something
    // more  useful
    const ast = fn.normalizeSpace(expression) == '' ?
        parseWithJsep('""', compilerContext) :
        parseWithJsep(expression, compilerContext);
    return rewriteAST(ast, expression, compilerContext);
}

/**
 * Use our custom version of jsep to parse an expression and get
 * the raw parse.
  * @param {string} expression - the expression to be compiled
  * @param {object} compilerContext - the compiler state
  * @return {object} the parsed string
 */
function parseWithJsep(expression, compilerContext) {
    let ast = null;
    try {
        ast = jsep(expression);
    } catch (e) {
        throw new CompileError('Unable to parse expression', expression,
            compilerContext);
    }

    return ast;
}

/**
  * Walk the AST and rewrite the tree to a nested tree of call expressions
  * @param {object} ast - a parsed tree representation of the expression
  * @param {object} compilerContext - compiler state
  * @return {function} a functional evaluation of the expression
*/
function rewriteAST(ast, compilerContext) {
    logger.debug(('rewriteAST'),
        'Processing expression: ' + utils.expressionFromAST(ast) +
            `\n\n` + xdmp.quote(ast));

    switch (ast.type) {
    case 'CallExpression':
        return rewriteCallExpression(ast, compilerContext);
    case 'UnaryExpression':
        return rewriteUnaryExpression(ast, compilerContext);
    case 'BinaryExpression':
        return rewriteBinaryExpression(ast, compilerContext);
    case 'MemberExpression':
        return rewriteMemberExpression(ast, compilerContext);
    case 'ArrayExpression':
        return rewriteArrayExpression(ast, compilerContext);
    case 'Literal':
        return ast;
    case 'Identifier':
        return ast;
    default:
        throw new CompileError('Unexpected expression type: '
            + ast.type, ast);
    }
}


/**
 * Convert a member expression to a call to the index function. We only allow
 * index values to be numeric literals,  call expressions and variables
 * (the latter allows for calculated indexes but can cause runtime errors).
 * @param {object} ast - the current expression
 * @param {object} compilerContext - the current compiler context
 * @return {function} the compiled subtree
 */
function rewriteMemberExpression(ast, compilerContext) {
    logRewriteExpression(ast);
    let propertyArg = {};

    // We only support computed member expressions (those with a [])
    if (ast.computed === false) {
        throw new CompileError(
            'object.property syntax is not supported.',
            ast, compilerContext);
    }

    switch (ast.property.type) {
    case 'Literal':
        // Must be a number.
        if (isNaN(ast.property.value )) {
            throw new CompileError(
                'Literal index values must be integers: ',
                ast, compilerContext);
        }
        // Must be a positive integer.
        if (parseInt(ast.property.value, 10) < 1 ) {
            throw new CompileError(
                'Literal index values must be positive integers: ',
                ast, compilerContext);
        }
        propertyArg = ast.property;
        break;

    case 'CallExpression':
        propertyArg = rewriteCallExpression(ast.property,
            compilerContext);
        break;
    case 'UnaryExpression':
        if (ast.property.operator == '$') {
            propertyArg = convertToGetExpression(ast.property,
                compilerContext);
        } else {
            throw new CompileError(
                'Only functions, integers and variables are supported in ' +
                'member expressions',
                ast, compilerContext);
        }
        break;

    default:
        throw new CompileError(
            'Only functions, integers and variables are supported in ' +
            'member expressions',
            ast, compilerContext);
    }

    return {
        type: 'CallExpression',
        arguments: [
            rewriteAST(ast.object, compilerContext),
            propertyArg,
        ],
        callee: {
            type: 'Identifier',
            name: 'index',
        },
        original: ast,
    };
}

/**
 * Process array expressions. Array expressions are converted to call
 * expressions and reparsed. Arguments are checked to ensure that they
 * are all literals because we only support arrays of literals.
 * @param {object} ast - the parsed expression
 * @param {object} compilerContext - the current compiler context
 * @return {function} compiled subtree
 */
function rewriteArrayExpression(ast, compilerContext) {
    logRewriteExpression(ast);

    for (const element of ast.elements) {
        if (element.type != 'Literal') {
            throw new CompileError(
                'All elements of an array or list must be literals.',
                ast, compilerContext);
        }
    }

    return {
        type: 'CallExpression',
        arguments: ast.elements,
        callee: {
            type: 'Identifier',
            name: 'list',
        },
        original: ast,
    };
}

/**
 * Walk a call expression. This simply walks the children of the expression
 * and returns the restructured tree.
 * @param {object} ast - a call expression (function call)
 * @param {object} compilerContext - compilation state
 * @return {object} the restructured tree.
 */
function rewriteCallExpression(ast, compilerContext) {
    logRewriteExpression(ast);

    return {
        type: 'CallExpression',
        arguments: ast.arguments.map(
            (arg) => rewriteAST(arg, compilerContext)),
        callee: ast.callee,
        original: ast,
    };
}

/**
 * Rewrite unary expressions as function calls.
 * @param {object} ast - a unary expression tree
 * @param {object} compilerContext - current compiler context
 * @return {object} rewritten subtree
 */
function rewriteUnaryExpression(ast, compilerContext) {
    logRewriteExpression(ast);

    switch (ast.operator) {
    case '@':
        return convertToExtract(ast, compilerContext);
    case '$':
        if (ast.argument.type === 'MemberExpression') {
            return rewriteMemberExpression(
                convertToMemberExpression(ast, compilerContext));
        } else {
            return convertToGetExpression(ast, compilerContext);
        }

    default:
        throw new CompileError('Unknown operator type: ' + ast.operator,
            ast);
    }
}

/**
 * Handle binary operator expressions
 * @param {object} ast - a call expression (function call)
 * @param {string} expression - the raw expression
 * @param {object} compilerContext - compilation state
 * @return {function} compiled subtree
 */
function rewriteBinaryExpression(ast, expression, compilerContext) {
    logRewriteExpression(ast, expression);

    if (binaryOperatorMap[ast.operator]) {
        return rewriteAST(convertToCallExpression(ast, expression,
            binaryOperatorMap[ast.operator]), expression, compilerContext);
    } else if (ast.operator == '=>') {
        return rewriteAST(convertPipelineToCallExpression(ast, expression),
            expression, compilerContext);
    } else {
        throw new CompileError(
            'Unknown binary operator type: ' + ast.operator,
            ast, expression);
    }
}

/**
 * Convert a binary operator to a function call.
 * @param {object} ast - the expression to convert
 * @param {string} expression - the source expression
 * @param {string} name - the name of the function to use
 * @return {function} - the rewritten call
 */
function convertToCallExpression(ast, expression, name) {
    const newAst = {
        type: 'CallExpression',
        arguments: [
            ast.left,
            ast.right,
        ],
        callee: {
            type: 'Identifier',
            name: name,
        },
        original: ast,
    };

    logConversion(ast, newAst);
    return newAst;
}

/**
 * Convert a pipeline expression (x => y) to
 * a function call. This requires that y is a call expression
 * and an error will occur if not.
 * @param {object} ast - the expression to be rewritten
 * @param {string} expression - the source expression
 * @return {object} rewritten expression
 */
function convertPipelineToCallExpression(ast, expression) {
    if (ast.right.type != 'CallExpression') {
        throw new CompileError(
            'RHS of a pipeline expression must be a function call',
            ast, expression);
    }

    const newAst = {
        type: 'CallExpression',
        callee: ast.right.callee,
        arguments: [ast.left].concat(ast.right.arguments),
        original: ast,
    };

    logConversion(ast, newAst);
    return newAst;
}

/**
 * Convert an @ expression to a call to extract.
 * @param {object} ast - the expression to convert
 * @param {string} expression - the source expression
 * @param {object} compilerContext - the current compiler context
 * @return {object} - rewritten expresion
 */
function convertToExtract(ast, expression, compilerContext) {
    let result = {
        type: 'CallExpression',
        callee: {
            type: 'Identifier',
            name: 'extract',
        },
        original: ast,
    };

    switch (ast.argument.type) {
    case 'Literal':
        result.arguments = [ast.argument];
        break;

    case 'Identifier':
        result.arguments = [{
            type: 'Literal',
            value: ast.argument.name,
            raw: '"' + ast.argument.name + '"',
        }];
        break;

    case 'CallExpression':
        result.arguments = ast.argument;
        break;

    default:
        throw new CompileError('Invalid argument for @expression',
            ast, expression, compilerContext);
    }

    logConversion(ast, result);

    return result;
}

/**
 * Convert a unary expression of the form $x[1] to the member
 * expression that would be parsed from ($x)[1].
 * @param {object} ast the parsed expression
 * @return {object} the expression rewrite to a member expression.
 */
function convertToMemberExpression(ast) {
    return {
        type: 'MemberExpression',
        computed: true,
        object: {
            type: ast.type,
            operator: ast.operator,
            argument: ast.argument.object,
            prefix: true,
        },
        property: ast.argument.property,
        origina: ast,
    };
}

/**
 * Convert a variable reference into a get expression. There is
 * no check to ensure that the variable exists
 * Variables *must* be expressed as identifiers.
 * @param {object} ast the syntax tree
 * @param {string} expression the original (full) expression
 * @param {object} compilerContext - the compilation state object
 * @return {object} the variable reference rewritten as a call expression
 */
function convertToGetExpression(ast, expression, compilerContext) {
    const newAst = {
        type: 'CallExpression',
        callee: {
            type: 'Identifier',
            name: 'get',
        },
        arguments: [{
            type: 'Literal',
            value: ast.argument.name,
            raw: '"' + ast.argument.name + '"',
        }],
        original: ast,
    };
    logConversion(ast, newAst);
    return newAst;
}

/**
 * Write a debug message with an expression, and details about the type.
 * @param {object} ast - the parsed expression
 * @return {string} the message logged
*/
function logRewriteExpression(ast) {
    return logger.debug('compileExpression',
        'compiling [[' + utils.expressionFromAST(ast) + ']]' +
        ' as ' + xdmp.quote(ast));
}

/**
 * Write a debug message showing a tree type conversion.
 * @param {object} inputAst -  AST to be converted
 * @param {object} ouputAst - result of conversion
 * @return {string} thhe message logged
 */
function logConversion(inputAst, ouputAst) {
    return logger.debug('compileExpression',
        'Converting input ' + inputAst.type + ' to ' + ouputAst.type +
        '\n\nSource AST: ' + xdmp.quote(inputAst) +
        '\n\nOutput AST: ' + xdmp.quote(ouputAst)
    );
}

exports.parseExpression = parseExpression;
exports.rewriteAST = rewriteAST;
exports.parseWithJsep = parseWithJsep;
