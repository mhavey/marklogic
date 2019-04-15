'use strict';

/**
* Configuration module for XML based configs. This reads the XML config
* and turns it into a Javascript object.
* Author: Nic Gibson (nic.gibson@marklogic.com)
* Version: 0.3.2
* Date: 2018-07-18
* Last Change: added support for a namespaces element in the config.
*/

const logger = require('/ext/declarative-mapper/logging.sjs');
const ConfigError = require('/ext/declarative-mapper/errors/ConfigError.sjs');

/* Namespace definition for XPath statements */
const ns = {'dm': 'http://marklogic.com/declarative-mapper'};

/* Default template name */
const defaultTemplateName = 'main';

/**
 * Convert an XML config into a Javascript object.
 * @param {object} config - the XML element representing the config
 * @return {object} the rewritten configuration
 */
function canonicalConfig(config) {
    if (xdmp.nodeKind(config) == 'document') {
        config = config.root;
    }
    return {
        format: inputFormat(config),
        variables: variablesToMap(config),
        templates: templatesToMap(config),
        functionModules: functionModulesToMap(config),
        namespaces: namespacesToMap(config),
    };
}

/**
 * Get the input format and return it
 * @param {object} config
 * @return {string} should be one of JSON, XML, CSV
 */
function inputFormat(config) {
    return fn.head(config.xpath('self::dm:config/dm:format/text()', ns));
}

/**
 * Convert the variables to a map as used on the Javascript object.
 * @param {object} config - the configuration object
 * @return {object} variable names=>values as an object.
 */
function variablesToMap(config) {
    const varMap = {};

    /* Get the variable names and text */
    const varSequence = config.xpath(
        'self::dm:config/dm:variables/dm:variable', ns);
    for (let varElement of varSequence) {
        const varName = varElement.getAttribute('name');
        const varText = varElement.firstChild.data;
        varMap[varName] = varText;
    }

    return varMap;
}

/**
 * Given the configuration object as XML, extract any namespace
 * definitions and return them as a map
 * @param {object} config = the configuration object
 * @return {object} the namespaces as a map
 */
function namespacesToMap(config) {
    const nsMap = {};

    /* Get the variable names and text */
    const nsSequence = config.xpath(
        'self::dm:config/dm:namespaces/dm:namespace', ns);
    for (let nsElement of nsSequence) {
        const prefix = nsElement.getAttribute('prefix');
        const uri = nsElement.firstChild.data;
        nsMap[prefix] = uri;
    }

    return nsMap;
}

/**
 * Convert the template configuration to the canonical format.
 * If only a single template is found then convert that to the
 * main template. If no main template is found, then raise a config
 * exception. If a template is referenced via URI, load it.
 * If more than one template format is found, raise a configuration
 * exception.
 * @param {object} config the configuration object.
 * @return {object} the template configuration
 * @throws ConfigError
 */
function templatesToMap(config) {
    const templateUris = config.xpath('//dm:template-uri', ns);
    const templateNodes = config.xpath('//dm:template', ns);
    const templates = {};

    for (const template of templateNodes) {
        // Sanity checks.
        if (! template.hasChildNodes()) {
            throw new ConfigError(
                'A template must have content', config);
        }

        // Need to have an element child.
        // NOTE - using toArray() here because fn.head on the
        // Sequence response gave incorrect results.
        const content = template.xpath('*').toArray();
        if (! content.length) {
            throw new ConfigError(
                'A template must have element content', config);
        }

        if (content.length != 1) {
            xdmp.log('FOUND ' + content.length + ' NODES');
            throw new ConfigError(
                'A template must contain exactly one element', config);
        }

        const templateName = template.getAttribute('name') ?
            template.getAttribute('name') : defaultTemplateName;

        const templateData = {
            format: 'XML', // it's an XML config - must be XML
            content: content[0], // remember that it's an array
        };

        logger.debug('xml-config', 'Found XML template ' +
            xdmp.quote(template));

        if (templateData.name && templates[templateName]) {
            throw new ConfigError('Two templates named "' +
                templateName + '" found.', config);
        }

        templates[templateName] = templateData;
    }

    const templateCount = Object.keys(templates).length;
    logger.debug('xml-config',
        'Loaded ' + templateCount.toString() + ' templates directly');

    for (const templateUri of templateUris) {
        const uri = templateUri.firstChild.textContent;

        // Sanity checks
        if (! uri) {
            throw new ConfigError(
                'Template URIs cannot be empty', config);
        }

        const uriType = xdmp.uriContentType(uri);

        if (! uriType) {
            throw new ConfigError(
                'The template referenced by URI "' + uri +
                '" does not exist or cannot be accessed.', config);
        }

        logger.debug('Template with uri "' + uri + '" (' + uriType +
            ') found.');

        if (uriType == 'application/x-unknown-content-type') {
            throw new ConfigError('The template with URI "'+ uri + '" was not found.', config);
        }

        if (!(uriType == 'application/xml' || uriType == 'application/json')) {
            throw new ConfigError('The template with URI "'+ uri +
                '" is neither XML nor JSON. Detected type: "'+uriType+'"', config);
        }

        const templateDoc = cts.doc(uri);

        if (!templateDoc) {
            throw new ConfigError(
                'Unable to load template "' + uri + '"',
                config);
        }

        const templateData = {
            format: uriType,
            content: templateDoc.root,
        };

        const templateName = templateUri.getAttribute('name') ?
            templateUri.getAttribute('name') : defaultTemplateName;

        if (templateName && templates[templateName]) {
            throw new ConfigError('Two templates named "' +
                templateData.name + '" found.', config);
        }

        templates[templateName] = templateData;
    }

    const uriCount = Object.keys(templates).length - templateCount;
    logger.debug('xml-config',
        'Loaded ' + uriCount.toString() + ' templates by URI');

    // Make sure they are all consistent types (gets the formats,
    // filters for unique values and then counts the result)
    if (Object
        .keys(templates)
        .map((name) => templates[name].format)
        .filter((value, index, self) => self.indexOf(value) === index)
        .length > 1) {
        throw new ConfigError('Templates must be all of the same format',
            config);
    }

    // Make sure we have a main template.
    if (Object
        .keys(templates)
        .filter((value) => value == defaultTemplateName)
        .length == 0) {
        throw new ConfigError(
            'Either a single template or a template called "main" must exist',
            config);
    }

    return templates;
}

/**
 * Load internal templates.
 * @param {object} config - the config XML node
 * @return {object} map containing the loaded templates.
 */

/**
 * Get any function library loader information and convert to a map.
 * This function does no checking because that is handled in the
 * loader itself
 * @param {object} config - the config XML node
 * @return {object} the function library definitions
 */
function functionModulesToMap(config) {
    const functionModules = {
        functionLibraries: [],
        functionCollections: [],
        functionDirectories: [],
    };

    functionModules.functionLibraries = config.xpath(
        '//dm:function-modules/dm:function-library', ns).toArray().map(
        (node) => node.firstChild.textContent);
    functionModules.functionCollections = config.xpath(
        '//dm:function-modules/dm:function-collection', ns).toArray().map(
        (node) => node.firstChild.textContent);
    functionModules.functionDirectories = config.xpath(
        '//dm:function-modules/dm:function-directory', ns).toArray().map(
        (node) => node.firstChild.textContent);

    return functionModules;
}

module.exports.canonicalConfig = canonicalConfig;
