/*jshint esversion: 6 */
/* global xdmp */
/* global fn */
/* global require */
/* global exports */

'use strict';

/*
 * Module to compile a template in XML to an executable format.
 * Given a template (as an element node) and the compiler context
 * builds a function that can be applied to a document to create
 * a new document derived from the input document and the input
 * template.
*/

const logger = require('/ext/declarative-mapper/logging.sjs');
const expressionCompiler =
    require('/ext/declarative-mapper/syntax-tree-compiler.sjs');
const runtime = require('/ext/declarative-mapper/runtime.sjs');
const RuntimeError = require('/ext/declarative-mapper/errors/RuntimeError.sjs');
const {CompileErrorAccumulator, CompileErrorListError} = require('/ext/declarative-mapper/errors/CompileErrorListError.sjs');
// Stylesheet used to actually generate the output.
const templateXSLT = '/ext/declarative-mapper/xslt/xml-template.xsl';
const CONST = require('/ext/declarative-mapper/const.sjs');

/* Regular expression to match a code expression - the parens
allow us to do an easy replace to get the code itself.  */

const lb = '\\[{2}';
const rb = '\\]{2,3}';

// RE to find nodes that contain expressions.
const xPathCodeRegex = lb + '(.*)' + rb;

const nodeXPath = '(//text()|//comment()|//processing-instruction()|//@*)' +
    '[matches(., "' +
    xPathCodeRegex + '","s")]';

// RE to get the expressions from the nodes
const analysisXPath = '(' + lb + '(.*?)' + rb + ')';

/**
 * Compile the template expressions and associated debugging info and store in compilerContext
 * @param {object} template - the template to be compiled
 * @param {object} compilerContext - the current compilation context
*/
function buildExpressionFunctions(template, compilerContext, nonGlobal) {
    // We want to keep the expressions and their XPaths for
    // later use in error handling but we have to reverse the map.
    // Build up the compiled expressions into the simple nodeMap
    // object at the same time.
    let errorList = new CompileErrorAccumulator();
    const xPathMap = {};
    const nodeMap = {};
    // Get the expressions and their locations.
    const expressionMap = getExpressions(template);

    for (const xPath of Object.keys(expressionMap)) {
        for (const expression of expressionMap[xPath]) {
            xPathMap[expression] = xPath;
            // Remove the square bracket pairs around the expression
            // before compiling or everything gets parsed as a strange
            // array. Use XPath REs because Javascript doesn't support
            // single line mode!
            const innerExpression = fn.replace(expression,
                '^\\[{2}(.*)\\]{2}$', '$1', 's');
            try {
                nodeMap[expression] =
                    compileExpression(innerExpression, xPath, compilerContext);
            } catch (e) {
                errorList.addExpressionError(e);
            }
        }
    }
    if (errorList.hasErrors) {
        throw new CompileErrorListError(errorList);
    }

    // Store the expressions, template and xpaths
    if (!nonGlobal) {
        compilerContext.runtimeContext.xpaths = xPathMap;
        compilerContext.runtimeContext.expressions = nodeMap;
        compilerContext.runtimeContext.currentTemplate = template;
    }

    return nodeMap;
}
/**
 * Compile the template. The result of this function is a function that can be
 * applied to a document to create a new document derived from the template.
 * @param {object} template - the template to be compiled
 * @param {object} compilerContext - the current compilation context
 * @return {function} a function that takes a document and a runtime template
 *  and returns a new document
*/
function compileTemplate(template, compilerContext, nonGlobal) {
    // Compile the variables and store
    compilerContext.runtimeContext.variables =
        expressionCompiler.compileVariables(compilerContext);
    // compile the expresions and store
    let nodeMap = buildExpressionFunctions(template, compilerContext, nonGlobal);
    // Transcribe flags to runtime. Only a few have an effect at runtime but
    // copying is simpler than selecting and leaves all definitions about
    // flags at the higher levels.
    compilerContext.runtimeContext.flags = compilerContext.flags;

    return compilerContext.flags.debugOutput ?
        debugProcessingFunction(template, compilerContext, nodeMap)
        : processingFunction(template, compilerContext, nodeMap);
}

/**
 * Find the nodes which contain expressions and then extract the
 * individual expressions from it as a map keyed on XPath for the node.]
 * @param {object} template the template to be used
 * @return {object} the map containing the expressions and paths
 */
function getExpressions(template) {
    const ns = { 's': 'http://www.w3.org/2005/xpath-functions' };
    const matches = {};

    for (const node of template.xpath(nodeXPath)) {
        matches[xdmp.path(node)] =
            fn.analyzeString(node.nodeValue, analysisXPath, 's')
                .xpath('//s:group[@nr=1]/data()', ns)
                .toArray();
    }

    return matches;
}

/**
 * Build the function to be used to run the template and get
 * output for a single record.
 * @param {object} template the template to be used
 * @param {object} compilerContext the current context
 * @param {object} nodeMap - the expressions within template
 * @return {function} the processing function.
 */
function processingFunction(template, compilerContext, nodeMap) {
    const execFn = executionFunction(compilerContext);
    return function(doc, sysVars) {
        const runtimeContext = compilerContext.runtimeContext;
        if (sysVars) {
            runtimeContext[CONST.SYSTEM_VARS] = sysVars;
        }
        runtime.evaluate2(doc, nodeMap, runtimeContext);
        let expMap = runtimeContext.current.expressions;
        return execFn(runtimeContext, template, expMap);
    };
}

/**
 * Build the function to be used to run the template and get
 * output for a single record. This version generates the output
 * even if there is an error, inserting the message into the
 * output.
 * @param {object} template the template to be used
 * @param {object} compilerContext the current context
 * @param {object} nodeMap - the expressions within template
 * @return {function} the processing function.
 */
function debugProcessingFunction(template, compilerContext, nodeMap) {
    const execFn = executionFunction(compilerContext);
    const runtimeContext = compilerContext.runtimeContext;
    return function(doc, sysVars) {
        if (sysVars) {
            runtimeContext[CONST.SYSTEM_VARS] = sysVars;
        }
        const evalResult = runtime.evaluate2(doc, nodeMap, runtimeContext, true);
        let expMap = runtimeContext.current.expressions;
        const output = execFn(runtimeContext, template, expMap);

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
 * Build the execution function. If the returnState flag is false
 * (the default) then we return basic executeTemplate function. If
 * not then we return a wrapper around it which also returns variables
 * and expressions.
 * @param {object} compilerContext - the current context
 * @return {function} the execution function
 */
function executionFunction(compilerContext) {
    if (compilerContext.flags.returnState) {
        return function(runtimeContext, templ, expMap) {
            return {
                variables: Object.assign({}, runtimeContext.current.variables),
                expressions: Object.assign({}, expMap),
                results: executeTemplate(runtimeContext, templ, expMap),
            };
        };
    } else {
        return executeTemplate;
    }
}

/**
 * Strips off the bracketing and compiles the expression inside it.
 * @param {string} source - the node with content to be compiled (including
 *  bracketing)
 * @param {string} xpath - the path to the node
 * @param {object} compilerContext - the current compiler state
 * @return {function} the compiled expression (a function)
 */
function compileExpression(source, xpath, compilerContext) {
    const re = new RegExp('^\\s*\\[\\[(.+)\\]\\]\\s*$');
    const expression = source.replace(re, '$1');

    logger.debug('compileTemplate',
        'Compiling expression (at ' + xpath + ') - ' + expression);
    try {
        return expressionCompiler.compileExpression(
            expression, compilerContext);
    } catch (e) {
        e.location = {
            expression: expression,
            xpath: xpath
        };
        throw e;
    }
}


/**
 * Build the template output from the runtime context.
 * @param {object} runtimeContext the current runtime context
 * @param templ - (optional) template
 * @param expMap - (optional) expression map
 * @return {object} the template output (an XML document).
 */
function executeTemplate(runtimeContext, templ, expMap) {
    let template = templ;
    let expressions = expMap;

    if (!template) {
        template = runtimeContext.currentTemplate;
        expressions = runtimeContext.current.expressions;
    }

    const params = {
        expressions: expressions
    };

    const result = xdmp.xsltInvoke(templateXSLT, template, params);

    /*
    xsltInvoke always returns a sequence. We currently only
    support a single document or node as input so we only need to
    support a single one on the way out. This stylesheet will never
    modify structure so we can safely just return the head of the sequence.
    */
    return fn.head(result);
}


exports.buildOutput = executeTemplate;
exports.compileTemplate = compileTemplate;
exports.getExpressions = getExpressions;
