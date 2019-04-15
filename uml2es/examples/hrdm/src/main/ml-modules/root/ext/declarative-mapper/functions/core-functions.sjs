/*jshint esversion: 6 */
/* globals fn */
/* globals cts */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */

'use strict';

/*
 * Built in functions used by the core engine. Most of these
 * implement operators.
 * Version: 0.1.1
 * Date: 2018-06-30
 * Modification: 0.1.1 - moved to new location, updated for new function
 *   discovery and loading model
 *
 */

const logger = require('/ext/declarative-mapper/logging.sjs');
const utils = require('/ext/declarative-mapper/utils.sjs');
const RuntimeError = require('/ext/declarative-mapper/errors/RuntimeError.sjs');
const CONST = require('/ext/declarative-mapper/const.sjs');


/**
 * Get the value of a variable. Variables are evaluated at the beginning
 * of each record. This means that:
 *      we know if errors occur
 *      unused variables are an efficiency cost
 *      multiple uses of a variable are efficient.
 * Given this, we can simplify variable evaluation down to a single
 * lookup call.
 * @param {object} runtimeContext the current context
 * @param {string} name the variable name
 * @return {any} the variable value.
 */
function get(runtimeContext, name) {
    // We need to see if the variable exists...
    if (runtimeContext.variableSequence.indexOf(name) == -1) {
        throw new RuntimeError('Undefined variable referenced - ' + name,
            runtimeContext);
    }

    const value = runtimeContext.current.variables[name];

    if (value instanceof RuntimeError) {
        throw value;
    }
    return value;
}

/**
 * Get the nth value from the input. If the input is an array
 * return the nth value from that array. If it isn't return
 * null (and log a warning). If the input is an array and doesn't
 * have enough values, do the same.
 * IMPORTANT - this is code for humans not C programmers - indexes
 * start at one not zero.
 * @param {array} inputArray - the array to be extracted from
 * @param {integer} idx - the index into the input value
 * @return {any} either null or a value from an array
*/
function atIndex(inputArray, idx) {
    // Is the index actually an integer. This is required for those
    // times when the index is the result of a call expression.
    if (isNaN(parseInt(idx, 10))) {
        // Rethrow to add runtime context at caller.
        throw new RuntimeError('Index parameter is not an integer - ' +
            xdmp.quote(idx));
    }

    // Not an array?
    if (! Array.isArray(inputArray)) {
        logger.warning('atIndex',
            'input array is not actually an array: ' + xdmp.quote(inputArray));

        // If the required index is one just return anyway.
        if (idx == 1) {
            logger.warning('atIndex', 'returning input as a single value');
            return inputArray;
        } else {
            return null;
        }
    }

    // Is idx positive?
    if (idx < 1) {
        logger.warning('atIndex', 'Index is less than one - ' + idx);
    }

    // Are we within the array bounds?
    if (inputArray.length < idx) {
        logger.warning('atIndex', 'Index ' + idx +
            ' is beyond the end of the array ' + xdmp.quote(inputArray) );
        return null;
    }

    // Good.
    return inputArray[idx - 1];
}


/**
 * Basic arithmatic. Addition
 * @param {number} x - first value to add
 * @param {number} y - second value to add
 * @return {number} - the result
 */
function add(x, y) {
    if (isNaN(x) || isNaN(y)) {
        throw new RuntimeError('Both arguments for addition must be numbers - "'
            + xdmp.quote(x) + '" or "' + xdmp.quote(y) + '" is not a number');
    }

    return x + y;
}

/**
 * Basic arithmatic. Subraction
 * @param {number} x - input value for subtraction
 * @param {number} y - value to subtract
 * @return {number} the result
 */
function subtract(x, y) {
    if (isNaN(x) || isNaN(y)) {
        throw new RuntimeError(
            'Both arguments for subtraction must be numbers - "'
            + xdmp.quote(x) + '" or "' + xdmp.quote(y) + '" is not a number');
    }

    return x - y;
}

/**
 * Basic arithmatic. Multiplication
 * @param {number} x - first value to multiply
 * @param {number} y - second value to add
 * @return {number} the result
 */
function multiply(x, y) {
    if (isNaN(x) || isNaN(y)) {
        throw new RuntimeError(
            'Both arguments for multiplication must be numbers - "'
            + xdmp.quote(x) + '" or "' + xdmp.quote(y) + '" is not a number');
    }

    return x * y;
}

/**
 * Basic arithmatic. Division
 * @param {number} x - input value for subtraction (as a function)
 * @param {number} y - value to divide by (as a function)
 * @return {number} the result
 */
function divide(x, y) {
    if (isNaN(x) || isNaN(y)) {
        throw new RuntimeError('Both arguments for division must be numbers - "'
            + xdmp.quote(x) + '" or "' + xdmp.quote(y) + '" is not a number');
    }

    if (y == 0) {
        throw new RuntimeError('Division by zero');
    }

    return x / y;
}

/**
 * Multiple value concatenation function.
 * @param {array} strings - values to concatenate
 * @return {string}
 */
function concat(...strings) {
    return [''].concat(strings).join();
}

/**
 * Support for string || binary concat operator
 * @param {number|string} x - input value for concat2
 * @param {number|string} y - value to concat2
 * @return {string} the result
 */
function concat2(x, y) {
    // concat empty string to assure numeric conversion if args are numbers
    return ''+x+y;
}

/**
 * Default function. Returns the first value
 * in the input array that is not undefined, null
 * or an empty array. This function performs lazy evaluation.
 * @param {object} runtimeContext - the runtime context
 * @param {array} args - an array of possible values
 * @return {any} the first true value or an empty array
*/
function coalesce(runtimeContext, ...args) {
    // Args are unevaluated.
    for (const arg of args) {
        const result = arg(runtimeContext);
        xdmp.log(result);
        if (isTrue(result)) {
            return result;
        }
    }
    return null;
}


/**
 * To get loop index
 * @param {object} runtimeContext - the current runtime context
 * @param {integer} num - [optional] zero indicate current loop, -1 for parent
 *  loop, -2 for grand-parent loop, etc.
 * @return {integer} loop index for the given loop indicator
 */
function loopIndex(runtimeContext, numStr) {
    let num = 0;
    if (numStr) {
        num = parseInt(numStr);
        if (0 < num) {
            throw new RuntimeError('loopIndex argument is not zero or negative: '
                + num, runtimeContext);
        }
    }

    let indexList = runtimeContext[CONST.INDEX_LIST];
    if (!indexList || 0 == indexList.length) {
        throw new RuntimeError('loopIndex was called outside of a loop',
            runtimeContext);
    }

    let endIndex = indexList.length - 1;

    if (!num) {
        return indexList[endIndex];
    } else {
        let idx = endIndex + num;
        if (0 > idx) {
            throw new RuntimeError(
                'Bad loopIndex argument, should be more than: '
                + (-endIndex) + ' but getting: ' + num, runtimeContext);
        }
        return indexList[idx];
    }
}

/**
 * Get the value of a system variable
 * @param {object} runtimeContext the current runtime context
 * @param {string} name the name of the variable to be retrieved
 * @return {any} value stored in variable.
 */
function getSysVar(runtimeContext, name) {
    let sysVars = runtimeContext[CONST.SYSTEM_VARS];

    if (sysVars) {
        return sysVars[name];
    }

    return null;
}


/**
 * Basic boolean test for truth from an XPath-ish point of
 * view.
 * If the input is an atomic use the inverse of that value.
 * If the input is an array, we use XPath semantics and return
 * true if the array has members, false otherwise. Objects will
 * always return a true value.
 * @param {any} test - the value to be tested.
 * @return {boolean}
 */
function isTrue(test) {
    if (Array.isArray(test)) {
        return test.length != 0;
    }

    if (Object(test) === test) {
        return true;
    }

    // Otherwise just use standard semantics
    return test ? true : false;
}

/** Test function
 * Compares the LHS and the RHS parameters according to the function passed
 * as the third parameter. If one or more tests evaluates to a true value
 * returns true. If not, returns false. If either or both of the operands
 * are arrays, they are flattened before testing.  We use XPath like semantics
 * here. That means that if either or both sides are arrays each value will
 * be compared to all values on the other side. If any comparison returns
 * true, the entire operation will be considered true.
 * @param {any} lhs - left hand operand
 * @param {any} rhs - right hand operand
 * @param {function} testFn - the function used to test the pairs. This should
 *  accept two arguments and return true or false.
 * @return {boolean} true or false
 */
function testValues(lhs, rhs, testFn) {
    // This turns them into arrays, possibly single item ones
    const flatLhs = utils.flatten(lhs);
    const flatRhs = utils.flatten(rhs);

    for (const l of flatLhs) {
        for (const r of flatRhs) {
            if (testFn(l, r)) return true;
        }
    }

    return false;
}

/**
 * Boolean less than
 * Returns true if the lhs is less than the rhs
 * @param {any} lhs - left hand operand
 * @param {any} rhs - right hand operand
 * @return {boolean} true if lhs < rhs or false otherwise
 */
function lt(lhs, rhs) {
    return testValues(lhs, rhs, (x, y) => x < y);
}

/**
 * Boolean less than or equal
 * Returns true if the lhs is less than or equal the rhs
 * @param {any} lhs - left hand operand
 * @param {any} rhs - right hand operand
 * @return {boolean} true if lhs <= rhs or false otherwise
 */
function lte(lhs, rhs) {
    return testValues(lhs, rhs, (x, y) => x <= y);
}

/**
 * Boolean greater than
 * Returns true if the lhs is greater than the rhs
 * @param {any} lhs - left hand operand
 * @param {any} rhs - right hand operand
 * @return {boolean} true if lhs > rhs or false otherwise
 */
function gt(lhs, rhs) {
    return testValues(lhs, rhs, (x, y) => x > y);
}

/**
 * Boolean greater than or equal
 * Returns true if the lhs is greater than or equal the rhs
 * @param {any} lhs - left hand operand
 * @param {any} rhs - right hand operand
 * @return {boolean} true if lhs >= rhs or false otherwise
 */
function gte(lhs, rhs) {
    return testValues(lhs, rhs, (x, y) => x >= y );
}

/**
 * Boolean equality
 * Returns true if the lhs is equal to the rhs
 * @param {any} lhs - left hand operand
 * @param {any} rhs - right hand operand
 * @return {boolean} true if lhs == rhs or false otherwise
 */
function eq(lhs, rhs) {
    return testValues(lhs, rhs, (x, y) => x == y );
}

/**
 * Boolean inequality
 * Returns true if the lhs is not equal to the rhs
 * @param {any} lhs - left hand operand
 * @param {any} rhs - right hand operand
 * @return {boolean} true if lhs >= rhs or false otherwise
 */
function ne(lhs, rhs) {
    return testValues(lhs, rhs, (x, y) => x != y );
}

/**
 * Boolean and
 * Given two inputs return true if both are true and false otherwise..
 * Note: this function receives unevaluated arguments
 * @param {object} runtimeContext - the current runtime context (unused)
 * @param {function} lhs - left hand operand
 * @param {function} rhs - right hand operand
 * @return {boolean} true if lhs >= rhs or false otherwise
 */
function and(runtimeContext, lhs, rhs) {
    xdmp.log(lhs);
    if (!isTrue(lhs(runtimeContext))) {
        return false;
    }
    return isTrue(rhs(runtimeContext));
}

/**
 * Boolean or
 * Given two inputs return true if either or both are true and false otherwise.
 * Note: this function receives unevaluated arguments
 * @param {object} runtimeContext - the current runtime context (unused)
 * @param {function} lhs - left hand operand
 * @param {function} rhs - right hand operand
 * @return {boolean} true if lhs >= rhs or false otherwise
 */
function or(runtimeContext, lhs, rhs) {
    // Written this way, it short circuits (although our
    // current implentation evaluates all arguments)
    if (isTrue(lhs(runtimeContext))) return true;
    return isTrue(rhs(runtimeContext));
}

/**
 * Boolean not
 * Given an input return the logical inverse of that input.
 * @param {any} test - the value to be inverted.
 * @return {boolean} the logical inverse of the input parameter
 */
function not(test) {
    return isTrue(test) ? false : true;
}

/**
 * Conditional
 * Implements if ... then ... else
 * If the first argument evaluates to true then return the
 * second argument. Otherwise, return the third.
 * NOTE: this function receives unevaluated arguments.
 * @param {object} runtimeContext - the current runtime context
 * @param {function} condition - condition to be checked for truth
 * @param {function} trueResult - return if condition is true
 * @param {function} falseResult - return if condition if false, if false
 *  clause is not provide false is returned
 * @return {any} trueResult or falseResult
 */
function ifThenElse(runtimeContext, condition, trueResult, falseResult) {
    if (isTrue(condition(runtimeContext))) {
        return trueResult(runtimeContext);
    } else {
        if (!falseResult) {
            return false;
        } else {
            return falseResult(runtimeContext);
        }
    }
}

/**
 * Lists. This function simply returns an array from its arguments,
 * flattening the array if not already. This is the underlying
 * implementation of the [] syntax in the expression language.
 * @param {array} ...args The arguments to be flattened
 * @return {array} a single array
 */
function list(...args) {
    return utils.flatten(args);
}

/**
 * Literals - simply returns the first input argument.
 * @param {any} arg the argument to be returned
 * @return {any} returns arg
 */
function literal(arg) {
    return arg;
}

/**
 * This function is called by the function loader to allow this module to
 * register functions with the runtime.
 * @param {function} registrationFn - the function to call to register a single
 * @param {object} compilerContext - the current compiler context
 * @param {object} defaultMeta - the default function metadata.
 */
function registerFunctions(registrationFn, compilerContext, defaultMeta) {
    const lazyFnMeta = Object.assign({}, defaultMeta,
        {lateEvaluation: true, needsContext: true});
    const contextFnMeta = Object.assign({}, defaultMeta, {needsContext: true});

    registrationFn(add);
    registrationFn(subtract);
    registrationFn(divide);
    registrationFn(multiply);
    registrationFn(concat2);
    registrationFn(atIndex, Object.assign({}, defaultMeta, {name: 'index'}));
    registrationFn(not);
    registrationFn(lte);
    registrationFn(lt);
    registrationFn(gte);
    registrationFn(gt);
    registrationFn(eq);
    registrationFn(ne);
    registrationFn(literal);
    registrationFn(list);
    registrationFn(concat);

    // call coalesce as 'default' as well.
    registrationFn(coalesce, lazyFnMeta);
    registrationFn(coalesce, Object.assign({}, lazyFnMeta, {name: 'default'}));

    registrationFn(or, lazyFnMeta);
    registrationFn(and, lazyFnMeta);
    registrationFn(ifThenElse, Object.assign({}, lazyFnMeta, {name: 'if'}));

    registrationFn(get, contextFnMeta);
    registrationFn(loopIndex, contextFnMeta);
    registrationFn(getSysVar, contextFnMeta);
}


exports.registerFunctions = registerFunctions;
