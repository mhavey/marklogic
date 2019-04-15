'use strict';

const logger = require('/ext/declarative-mapper/logging.sjs');

/**
 * Error generated when an expression fails at runtime.
 */
module.exports = class RuntimeError extends Error {
    /**
    * Constructors a new RuntimeError.
    * @param {string} message the error message
    * @param {object} runtimeContext the current runtime state if available.
    * @param {string} expression the expression text
    * @param {object} result the processing result if available
    */
    constructor(message,
        runtimeContext = null,
        expression = null,
        result = null) {
        super(message);
        this.name = 'RuntimeError';
        this.runtimeContext = runtimeContext;
        this.expression = expression;
        this.result = result;

        logger.logError(this);
    }

    /**
     * User error message output
     * @return {string} error message
     */
    userMessage() {
        const base = 'ERROR: ' + this.message;
        if (this.expression) {
            return base + 'in "' + this.expression + '" ("'
                + this.fullExpression + '"): ';
        } else {
            return base;
        }
    }
};


