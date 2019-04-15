'use strict';

const logger = require('/ext/declarative-mapper/logging.sjs');
const utils = require('/ext/declarative-mapper/utils.sjs');

/**
 * Error generated when the compiler fails to parse an expression.
 */
module.exports = class CompileError extends Error {
    /**
    * Constructors a new CompileError.
    * @param {string} message the error message
    * @param {object} tree the parse tree for the expression
    * @param {object} compilerContext the compile state at the time of error
    */
    constructor(message, tree, compilerContext) {
        super(message);
        this.name = 'CompilerError';
        this.parseTree = tree;
        this.expression = utils.expressionFromAST(tree);
        this.original = tree.original ?
            utils.expressionFromAST(tree.original) :
            null;
        this.compilerContext = compilerContext;

        logger.logError(this);
    }

    get tree() { return this.parseTree; }
    get context() { return this.compilerContext}
};
