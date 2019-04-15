/*jshint esversion: 6 */
/* globals fn */
/* globals cts */
/* globals xdmp */
/* globals Node */
/* globals require */
/* globals exports */
/* globals Sequence */

'use strict';

/*
* Extractor functions for declarative mapping tools
* Author: Nic Gibson (nic.gibson@marklogic.com)
* Version: 0.2.9
* Date: 2018-04-05
*/

const logger = require('/ext/declarative-mapper/logging.sjs');
const ConfigError = require('/ext/declarative-mapper/errors/ConfigError.sjs');
const RuntimeError = require('/ext/declarative-mapper/errors/RuntimeError.sjs');

/* NOTES
 * These functions are the base set of extractor modules. Others can
 * be created.
 */


/**
 * Given a config object, return the appropriate extractor function. If the
 * extractor requires namespace support, create an wrapper function to provide
 * it as a closure.
 * @param {object} compilerContext - the current compiler context.
 * @return {function} an extractor function.
 */
function findExtractor(compilerContext) {
    if (!compilerContext.format) {
        throw new ConfigError('The "format" property is required.');
    }

    logger.debug('findExtractor', 'called with format set to ' +
        compilerContext.format);

    switch (compilerContext.format.toUpperCase()) {
    case 'JSON':
        return [function(doc, field, isSelector) {
            return extractXPath(doc, field, compilerContext.config.namespaces, isSelector);
        }, {needsDocument: true}];
    case 'XML':
        return [function(doc, field, isSelector) {
            return extractXPath(doc, field, compilerContext.config.namespaces, isSelector);
        }, {needsDocument: true}];
    case 'CSV':
        return [extractCSV, {}];
    default:
        throw new
        ConfigError('Unable to find an appropriate extractor function',
            compilerContext.format ? compilerContext.format : 'Not found');
    }
}

/**
 * Given a field number and a record, return the numbered field.
 * This is intended to be used with CSV data but any format that leads
 * to an array of data would be usable
 * If the field cannot be retrieved will raise an error.
 * @param {object} doc - the document or record from which data is to be
 *  extracted
 * @param {any} field - a specification for the field to be extracted from doc
 *  (a integer)
 * @return {any} the field value

 */
function extractCSV(doc, field) {
    if (Number.isInteger(field)) {
        if (doc instanceof Array) {
            if (Number(field) < 1 | Number(field) > doc.length) {
                return [doc[field]];
            } else {
                throw new RuntimeError(
                    'field parameter must be in range: ' + xdmp.quote(field));
            }
        } else {
            throw new RuntimeError(
                'doc parameter must be an array: ' + xdmp.quote(doc));
        }
    } else {
        throw new RuntimeError(
            'field paramater must be an integer: ' + xdmp.quote(field));
    }
}

/**
 * Given a Node or a Javascript object returned the field value
 * defined by the XPath statement in the field parameter. This function is
 * selected by prepare() when the format is set to JSON or XML.
 * @param {object} doc - the document or record from which data is to be
 *  extracted
 * @param {string} field - a XPath statement matching the string to be returned
 * @param{object} namespaces - optional object containing namespace key
 * @param (boolean) isSelector - is loop selector
 *  value pairs (provided by the wrapper created in findExtractor.)
 * @return {array} string values extracted from the document
 */
function extractXPath(doc, field, namespaces, isSelector) {
    let xPathResults = null;

    logger.debug('extractXPath', 'Processing: ' + xdmp.quote(doc));
    logger.debug('extractXPath', 'Searching for ' + xdmp.quote(field));

    /* Make sure we have either an object or a node */
    if (! (doc instanceof Object || doc instanceof Node) ) {
        throw new RuntimeError('doc parameter must be an object or node: ' +
            xdmp.quote(doc));
    }

    if (isSelector) {
        logger.debug('Selector: ' + field);
    }

    try {
        /* Make sure we have a node. If it's a document node, step down
        to the root because that fits people's idea of what should
        happen better.  */
        if (xdmp.nodeKind(doc) == 'document' ||
            xdmp.nodeKind(doc) == 'element') {
            const rootNode = doc.nodeKind == 'document' ? doc.root : doc;
            if (xdmp.nodeKind(rootNode) == 'element') { // XML
                const prefixes = fn.inScopePrefixes(rootNode);
                xdmp.log('DOC: ' + xdmp.quote(doc));
                xdmp.log('PREFIXES: ' + xdmp.quote(prefixes));
                const localNsList = Object.assign({}, namespaces);
                for (const prefix of prefixes) {
                    localNsList[prefix] =
                        fn.namespaceUriForPrefix(prefix, rootNode);
                }

                xPathResults = rootNode.xpath(field, localNsList);
            } else { // JSON
                xPathResults = rootNode.xpath(field);
            }
        } else if (doc.nodeKind == 'object' ||
                   doc.nodeKind == 'array') {
            xPathResults = doc.xpath(field);
        } else {
            /* xdmp.toJSON returns a document node. If we get the first node
            child of that then XPath behaves more like it does against XML */
            const workingDoc = xdmp.toJSON(doc).root;
            xPathResults = workingDoc.xpath(field);
        }

        // --- if loop selector, skip conversion, return result sequence ---
        if (isSelector) {
          return xPathResults;
        }

        /* Loop over results, converting to strings */
        logger.debug('extractXPath', 'xpath function returned ' +
            fn.count(xPathResults) + ' results.');
        let stringResults = [];
        for (let nodeResult of xPathResults ) {
            let stringResult = fn.data(nodeResult);
            logger.debug('extractXPath', 'getting string value of ' +
                xdmp.quote(nodeResult) + ': ' + stringResult);
              stringResults.push(fn.head(stringResult));
        }

        switch (stringResults.length) {
        case 0:
            return undefined;
        case 1:
            return stringResults[0];
        default:
            return stringResults;
        }
    } catch (err) {
        throw new RuntimeError('XPath evaluation error: ' + field + '\n\n' +
            err.toString());
    }
}

/**
 * Registration function. This is used to load the appropriate
 * extract function and return it as the canonical extract function. This
 * function will be called by the function registration library.
 * @param {function} registrationFn - function to call to register functions
 * @param {object} compilerContext - the current compiler context
 * @param {object} defaultFnMeta - the default function metadata
 */
function registerFunctions(registrationFn, compilerContext, defaultFnMeta) {
    const [extractFn, extraMeta] = findExtractor(compilerContext);
    const meta = Object.assign({}, defaultFnMeta, extraMeta, {name: 'extract'});
    registrationFn(extractFn, meta);
}

exports.registerFunctions = registerFunctions;
exports.extractXPath = extractXPath;

