/*jshint esversion: 6 */

'use strict';

let PAPAPARSE = require('/ext/declarative-mapper/lib/papaparse.js');
// let LOGGER = require('/declarative-mapper/logging.sjs');
//let CONFIG_KEY = 'csvConfig';

/**
 * To parse a csv document
 *
 * @param doc - csv document as a string
 * @param configStr - PAPA parser configuration in string form
 *
 * @return {data: jsonArray, errors: jsonArray}
 */
function parseCSV(doc, configStr) {
    let config;
    
    if (configStr) {
        config = JSON.parse(configStr);
    }
    let result = PAPAPARSE.parse(doc, config);
  
    if (result.errors) {
        for (let err of result.errors) {
            let errMsg = 'ParseCSV:  ' + err.code + " - " + err.message;
            if (err.row)
                errMsg = errMsg + " at row " + err.row;
//            LOGGER.error(errMsg);
        }
    }
    if (0 < result.errors.length)
        return null;
    else
        return result.data;
}

/**
 * This function is called by the function loader to allow this module to
 * register functions with the runtime.
 * @param {function} registrationFn - the function to call to register a single
 * @param {object} compilerContext - the current compiler context
 * @param {object} defaultMeta - the default function metadata.
 */
function registerFunctions(registrationFn, compilerContext, defaultMeta) {
    const contextFnMeta = Object.assign({}, defaultMeta, {needsDocument: true});
    registrationFn(parseCSV, contextFnMeta);
}

exports.registerFunctions = registerFunctions;
exports.parseCSV = parseCSV;
