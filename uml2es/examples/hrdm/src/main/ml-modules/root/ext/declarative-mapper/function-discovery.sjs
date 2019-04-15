/*jshint esversion: 6 */
/* globals fn */
/* globals cts */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */

'use strict';

const ConfigError = require('/ext/declarative-mapper/errors/ConfigError.sjs');
const logger = require('/ext/declarative-mapper/logging.sjs');

// The 'built-in' libraries are registered here.
const defaultLibraries = {
    functionDirectories: ['/ext/declarative-mapper/functions/'],
    functionLibraries: [],
};

// Default function metadata:
const defaultFnMetadata = {
    name: null,
    needsDocument: false,
    needsContext: false,
    returnsArray: true,
    lateEvaluation: false,
    argCount: null,
    argsAsArray: true,
    flattenArgs: true,
    finalArray: false,
};

// The name of the function we call to register functions in a library
// (and to identify modules where we can try to register functions)
const registerFunctionName = 'registerFunctions';

/**
 * Module to identify those SJS modules which are to potentially to be
 * used as function libraries for the declarative mapper. Given the
 * configuration for the mapper plus the default moduel configuration
 * lists the URIs of all SJS files which match the requirements.
 * This module operates on the module configuration from the main
 * configuration (see config.md)
 */


/**
 * Given a module configuration, return the CTS query
 * needed to find the modules. The 'functionLibraries'
 * property isn't used here because that's already a list
 * of modules. The default function directories are included
 * here. Any URIs found are filtered to ensure that they are
 * Javascript modules (by content type).
 * @param {object} moduleConfig function modules part of config
 * @return {object} the cts OR query to find the modules
 */
function buildModuleSearch(moduleConfig) {
    let querySet = [];
    if (moduleConfig) {
        if (moduleConfig.functionDirectories) {
            querySet.push(cts.directoryQuery(moduleConfig.functionDirectories));
        }
        if (moduleConfig.functionCollections) {
            querySet.push(cts.collectionQuery(moduleConfig.functionCollections));
        }
    }
    querySet.push(cts.directoryQuery(defaultLibraries.functionDirectories));
    return cts.orQuery(querySet);
}

/**
 * Search the modules database for function libraries and append
 * any defined directly to that list (from .functionLibraries)
 * Any URI without the correct content type is rejected.
 * @param {object} moduleConfig function modules part of config
 * @return {array} results of module searches
 */
function buildModuleList(moduleConfig) {
    const moduleDB = xdmp.modulesDatabase();
    const searchFn = function() {
        return cts.uris('', [], buildModuleSearch(moduleConfig));
    };

    const searchResult = xdmp.invokeFunction(
        searchFn,
        {database: moduleDB}
    );

    /* concatenate the search results with the defaults
    and filter to ensure they're all javascript */
    return searchResult.toArray().concat(
        moduleConfig && moduleConfig.functionLibraries ?
            moduleConfig.functionLibraries : [],
        defaultLibraries.functionLibraries ?
            defaultLibraries.functionLibraries : [])
        .filter(
            (uri) =>
                xdmp.uriContentType(uri)
                    == 'application/vnd.marklogic-javascript')
        .map((x) => x.toString());
}

/**
 * Given the list of module URIs from buildModuleList find all of those which
 * export the registration function and return the modules themselves where
 * the function is found.
 * @param {array} moduleUriList the modules found by buildModuleList
 * @return {array} list of modules that export the registration function.
 */
function getModules(moduleUriList) {
    let modules = {};
    for (const uri of moduleUriList) {
        if (!uri.includes("/ext/declarative-mapper")) {
            logger.info("DM Loading user function library : "+uri);
        }
        let theModule = require(uri);
        if (theModule[registerFunctionName]) {
            modules[uri] = theModule;
        } else {
            logger.warning('loadFunctionLibraries',
                'Module with URI "' + uri +
                    '" loaded but does not export a registration function.');
        }
    }

    return modules;
}

/**
 * Given the configuration for a transformation, load any function libraries
 * referenced and register their functions into the compile time context.
 * @param {object} compilerContext - the current compilation context
 */
function loadFunctionLibraries(compilerContext) {
    const uris = buildModuleList(compilerContext.config.functionModules);
    const modules = getModules(uris);

    const registerClosure = function(fnToRegister, fnMetadata = {}) {
        registerFunction(fnToRegister, fnMetadata, compilerContext);
    };

    for (const uri of Object.keys(modules)) {
        const moduleRegister = modules[uri][registerFunctionName];
        if (typeof moduleRegister == 'function') {
            // Make sure the function has it's own copy of the metadata.
            moduleRegister(registerClosure, compilerContext,
                Object.assign({}, defaultFnMetadata));
        } else {
            throw new ConfigError('"' + registerFunctionName + ' in module "'
                + uri + '" is not a function', compilerContext.config);
        }
    }
}


/**
 * Register a single function into the the compiler context.
 * @param {function} fnToRegister - the function to be registered.
 * @param {object} fnMetadata - the function's metadata
 * @param {object} compilerContext - the current compiler contexts
 */
function registerFunction(fnToRegister, fnMetadata, compilerContext) {
    // Merge into a copy of the default so we definitely have a full set
    // of metadata
    const fullMeta = Object.assign({}, defaultFnMetadata, fnMetadata);

    // Set the name we're going to use a key if not set.
    if (!fullMeta.name) {
        fullMeta.name = fnToRegister.name;
    }

    // If the meta includes late evaluation and needsContext is
    // false we have to override that an issue a warning.
    if (fullMeta.lateEvaluation && !fullMeta.needsContext) {
        logger.warning('registerFunction',
            'Setting needsContext to true for function ' + fullMeta.name);
        fullMeta.needsContext = true;
    }
    // Set up the function structure.
    const fnStructure = {
        implementation: fnToRegister,
        metadata: fullMeta,
    };

    compilerContext.functions[fullMeta.name] = fnStructure;
    logger.fine('Function registered as ' + xdmp.quote(fnStructure));
}

exports.loadFunctionLibraries = loadFunctionLibraries;
