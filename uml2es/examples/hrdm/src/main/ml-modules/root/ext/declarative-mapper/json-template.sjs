/*jshint esversion: 6 */
/* global xdmp */
/* global fn */
/* global require */
/* global exports */
'use strict';

/*
 * Module to compile a template in JSON to an executable format.
 * Given a template (as an element node) and the compiler context
 * builds a function that can be applied to a document to create
 * a new document derived from the input document and the input
 * template.
*/

const logger = require('/ext/declarative-mapper/logging.sjs');
const expressionCompiler = require('/ext/declarative-mapper/syntax-tree-compiler.sjs');
const runtime = require('/ext/declarative-mapper/runtime.sjs');
const jsonRenderer = require('/ext/declarative-mapper/json-template/jsonRenderer.sjs');
const xmlRenderer = require('/ext/declarative-mapper/xml-template.sjs');
const RuntimeError = require('/ext/declarative-mapper/errors/RuntimeError.sjs');
const CONST = require('/ext/declarative-mapper/const.sjs');

/**
 * Compile the template. The result of this function is a function that can be
 * applied to a document to create a new document derived from the template.
 * @param {object} template - the template to be compiled
 * @param {object} compilerContext - the current compilation context
 * @return {function} a function that takes a document and a runtime template
 *  and returns a new document
*/
function compileTemplate(template, compilerContext) {

    // --- compile the variables ---
    compilerContext.runtimeContext.variables =
        expressionCompiler.compileVariables(compilerContext);

    // --- parse the templates ---
    let templateRunner;
    if (template instanceof Array) {
        let runners = [];
        for (const tmpl of template) {
            runners.push(parseTemplate(tmpl, compilerContext));
        }
        templateRunner = function(doc, runtimeContext) {
            let result = [];
            for (let runner of runners) {
                let ret = runner(doc, runtimeContext);
                if (ret.multiDoc) {
                    for (let item of ret) {
                        result.push(item);
                    }
                }
                else {
                    result.push(ret);
                }
            }
            return result;
        };
    }
    else {
        templateRunner = parseTemplate(template, compilerContext);
    }

    compilerContext.runtimeContext.currentTemplate = templateRunner;
    compilerContext.runtimeContext.flags = compilerContext.flags;

    return compilerContext.flags.debugOutput ?
        debugProcessingFunction(template, compilerContext)
        : processingFunction(template, compilerContext);
}


/**
 * Build the function to be used to run the template and get
 * output for a single record.
 * @param {object} template the template to be used
 * @param {object} compilerContext the current context
 * @return {function} the processing function.
 */
function processingFunction(template, compilerContext) {
    const execFn = executionFunction(compilerContext);
    return function(doc, sysVars) {
        const context = compilerContext.runtimeContext;
        if (sysVars) {
            context[CONST.SYSTEM_VARS] = sysVars;
        }
        context.doc = doc;
        evalVars(doc, context);
        return execFn(context);
    };
}

/**
 * Build the function to be used to run the template and get
 * output for a single record. This version generates the output
 * even if there is an error, inserting the message into the
 * output.
 * @param {object} template the template to be used
 * @param {object} compilerContext the current context
 * @return {function} the processing function.
 */
function debugProcessingFunction(template, compilerContext) {
    const execFn = executionFunction(compilerContext);
    const runtimeContext = compilerContext.runtimeContext;
    return function(doc, sysVars) {
        if (sysVars) {
            runtimeContext[CONST.SYSTEM_VARS] = sysVars;
        }
        runtimeContext.doc = doc;
        const evalResult = evalVars(doc, runtimeContext, true);
        const output = execFn(runtimeContext);

        if (evalResult == false) {
            throw new RuntimeError(
                'An error occurred evaluating the expressions',
                runtimeContext,
                '',
                compilerContext.flags.returnState ? output.results : output);
        }

        return output;
    };
}

/**
 * Given tne runtime context and the current document, execute all variables
  * The function returns true if no errors occur, raises an
 * exception if evaluate fails and debugOutput is false and returns false
 * if debugOutput is true and either call to evaluateExpressions fails.
 * @param {object} document
 * @param {object} runtimeContext
 * @param {boolean} debugOutput set to true if output debug mode is enabled
 * @return {boolean} true on success, false on failure
 */
function evalVars(document, runtimeContext, debugOutput = false) {
    // Some functions need this so we store it in the context
    delete runtimeContext.hasError;
    logger.debug('evaluate', 'Entering evaluation with context ' +
        xdmp.quote(runtimeContext));

    let vResult;
    let exp = runtimeContext.variables;
    if (exp) {
        vResult = runtime.evaluateExpressions(document, 'variables',
                                              runtimeContext, debugOutput);
        logger.debug('evaluate', 'Variables: ' +
            xdmp.quote(runtimeContext.current.variables));
    }

    return vResult;
}

/**
 * Build the execution function. If the returnState flag is false
 * (the default) then we return basic executeTemplate function. If
 * not then we return a wrapper around it which also returns variables
 * and expressions.
 * @param {object} compilerContext - the current context
 * @return {function} the execution function
 */
function executionFunction(compilerContext) {
    let runtimeContext = compilerContext.runtimeContext;

    if (compilerContext.flags.returnState) {
        return function(runtimeContext) {
            return {
                variables: Object.assign({}, runtimeContext.current.variables),
                results: runtimeContext.currentTemplate(runtimeContext.doc, runtimeContext)
            };
        };
    } else {
        return function(runtimeContext) {
            return runtimeContext.currentTemplate(runtimeContext.doc, runtimeContext);
        };
    }
}

function parseTemplate(template, compilerContext) {
    let templ = template.content;
    let metaTempl = template.metadata;
    let selector = template.selector;
    let func;
    let retFunc;

    let templFunc;
    if ('element' === templ.nodeKind) {
        let xfunc = xmlRenderer.compileTemplate(templ, compilerContext, true);
        templFunc = function(doc, runtimeState) {
            return xfunc(doc, runtimeState[CONST.SYSTEM_VARS]);
        };
    }
    else {
        templFunc = jsonRenderer.parseTemplate(templ, compilerContext);
    }

    let metafunc;
    if (metaTempl) {
        metafunc = jsonRenderer.parseTemplate(metaTempl, compilerContext);
        func = function(doc) {
            return {
                'output': templFunc(doc),
                'metadata': metafunc(doc)
            };
        };
    }
    else {
        func = templFunc;
    }

    // --- splitting array into individual records ---
    if (selector) {
        let cselector = expressionCompiler.compileExpression(selector, compilerContext);
        let runtimeState = compilerContext.runtimeContext;

        retFunc = function(doc) {
            let result = [];

            runtimeState.selector = cselector;

            // --- set up to record current child index ---
            let indexList = runtimeState[CONST.INDEX_LIST];
            if (!indexList) {
                indexList = [];
                runtimeState[CONST.INDEX_LIST] = indexList;
            }
            let myPos = indexList.length;
            indexList.push(0);      // reserve a space in the indexes array

            let docs = runtimeState[CONST.DOCS_KEY];
            if (!docs) {
                docs = [];
                runtimeState[CONST.DOCS_KEY] = docs;
            }
            docs.push(doc);

            let childRecs = cselector(doc, runtimeState, true);
            if (!childRecs || 0 == fn.count(childRecs))
                return null;

            if ('array' == childRecs.nodeKind) {
                for (let currChildIdx = 1; childRecs.length >= currChildIdx; ) {
                    let rec = childRecs[currChildIdx - 1];

                    docs.push(rec);
                    indexList[myPos] = currChildIdx;                // record my index
                    let childResult = func(rec);
                    docs.pop();
                    if (childResult)
                        result.push(childResult);
                    ++currChildIdx;
                }
            }
            else {  // sequence
                let currChildIdx = 1;
                for (let rec of childRecs) {
                    docs.push(rec);
                    indexList[myPos] = currChildIdx;                // record my index
                    let childResult = func(rec);
                    docs.pop();
                    if (childResult)
                        result.push(childResult);
                    ++currChildIdx;
                }
            }
            runtimeState.selector = null;

            // --- remove my index ---
            indexList.pop();

            result.multiDoc = true;
            return result;
        };
    }
    else {
        retFunc = func;
    }

    return retFunc;
}

exports.compileTemplate = compileTemplate;
