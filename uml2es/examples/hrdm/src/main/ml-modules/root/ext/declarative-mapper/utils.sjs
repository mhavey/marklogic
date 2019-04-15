'use strict';

/*
 * Utility functions called by internals and user callable functions.
 * Most of these exist because adding them as methods of Object
 * or Array could break the principle of least suprise.
 * Version: 0.1.0
 * Date: 2018-07-06
 */

/**
 * Flatten an array and return it.
 * Given one or more arrays, flatten all sub arrays
 * and return a new array containing the contents of all
 * the arrays in the same order.
 * @param {array} args - a variable number of arguments, some of
 *      which may be arrays
 * @return {array} a new flattened array
 */
function flatten(...args) {
    let result = [];
    for (const arg of args) {
        if (Array.isArray(arg)) {
            result = result.concat(flatten(...arg));
        } else {
            result.push(arg);
        }
    }
    return result;
}


/**
 * Construct an approximation of the input sub-expression for
 * debug purposes. If the AST has an 'original' property we
 * use that instead.
 * @param {object} ast the sub-tree to be rebuilt
 * @return {string} the expression
 */
function expressionFromAST(ast) {
    if (ast.original) {
        return expressionFromAST(ast.original);
    } else {
        switch (ast.type) {
        case 'CallExpression':
            return ast.callee.name + '(' + ast.arguments.map(
                (arg) => expressionFromAST(arg)).join(', ') + ')';
        case 'UnaryExpression':
            return ast.operator + expressionFromAST(ast.argument);
        case 'BinaryExpression':
            return expressionFromAST(ast.left) + ' ' + ast.operator + ' ' +
            expressionFromAST(ast.right);
        case 'Literal':
            return ast.raw;
        case 'Identifier':
            return ast.name;
        case 'MemberExpression':
            return expressionFromAST(ast.object) + '['
                + expressionFromAST(ast.property) + ']';
        case 'ArrayExpression':
            return '[' + ast.elements.map(
                (arg) => expressionFromAST(arg)).join(', ') + ']';
        default:
            // well, that shouldn't happen.
            return '';
        }
    }
}


exports.expressionFromAST = expressionFromAST;
exports.flatten = flatten;
