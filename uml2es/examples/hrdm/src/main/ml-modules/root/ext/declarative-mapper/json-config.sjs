/*jshint esversion: 6 */
/* global xdmp */
/* global fn */
/* global require */
/* global exports */
'use strict';

/**
 * Module to compile templates in JSON to an executable format.
 * Given a template (as an element node) and the compiler context
 * builds a function that can be applied to a document to create
 * a new document derived from the input document and the input
 * template.
 */
const ConfigError = require('/ext/declarative-mapper/errors/ConfigError.sjs');
const UTIL = require('/ext/declarative-mapper/json-template/jsonUtil.sjs');

/**
 * Convert an JSON config into a Javascript config object.
 *
 * @param {object} config - the JSON representing the config
 * @return {object} the rewritten configuration
 */
function canonicalConfig(config) {
    if (xdmp.nodeKind(config) == 'document') {
        config = config.root;
    }
    return {
        format: ((config.input && config.input.format) ? config.input.format : 'json'),
        configFormat: 'json',
        variables: config.variables,
        templates: loadTemplates(config.outputs),
        functionModules: config.modules,
        namespaces: config.namespaces,
        preprocessors: config.preprocessors
    };
}

/**
 * To load all the templates that has templateURI
 *
 * @param templateMap - input template map
 * @return template map with all the templates loaded
 */
function loadTemplates(templateMap) {
    let errMsgs = [];

    for (let key in templateMap) {
        let templateItem = templateMap[key];
        if (templateItem instanceof Array) {
            for (let item of templateItem) {
                loadTemplate(item, errMsgs);
            }
        }
        else {
            loadTemplate(templateItem, errMsgs);
        }
    }

    if (0  < errMsgs.length) {
       throw new ConfigError(errMsgs.join('\r\n'));
    }

    return templateMap;
}

function loadTemplate(templateSpec, errMsgs) {
    let uri = templateSpec.templateUri;
    if (uri && !templateSpec.content) {
        let content = UTIL.loadFile(uri);
        if (!content) {
            errMsgs.push('Template URI not found: ' + uri);
        }
        else {
            if ('string' == typeof content) {
                content = fn.head(xdmp.unquote(content));
                templateSpec.content = content.root;
            }
            else if ('document' == content.nodeKind) {
                templateSpec.content = content.root;
            }
            else {
               errMsgs.push('Template content not recognized: ' + uri);
            }
        }
    }
    else { //convert to objectNode so that we can use XPTAH 
      let content = templateSpec.content;
      if (content) {
          if ('string' == typeof content  || (content && 'text' == content.nodeKind)) {
            content = fn.head(xdmp.unquote(content.toString()));
          }
          else {
            content = fn.head(xdmp.unquote(JSON.stringify(content)));
          }
          templateSpec.content = content.root;
      }
      else {
          errMsgs.push('Missing template content');
      }
    }
}


exports.canonicalConfig = canonicalConfig;