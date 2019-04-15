'use strict';

const logger = require('/ext/declarative-mapper/logging.sjs');
const utils = require('/ext/declarative-mapper/utils.sjs');
const RuntimeError = require('/ext/declarative-mapper/errors/RuntimeError.sjs');

/*
* Simple mapper functions for declarative mapping
* Written as an example of building a generator module
* Author: Nic Gibson (nic.gibson@marklogic.com)
* Version: 0.2.1
* Date: 2018-07-06
* Modification: 0.2.1
* - moved to new location, updated for new function discovery and loading model
* - updated to use function registration
* - updated to tidy up docs
*/


/**
 * Convert input to lower case. If the input is a single value
 * use that. If an arry, convert all values and return.
 * @param {any} str - the string that is to be converted to lower case
 * @return {any} lower cased string or array
*/
function lowerCase(str) {
    // Check the args. str may be an array, the others must be strings.
    if (!(Array.isArray(str) || typeof str == 'string')) {
        throw new RuntimeError(
            'The input to lowerCase must be a string or array');
    }

    if (Array.isArray(str)) {
        return str.map((x) => x.toLowerCase());
    }

    return str.toLowerCase();
}

/**
* Convert input to upper case. If the input is a single value
* use that. If an array, convert all values and return.
* @param {any} str - the string that is to be converted to upper case
* @return {any} upper cased string or array
*/
function upperCase(str) {
    // Check the args. str may be an array, the others must be strings.
    if (!(Array.isArray(str) || typeof str == 'string')) {
        throw new RuntimeError(
            'The input to upperCase must be a string or array');
    }

    if (Array.isArray(str)) {
        return str.map((x) => x.toUpperCase());
    }

    return str.toUpperCase();
}


/**
* Replace part of a string using a regular expression. If the pattern
* isn't matched the original string is returned. If the pattern is matched
* all occurences of the pattern are removed
* @param {any} input - the string or strings to be processed
* @param {string} pattern - the regular expression to search for
* @param {string} replacement - the replacement string to be used if pattern
*   is found
* @param {string} flags - regular expression flags (optional)
* @return {any} the string with potential replacements
*/
function regexReplace(input, pattern, replacement, flags = '') {
    // Must have string matchPattern and replacePattern
    if (input == null || pattern == null || replacement == null) {
        throw new RuntimeError(
            'regular expression replacement requires three arguments');
    }

    // Check the args. input may be an array, the others must be strings.
    if (!(Array.isArray(input) || typeof input == 'string')) {
        throw new RuntimeError(
            'The input to replace must be a string or array');
    }

    if (typeof pattern != 'string' || typeof replacement != 'string') {
        throw new RuntimeError(
            'The pattern and replacement arguments to replace must be strings');
    }

    logger.debug('regexReplace', 'Replacing "' + xdmp.quote(input) + '" using "'
        + xdmp.quote(pattern) + '" and "' + xdmp.quote(replacement) + '"');

    let results = [];
    try {
        results = utils.flatten([].concat(input).map((s) => fn.replace(
            s, pattern, replacement, flags)));
    } catch (e) {
        throw new RuntimeError('Unable to execute regular expression - '
            + xdmp.quote(pattern) + ' - ' + xdmp.quote(e));
    }

    return Array.isArray(input) ? results : results[0];
}

/**
* Matches part of a string using a regular expression, returning true or false
* @param {any} input - the string or strings to be processed
* @param {string} pattern - the regular expression to search for
* @param {string} flags - regular expression flags (optional)
* @return {boolean} true if match found and false if no match found
*/
function regexMatches(input, pattern, flags = '') {
    // Must have string matchPattern and replacePattern
    if (input == null || pattern == null) {
        throw new RuntimeError(
            'regular expression matching requires two arguments');
    }

    logger.debug('regexMatches', 'Matching "' + xdmp.quote(input)
        + '" using "' + xdmp.quote(pattern) + '"' );

    // Loop here so we can short circuit.
    try {
        for (const str of [].concat(input)) {
            if (fn.matches(str, pattern, flags)) {
                return true;
            }
        }
    } catch (e) {
        throw new RuntimeError('Unable to execute regular expression - '
        + xdmp.quote(pattern) + ' - ' + xdmp.quote(e));
    }

    return false;
}

/**
 * Break a string into parts using a regular expression. Returns an
 * array of tokens.
 * @param {any} str - the input string
 * @param {string} tok - the regular expression that tokenizes the string
 *  (an XPath RE)
 * @param {string} flags - regular expression flags (optional)
 * @return {array} the result of tokenization
 */
function tokenize(str, tok, flags = '') {
    // Must have string and token
    if (str == null || tok == null) {
        throw new RuntimeError(
            'tokenize requires two arguments');
    }

    // Check the args. str may be an array, the others must be strings.
    if (!(Array.isArray(str) || typeof str == 'string')) {
        throw new RuntimeError(
            'The input to tokenize must be a string or array');
    }

    let results = [];
    try {
        results = utils.flatten([].concat(str).map((s) => fn.tokenize(
            s, tok, flags).toArray()));
    } catch (e) {
        throw new RuntimeError('Unable to tokenize with - '
            + xdmp.quote(tok) + ' - ' + xdmp.quote(e));
    }

    return results;
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
    registrationFn(upperCase, defaultFnMeta);
    registrationFn(lowerCase, defaultFnMeta);
    registrationFn(regexMatches, Object.assign({}, defaultFnMeta,
        {name: 'matches'}));
    registrationFn(regexReplace, Object.assign({}, defaultFnMeta,
        {name: 'replace'}));
    registrationFn(tokenize, defaultFnMeta);
}

exports.registerFunctions = registerFunctions;
