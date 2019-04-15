'use strict';

const logger = require('/ext/declarative-mapper/logging.sjs');

/**
 * Error generated when the configuration file is incorrect
 */
module.exports = class ConfigError extends Error {
    /**
    * Constructors a new Configuration error.
    * @param {string} message the error message
    * @param {object} config the problematic configuration
    */
    constructor(message, config) {
        super(message);
        this.name = 'ConfigError';
        this.config = config;
        logger.logError(this);
    }
};
