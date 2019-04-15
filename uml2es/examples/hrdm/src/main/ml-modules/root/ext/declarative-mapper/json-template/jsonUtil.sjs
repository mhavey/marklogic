/*jshint esversion: 6 */
/* globals fn */
/* globals xdmp */
/* globals require */
/* globals exports */
/* globals Sequence */

'use strict';

const LOGGER = require('/ext/declarative-mapper/logging.sjs');
const ConfigError = require('/ext/declarative-mapper/errors/ConfigError.sjs');

/**
 * To split the expression into array of sub expressions
 * For example 'abs-[[xpath("id")]]-def' will be split into the following:
 * [ 'abc-', {exp: 'xpath("id")'}, '-def']
 *
 * @param expression - given expression
 * @param compilerContext - the compiler state
 *
 * @return array of sub expressions
 */
function splitExpression(expression, compilerContext) {
    let state = 0;        // 0=find [[, 1=[,  2=[[, 3=]
    let result = [];
    let start = 0;
    let mark = start;
    let nest = 0;

    for (let idx = 0; expression.length > idx; ++idx) {
        let cc = expression.charAt(idx);
        if (0 == state) {
            if ('[' == cc) {
                mark = idx;
                state = 1;
            }
        }
        else if (1 == state) {
            if ('[' == cc) {
                if (mark > start + 1) {
                    result.push(expression.substring(start, mark));
                }
                start = idx + 1;
                mark = start;
                state = 2;
            }
            else {
                state = 0;    // not [[
            }
        }
        else if (2 == state) {
            if ('[' == cc) {
                ++nest;
            }
            else if (']' == cc) {
                if (0 < nest) {
                  --nest;
                }
                else {
                    mark = idx;
                    state = 3;
                }
            }
        }
        else if (3 == state) {
            if (']' == cc) {
                if (mark > start + 1) {
                    result.push({exp: expression.substring(start, mark).trim()});
                }
                start = idx + 1;
                mark = start;
                state = 0;
            }
            else {
                state = 2;    // not ]]
            }
        }
    }

    if (expression.length > start) {
        result.push(expression.substring(start, expression.length));
    }

    if (0 != state) {
        LOGGER.fatal('splitExpression', 'invalid expression: ' + expression);
        return null;
    }

    return result;
}


/**
 * Handle literal expressions
 * @param expr - the literal expression
 * @param compilerContext - compiler state.
 * @return the value of the literal expression.
 */
function literalExpr(expr) {
    return function(doc, runtimeState) { return expr; };
}

function loadFile(uri) {
    let doc;

    // --- try MArkLogic function first ---
    try {
        let files = fn.doc(uri);
        if (files) {
            doc = fn.head(files);
        }
    }
    catch(err) {
        LOGGER.fatal('loadFile', 'cannot load file: ' + uri);
    }

    return doc;
}

exports.splitExpression = splitExpression;
exports.literalExpr = literalExpr;
exports.loadFile = loadFile;