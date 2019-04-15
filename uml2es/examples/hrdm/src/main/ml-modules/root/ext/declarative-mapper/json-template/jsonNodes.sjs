/*jshint esversion: 6 */
/* globals fn */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */

'user strict';

const EXP_COMPILER = require('/ext/declarative-mapper/syntax-tree-compiler.sjs');
const UTIL = require('/ext/declarative-mapper/json-template/jsonUtil.sjs');
const LOGGER = require('/ext/declarative-mapper/logging.sjs');
const CONST = require('/ext/declarative-mapper/const.sjs');

/**
 * Parse expression and return an expression node.
 *
 * @param name - attribute name
 * @param expression - given expression
 * @param compilerContext - the compiler state, used to resolve functions
 *
 * @return expression node, null if compilation error.
 */
function parseExpression(name, expression, compilerContext) {
    let success = true;
    let parts = UTIL.splitExpression(expression, compilerContext);
    let cparts = [];

    if (parts) {
        for (let part of parts) {
            if ('string' == typeof part) {
                cparts.push(UTIL.literalExpr(part));
            }
            else {
                let expFunc = EXP_COMPILER.compileExpression(part.exp, compilerContext);
                if (expFunc) {
                    cparts.push(expFunc);
                }
                else {
                    success = false;
                }
            }
        }
    }
    else {
        success = false;
    }

    if (!success)
        return null;

    // --- blank string ---
    if (0 == parts.length) {
      return new LiteralNode(name, expression, compilerContext);
    }
    
    return new ExpressionNode(cparts);
}

/**
 * Constructor for an expression node
 *
 * @param cparts - list of expression functions
 * @param compilerContext - the compiler state
 *
 */
function ExpressionNode(cparts) {
    this.parts = cparts;
    this.render = renderExpression;
}


/**
 * Rendering routine for expression node
 *
 * @param doc - document to be rendered
 * @param runtimeState - state of the run time
 *
 * @return Rendering of this node
 */
function renderExpression(doc, runtimeState) {

    if (!this.parts)
        return null;

    let result;
    if (1 == this.parts.length) {
        let part = this.parts[0];
        result = part(doc, runtimeState);
        if (result && 'text' == result.nodeKind) {
            result = result.toString();
        }
    }
    else {
        for(let part of this.parts) {
            let value = part(doc, runtimeState);
            if (value && 'text' == value.nodeKind) {
                value = value.toString();
            }

            // --- skip undefined ---
            if (value ===- undefined) {
                continue;
            }

            // --- initialize result if first time ---
            if (undefined === result) {
                result = '';
            }
            result += value;
        }
    }

    return result;
}

/**
 * Constructor for an literal node
 *
 * @param name - attribute name
 * @param value - given literal
 * @param compilerContext - the compiler state
 *
 */
function LiteralNode(name, value, compilerContext) {
    this.value = value;
    this.render = renderLiteral;
}


/**
 * Rendering routine for literal node
 *
 * @param doc - document to be rendered
 * @param runtimeState - state of the run time
 *
 * @return Rendering of this node
 */
function renderLiteral(doc, runtimeState) {
    return this.value;
}

/**
 * Parse object template and return an object node.
 *
 * @param name - attribute name
 * @param expression - given expression
 * @param compilerContext - the compiler state, used to resolve functions
 *
 * @return expression node, null if compilation error.
 */
function parseObject(name, obj, compilerContext) {
    let success = true;

    let model = {};
    let node;
    for (let key in obj) {
        let value = obj[key];

        // --- skip functions ---
        if (null === value || (value && !value.nodeKind)) {
            continue;
        }

        if ('string' == typeof value || (value && value.nodeKind == 'text')) {
            node = parseExpression(key, '' + value, compilerContext);
        }
        else if (value instanceof Array || (value && value.nodeKind == 'array')) {
            node = parseLoop(key, value, compilerContext);
        }
        else if (value instanceof Object || (value && value.nodeKind == 'object')) {
            node = parseObject(key, value, compilerContext);
        }
        else {
            node = new LiteralNode(key, value, compilerContext);
        }

        if (node) {
            model[key] = node;
        }
        else {
            success = false;
        }
    }

    if (!success)
        return null;

    return new ObjectNode(model);
}

/**
 * Constructor for an object node
 *
 * @param model - template model
 *
 */
function ObjectNode(model) {
    this.model = model;
    this.render = renderObject;
}

/**
 * Rendering routine for object node
 *
 * @param doc - document to be rendered
 * @param runtimeState - state of the run time
 *
 * @return Rendering of this node
 */
function renderObject(doc, runtimeState) {
    let result = {};

    for (let key in this.model) {
        let node = this.model[key];
        let val = node.render(doc, runtimeState);
        if (undefined === val)
            continue;
        result[key] = val;
    }

    return result;
}

/**
 * Parse loop construct returns a loop node or array node.
 * Loop node is indicated by first item starting with %%
 *
 * @param name - attribute name
 * @param expression - given expression
 * @param compilerContext - the compiler state, used to resolve functions
 * @param topLoop - loop at top level
 *
 * @return loop node or array node, null if compilation error.
 */
function parseLoop(name, array, compileContext, topLoop) {
    let success = true;
    let cselector;
    let metadata;
    let template;
    let result;
    let multiDocs = false;

    while(true) {

        let firstItem = array[0].toString();
        if (!firstItem.startsWith('%%')) {
            result = parseArray(name, array, compileContext);
            break;
        }

        if (2 > array.length) {
            LOGGER.fatal('parseLoop', 'loop require sub-template: ' + name);
            success = false;
            break;
        }

        let startIndex = 2;
/*
        if (firstItem.startsWith('%%%')) {
            if (!topLoop) {
                LOGGER.fatal('parseLoop', 'Cannot use %%% at non top level loop: ' + name);
                success = false;
                break;
            }
            startIndex = 3;
            multiDocs = true;
        }
*/

        let selectorStr = firstItem.substring(startIndex);    // drop %% or %%%
        let parts = UTIL.splitExpression(selectorStr, compileContext);
        if (0 == parts.length) {
//            result = parseArray(name, array, compileContext);
            LOGGER.fatal('parseLoop', 'selector is empty: ' + name);
            success = false;
            break;
        }
        else if (1 < parts.length) {
            LOGGER.fatal('parseLoop', 'selector for "' + name + '" is invalid: ' + selectorStr);
            success = false;
            break;
        }

        let selector = parts[0];
        if ('string' == typeof selector) {
            LOGGER.fatal('parseLoop', 'selector for "' + name +
                '" cannot be a literal: ' + selectorStr);
            success = false;
            break;
        }

        cselector = EXP_COMPILER.compileExpression(selector.exp, compileContext);
        template = parseObject(name, array[1], compileContext);

        if (template && 2 < array.length) {
            if (multiDocs) {
                metadata = parseObject(name, array[2], compileContext);
            }
            else {
                LOGGER.fatal('parseLoop', 'Metadata only applies to %%%: "' + name + '"');
                success = false;
                break;
            }
        }
        break;
    }


    if (success && cselector && template) {
        result = new LoopNode(cselector, template, metadata);
        if (multiDocs) {
            result.multiDocs = true;
        }

    }

    return result;
}

/**
 * Constructor for loop node
 * @param selector - expression to select child records
 * @param template sub-template to apply to each child record
 * @param metadata - meta date template
 *
 */
function LoopNode(selector, template, metadata) {
    this.selector = selector;
    this.node = template;
    this.metadata = metadata;
    this.render = renderLoop;
}

/**
 * Rendering routine for loop node
 *
 * @param doc - document to be rendered
 * @param runtimeState - state of the run time
 *
 * @return Rendering of this node
 */
function renderLoop(doc, runtimeState) {
    let result = [];

    runtimeState.selector = this.selector;

    // --- set up to record current child index ---
    let indexList = runtimeState[CONST.INDEX_LIST];
    if (!indexList) {
        indexList = [];
        runtimeState[CONST.INDEX_LIST] = indexList;
    }
    let myPos = indexList.length;
    indexList.push(0);      // reserve a space in the indexes array

    let docs = runtimeState[CONST.DOCS_KEY];
    if (!docs) {
        docs = [];
        runtimeState[CONST.DOCS_KEY] = docs;
    }
    let childRecs = this.selector(doc, runtimeState, true);
    if (!childRecs || 0 == fn.count(childRecs)) {
        return undefined;
    }

    docs.push(doc);

    if ('array' == childRecs.nodeKind) {
        for (let currChildIdx = 1; childRecs.length >= currChildIdx; ) {
            let rec = childRecs[currChildIdx - 1];

            docs.push(rec);
            indexList[myPos] = currChildIdx;                // record my index
            let childResult = this.node.render(rec, runtimeState);
            docs.pop();
            if (childResult)
                result.push(childResult);
            ++currChildIdx;
        }
    }
    else {  // sequence
        let currChildIdx = 1;
        for (let rec of childRecs) {
//xdmp.log(rec);
            docs.push(rec);
            indexList[myPos] = currChildIdx;                // record my index
            let childResult = this.node.render(rec, runtimeState);
            docs.pop();
            if (childResult)
                result.push(childResult);
            ++currChildIdx;
        }
    }
    runtimeState.selector = null;

    // --- remove my index ---
    docs.pop();
    indexList.pop();

    return result;
}

/**
 * Parse array returns array node.
 *
 * @param name - attribute name
 * @param expression - given expression
 * @param compilerContext - the compiler state, used to resolve functions
 *
 * @return array node, null if compilation error.
 */
function parseArray(name, array, compileContext) {
    let success = true;

    let childNodes = [];
    for (let idx = 0; idx < array.length; ++idx) {
        let item = array[idx];
        let parsed;
        if ('string' == typeof item || (item && item.nodeKind == 'text')) {
            parsed = parseExpression(name, item.toString(), compileContext);
        }
        else if (item instanceof Array) {
            parsed = parseLoop(name, item, compileContext);
        }
        else {
            parsed = parseObject(name, item, compileContext);
        }

        if (parsed){
            childNodes.push(parsed);
        }
        else {
            success = false;
        }
    }

    if (!success)
        return null;

    return new ArrayNode(childNodes);
}

/**
 * constructor of array node
 *
 * @param childNodes - childNodes in the array
 */
function ArrayNode(childNodes) {
    this.childNodes = childNodes;
    this.render = renderArray;
}

/**
 * To render array node
 *
 * @param doc - document to be rendered
 * @param runtimeState - state of the run time
 *
 * @return Rendering of this node
 */
function renderArray(doc, runtimeState) {
    let children = this.childNodes;
    let result = [];

    for (let child of children) {
        let val = child.render(doc, runtimeState);
        result.push(val);
    }

    return result;
}


exports.LoopNode = LoopNode;
exports.ObjectNode = ObjectNode;
exports.LiteralNode = LiteralNode;
exports.ExpressionNode = ExpressionNode;
exports.ArrayNode = ArrayNode;
exports.parseExpression = parseExpression;
exports.parseObject = parseObject;
exports.parseLoop = parseLoop;
exports.parseArray = parseArray;
