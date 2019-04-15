/*jshint esversion: 6 */
/* globals fn */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */

'user strict';

let NODES = require('/ext/declarative-mapper/json-template/jsonNodes.sjs');
let LOGGER = require('/ext/declarative-mapper/logging.sjs');
let UTIL = require('/ext/declarative-mapper/json-template/jsonUtil.sjs');

/**
 * To parse json document template into a function call.
 * Caller can then transform a document as follows:
 * 
 * let template = parseTemplate(template, comiplerContext)
 * template(doc, compilerContext.runtimeContext)
 *
 * @param template - output doc template
 * @param compileContext - to receive parser result
 *
 * @return template node if success, null otherwise
 */
function parseTemplate(template, compileContext) {
    let rootNode;
    
    if (template) {
        if (template instanceof Array || 'array' == template.nodeKind) {
            rootNode = NODES.parseLoop('', template, compileContext, true);
        }
        else {
            rootNode = NODES.parseObject('', template, compileContext);
        }
    }
    else {
        LOGGER.fatal('parseTemplate', 'Missing template specification');
    }

    let func = function(doc, runtimeState) {
        return rootNode.render(doc, runtimeState);
    };
    
    if (rootNode.multiDocs) {
        func.multiDocs = true;
    }

    return func;
}

exports.parseTemplate = parseTemplate;
