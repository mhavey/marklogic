'use strict';

/*
 * Functions related to looking up data externally.
 * Version: 0.1.1
 * Date: 2018-06-30
 * Modification: 0.1.1 - moved to new location, updated for new function
 *   discovery and loading model
 */

const logger = require('/ext/declarative-mapper/logging.sjs');
const RuntimeError = require('/ext/declarative-mapper/errors/RuntimeError.sjs');

/**
 * Look up a value in a lookup table, which is implemented as a JSON object/map.
 * For efficiency, the map is stored into the runtime context on first call and
 * retrieved from there on later calls.
 * @param {object} runtimeContext - useful values including debug and trace
 *  flags
 * @param {string} lookupMapURI - the URI in the database of the lookup map
 * @param {array} values - values to use as keys to obtain results from the map
 * @return {any} the result or null
 *
 */
function lookup(runtimeContext, lookupMapURI, ...values) {
    if (values.length == 0) {
        throw new RuntimeError('No lookup values passed to lookup function',
            runtimeContext);
    }

    logger.debug('lookup', 'Entering lookup with values set to '
        + xdmp.quote(values));

    let map = getCachedLookupDoc(lookupMapURI, runtimeContext);

    if (values.length==0) {
        throw new RuntimeError(
            'Invalid input. keyValue lookup called on empty array.',
            runtimeContext);
    }

    return recursiveLookup(map.root.toObject(), values);
}


/**
 * Do a recursion through a possibly nested map. This follows the values
 * in our lookup through the map. If we run out of map before we run out
 * of values, we issue a warning and return null. The resulting value may
 * be an array or a single value. Anything else will lead to a fatal error.
 * @param {object} map - the map to look up data in
 * @param {array} values - the values to use as lookup keys
 * @return {any} the identified value or null
*/
function recursiveLookup(map, values) {
    logger.debug('lookup', 'looking for' + xdmp.quote(values));
    logger.debug('lookup', 'looking in' + xdmp.quote(map));

    const currentValue = values.shift();
    const result = map[currentValue];

    // If we got nothing...
    if (!result) {
        if (values.length) {
            logger.debug('lookup', 'Lookup failed before end of values');
        }

        return null;
    }


    // If we have an atomic value then if we have more values
    // left then we have an issue
    if ( ( ! isNaN(result)) || typeof result == 'string' ||
        xdmp.nodeKind(result) == 'text') {
        if (values.length > 0) {
            logger.warning('lookup',
                'Depth of map is less than number of values');
            return null;
        }

        if (!isNaN(result)) {
            return Number(result);
        }

        if (typeof result == 'string') {
            return result;
        }

        return result.nodeValue;
    }

    // We  can return array nodes but let's get the content out
    // of nodes.
//    if (xdmp.nodeKind(result) == 'array' ) {
    if (result.nodeKind == 'array' ) {
        // Convert text nodes to numbers or strings
        if (values.length == 0) {
            const resultArray = [];
            for (const item of result.xpath('node()')) {
                resultArray.push(isNaN(item) ? item + '' : Number(item));
            }
            return resultArray;
        }
    }

    // Normal arrays (probably shouldn't happen)
    if (Array.isArray(result)) {
        if (values.length == 0) {
            return result;
        }
    }

    // If we got here with no values then we have an object result
    // which we don't allow (in this version).
    if (values.length == 0) {
        return null;
    }

    return recursiveLookup(result, values);
}


/**
 * Find a lookup in the cache stored in the runtime context.  Initialises the
 * cache structure if not present. If the document isn't in the cache we add
 * it, raising an error if the load fails
 * @param {string} lookupURI - the document to be found
 * @param {object} runtimeContext - the context object containing the cache
 * @return {object} the cached document
 */
function getCachedLookupDoc(lookupURI, runtimeContext) {
    // Make sure the cache is initialised
    if (! runtimeContext.caches['lookups']) {
        runtimeContext.caches['lookups'] = {};
    }

    if (runtimeContext.caches.lookups[lookupURI]) {
        return runtimeContext.caches.lookups[lookupURI];
    }

    let lookupDoc = cts.doc(lookupURI);
    if (!lookupDoc) {
        throw new RuntimeError(
            'Unable to load lookup document - ' + lookupURI,
            runtimeContext);
    }

    // It has to be a JSON object at the root.
    if (! xdmp.nodeKind(lookupDoc.root) == 'object') {
        throw new RuntimeError('Lookup document (' + lookupURI
            + ') must be a JSON object', runtimeContext);
    }

    runtimeContext.caches.lookups[lookupURI] = lookupDoc;
    return lookupDoc;
}

/**
 * This function is called by the function loader to allow this module to
 * register functions with the runtime.
 * @param {function} registrationFn - the function to call to register a single
 * @param {object} compilerContext - the current compiler context
 * @param {object} defaultMeta - the default function metadata.
 */
function registerFunctions(registrationFn, compilerContext, defaultMeta) {
    const contextFnMeta = Object.assign({}, defaultMeta, {needsContext: true});
    registrationFn(lookup, contextFnMeta);
}


exports.registerFunctions = registerFunctions;
