/*jshint esversion: 6 */
/* global xdmp */
/* global fn */
/* global require */
/* global exports */

'use strict';

/**
 * Main runtime. Given a generated template (the function to fill out the
 * template) and a function to build the current values from the runtime
 * context and the document, generate the output and return it.
 */

const logger = require('/ext/declarative-mapper/logging.sjs');

/**
 * Given tne runtime context and the current document, execute the expression
 * set from the context and return an object with expression keys and result.
 * This function also evaluates all variables before the main expressions
 * are evaluated. The function returns true if no errors occur, raises an
 * exception if evaluate fails and debugOutput is false and returns false
 * if debugOutput is true and either call to evaluateExpressions fails.
 * @param {object} document
 * @param {object} runtimeContext
 * @param {boolean} debugOutput set to true if output debug mode is enabled
 * @return {boolean} true on success, false on failure
 */
function evaluate(document, runtimeContext, debugOutput = false) {
    // Some functions need this so we store it in the context
//    runtimeContext.doc = document;
    delete runtimeContext.hasError;
    logger.debug('evaluate', 'Entering evaluation with context ' +
        xdmp.quote(runtimeContext));

    // Variables have to be evaluated first.
    const vResult = evaluateExpressions(document, 'variables', runtimeContext,
        debugOutput);

    const eResult = evaluateExpressions(document, 'expressions', runtimeContext,
        debugOutput);

    logger.debug('evaluate', 'Variables: ' +
        xdmp.quote(runtimeContext.current.variables));
    logger.debug('evaluate', 'Expressions: ' +
        xdmp.quote(runtimeContext.current.expressions));

    return vResult && eResult;
}

/**
 * Evaluate functions against the current runtime context and document. If an
 * error occurrs, this will either throw an immedate error (debugOutput is
 * off) or return false (debugOutput is true).
 * @param {object} document
 * @param {string} type either 'variables' or 'expressions'
 * @param {object} runtimeContext the current runtime context
 * @param {boolean} debugOutput set to true if output debug mode is enabled
 * @return {boolean} true if the expressions were succesfully evaluated
*/
function evaluateExpressions(doc, type, runtimeContext, debugOutput = false) {
    runtimeContext.doc = doc;
    const expressions = runtimeContext[type];
    return evaluateExpressions2(expressions, type, runtimeContext, debugOutput);
}

/**
 * Given tne runtime context and the current document, execute the expression
 * set from the context and return an object with expression keys and result.
 * This function also evaluates all variables before the main expressions
 * are evaluated. The function returns true if no errors occur, raises an
 * exception if evaluate fails and debugOutput is false and returns false
 * if debugOutput is true and either call to evaluateExpressions fails.
 * @param {object} document
 * @param {object} runtimeContext
 * @param {object} nodeMap
 * @param {boolean} debugOutput set to true if output debug mode is enabled
 * @return {boolean} true on success, false on failure
 */
function evaluate2(document, nodeMap, runtimeContext, debugOutput = false) {
    // Some functions need this so we store it in the context
//    runtimeContext.hasError = false;
    delete runtimeContext.hasError;
    logger.debug('evaluate', 'Entering evaluation with context ' +
        xdmp.quote(runtimeContext));

    // Variables have to be evaluated first.
    const vResult = evaluateExpressions(document, 'variables', runtimeContext,
        debugOutput);

    runtimeContext.doc = document;
    const eResult = evaluateExpressions2(nodeMap, 'expressions', 
        runtimeContext, debugOutput);

    logger.debug('evaluate', 'Variables: ' +
        xdmp.quote(runtimeContext.current.variables));
    logger.debug('evaluate', 'Expressions: ' +
        xdmp.quote(runtimeContext.current.expressions));

    return vResult && eResult;
}

/**
 * Evaluate functions against the current runtime context and document. If an
 * error occurrs, this will either throw an immedate error (debugOutput is
 * off) or return false (debugOutput is true).
 * @param {string} expressions - list of expressions
 * @param {string} type either 'variables' or 'expressions'
 * @param {object} runtimeContext the current runtime context
 * @param {boolean} debugOutput set to true if output debug mode is enabled
 * @return {boolean} true if the expressions were succesfully evaluated
*/
function evaluateExpressions2(expressions, type, runtimeContext, debugOutput = false) {
    delete runtimeContext.hasError;

    logger.debug('About to evaluation expressions of type ' +
        type + '\n\n' +
        'with context ' + xdmp.quote(runtimeContext));

    // Clear the type data.
    runtimeContext.current[type] = {};

    const evalSequence = type == 'variables' ?
        runtimeContext.variableSequence : Object.keys(expressions);

    if (!evalSequence) {
        return true;    // done
    }

    for (const name of evalSequence) {
        logger.debug('evaluateExpressions', 'About to evaluate ' + name);
        const exprFn = expressions[name];
        try {
            runtimeContext.current[type][name] = exprFn(runtimeContext);
        } catch (e) {
            switch (e.name) {
            case 'RuntimeError':
                e.expression = exprFn.expression;
                e.runtimeContext = runtimeContext;

                if (debugOutput) {
                    runtimeContext.current[type][name] =
                        runtimeContext.flags.errorPrefix + e.message;
                    runtimeContext.hasError = true;
                } else {
                    throw e;
                }
                break;
            default:
                throw e;
            }
        }

        logger.debug('evaluationExpressions',
            'Set value of "' + name + '" to: ' +
            runtimeContext.current[type][name]);
    }

    return runtimeContext.hasError == false;
}

exports.evaluate = evaluate;
exports.evaluate2 = evaluate2;
exports.evaluateExpressions = evaluateExpressions;
exports.evaluateExpressions2 = evaluateExpressions2;
