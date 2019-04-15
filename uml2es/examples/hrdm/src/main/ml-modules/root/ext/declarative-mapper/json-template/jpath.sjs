/*jshint esversion: 6 */
/* globals fn */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */

'user strict';

/**
 * Constructor  object that contain the compiled path and the method
 * that extract value for that path from document
 *
 * @param path - JSON path in the form of 'attr[1][2].attr'
 */
function JPathObj(path) {
    this.pathParts = init(path);
    this.get = get;
}

/**
 * Object method to extract value using compiled path
 *
 * @param doc - document to extract value from
 * @param runtimeState - runtime state, not used
 *
 * @return document value at the given comipled path, can be null if 
 *         any component in the given path is missing
 */
function get(doc, runtimeState) {
    let currNode = doc;
    for (let loc of this.pathParts) {
        if (loc.attribute) {
            currNode = currNode[loc.attribute];
            if (!currNode)
                break;
        }

        if (loc.indexes) {
            for (let idx of loc.indexes) {
                currNode = currNode[idx];
                if (!currNode)
                    break;
            }
        }
    }

    return currNode;
}

/**
 * To compile given path
 * 
 * @param path to compile
 *
 * @return compiled path
 */
function init(path) {
    let parts = path.split('.');
    let pathParts = [];
    
    for (let part of parts) {
        if (0 == part.length)
            continue;
        let loc = splitPathPart(part);
        pathParts.push(loc);
    }
    
    return pathParts;
}

/**
 * To split path into components.
 * For example, 'attr[0][1]' will be split into
 * {attribute: 'attr', indexes: [0, 1]}
 *
 * @param pathPart - part of path of the form 'attr[0][1]',
 *                   only single attribute but can have multiple indexes.
 *
 * @return components in the form JSON object
 * {attirbute: (attrName), indexes [...]}
 */
function splitPathPart(pathPart) {
    let result = {attribute: pathPart};
    let start;
    let indexes = [];
    
    for (let idx = 0; pathPart.length > idx; ++idx) {
        let cc = pathPart.charAt(idx);
        if ('[' == cc) {
            start = idx + 1;
            if (0 == indexes.length) {
                result.attribute = pathPart.substring(0, idx);
            }
        }
        else if (']' == cc) {
      
            let indexStr = pathPart.substring(start, idx);
            let index = parseInt(indexStr, 10);
            if (isNaN(index)) {
                indexes.push(0);
            }
            else {
                indexes.push(index);
            }
        }
    }
    
    if (0 < indexes.length)
        result.indexes = indexes;

    return result;
}

/**
 * to get document value for given JSON path
 *
 * @param doc - document 
 * @param runtimeState -  runtime state, not used
 * @param path - JSON path of the form 'attr[0][1].attr2[1]'
 *
 * @return document value at the given JSON path, can be null if 
 *         any component in the given path is missing
 */
function jpath(doc, runtimeState, path) {
    let obj = new JPathObj(path);
    return obj.get(doc, runtimeState);
}

exports.jpath = jpath;
exports.JPathObj = JPathObj;