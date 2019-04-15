/*jshint esversion: 6 */
/* globals fn */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */
/* globals Node */

'use strict';

/**
* Public interface to the declarative-mapping tool
* modules and builds a transformer object.
* Author: Nic Gibson (nic.gibson@marklogic.com)
*/

const jsonCompiler = require('/ext/declarative-mapper/json-config.sjs');
const XMLConfig = require('/ext/declarative-mapper/xml-config.sjs');
const XMLCompiler = require('/ext/declarative-mapper/xml-template.sjs');
const JSONConfig = require('/ext/declarative-mapper/json-config.sjs');
const JSONCompiler = require('/ext/declarative-mapper/json-template.sjs');
const ConfigError = require('/ext/declarative-mapper/errors/ConfigError.sjs');
const CompileError = require('/ext/declarative-mapper/errors/CompileError.sjs');
const discovery = require('/ext/declarative-mapper/function-discovery.sjs');
const logger = require('/ext/declarative-mapper/logging.sjs');
const expressionCompiler = require('/ext/declarative-mapper/syntax-tree-compiler.sjs');

/**
 * Default flags
 */
const defaultFlags = {
    trace: false,
    returnState: false,
    debugOutput: false,
    errorPrefix: 'Error: ',
    allowUserFunctions: true,
    functionDefinitionStrategy: 'last',
};

/**
 * Create a new compilation context.
 * Returns an object containing the appropriate extractor function and the
 * array of available functions. The configuration is also stored into
 * the context.
 * TODO - this is where we should insert the CSV preprocessor.
 * @param {object} config - the current configuration
 * @param {object} flags - compiler flags
 * @return {object} the base configuration of the compiler context
 */
function newCompilerContext(config, flags = {}) {
    let canonicalConfig = {};

    if (!config) {
        throw new ConfigError('Config must be defined');
    }
    if (config instanceof Sequence) {
        throw new ConfigError('Config must be one item. It is a sequence.');
    }

    let cfgFormat = '';
    if (xdmp.nodeKind(config) === 'element') {
        cfgFormat = 'xml';
    }
    else if (xdmp.nodeKind(config) === 'object') {
        cfgFormat = 'raw';    // already parsed, neither xml nor json
    }
    else if (xdmp.nodeKind(config) === 'document') {
        let rootNode = config.root;
        if (rootNode.nodeKind === 'element') {
            cfgFormat = 'xml';
        } else if (rootNode.nodeKind === 'object') {
            cfgFormat = 'json';
        }
    }

    if (cfgFormat === 'xml') {
        canonicalConfig = XMLConfig.canonicalConfig(config);
    } else if (cfgFormat === 'json') {
        canonicalConfig = JSONConfig.canonicalConfig(config);
    } else if (cfgFormat === 'raw') {
        canonicalConfig = JSONConfig.canonicalConfig(config);
//        canonicalConfig = config;
    } else {
        throw new ConfigError(
            'Unknown config format. Neither XML doc nor JSON object: ' +
            xdmp.describe(config), config);
    }

    logger.info('Canonical Config: ' + xdmp.quote(canonicalConfig));

    if (!canonicalConfig.format) {
        throw new ConfigError(
            'The input format must be defined in the configuration.',
            config);
    }

    // Check keys we've been provided for flags against keys of default
    // flags and error when they don't exist.
    for (const flag of Object.keys(flags)) {
        if (Object.keys(defaultFlags).indexOf(flag) == -1) {
            throw new ConfigError(
                'Unknown compiler flag: ' + flag, config);
        }
    }

    const context = {
        // merges all the exports into a single object.
        functions: {},
        preprocessors: {},
        flags: Object.assign(defaultFlags, flags),
        format: canonicalConfig.format.toString().toUpperCase(),
        variables: canonicalConfig.variables,
        runtimeContext: {
            format: canonicalConfig.format.toString().toUpperCase(),
            variables: {},
            expressions: {},
            doc: {},
            caches: {},
            current: {},
            parent: {},
        },
        config: canonicalConfig,
    };

    discovery.loadFunctionLibraries(context);

    logger.fine('newCompilerContext', xdmp.quote(context));

    return context;
}

/**
 * Public interface to the compiler. This function takes the configuration and
 * the compiler context and calls down to the appropriate preparation function
 * (depending on the input template format - NOT the config format).
 * @param {object} compilerContext – the context object containing debug info
 *  and format info plus user supplied data
 * @return {function} a function which can be applied to a document to transform
 *  it to the output format
 */
function prepare(compilerContext) {
    if (compilerContext == null) {
        throw new CompileError('The compiler context must be defined',
            null, null, compilerContext);
    }

    // Get the main template object (this is guaranteed by the config parser)
    const mainTemplate = compilerContext.config.templates.main;

    let templateFunc;
    let configFormat = 'xml';
    let kind = xdmp.nodeKind(mainTemplate);
    if ('object' ==  kind || 'array' == kind) {
        configFormat = 'json';
    }
    if (configFormat === 'json') {
        templateFunc = JSONCompiler.compileTemplate(mainTemplate, compilerContext);
    } else {
        templateFunc = XMLCompiler.compileTemplate(mainTemplate.content, compilerContext);
    }

    // --- no preprocessor, just use the template function ---
    if (!compilerContext.config.preprocessors) {
      return templateFunc;
    }

    // --- compile pre-processor expressions ---
    let preprocessors = [];
    for (let exp of compilerContext.config.preprocessors) {
        let proc = expressionCompiler.compileExpression(exp, compilerContext);
        preprocessors.push(proc);
    }

    // --- include pre-processors before template function ---
    return function(doc, sysVars) {

        // --- pre-process ---
        let runtimeCtx = compilerContext.runtimeContext;
        let currDoc = doc;
        runtimeCtx.orgDoc = currDoc;
        for (let proc of preprocessors) {
            runtimeCtx.doc = currDoc;
            currDoc = proc(runtimeCtx);
        }

        // --- make sure document is still node so that XPATH can be used ---
        if (!(currDoc instanceof Node)) {
            currDoc = fn.head(xdmp.toJSON(currDoc));
        }
        return templateFunc(currDoc, sysVars);
    };

}


exports.newCompilerContext = newCompilerContext;
exports.prepare = prepare;
