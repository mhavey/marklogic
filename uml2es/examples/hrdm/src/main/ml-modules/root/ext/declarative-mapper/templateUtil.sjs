'use strict';

const jsonCompiler = require('/ext/declarative-mapper/json-config.sjs');
const logger = require('/ext/declarative-mapper/logging.sjs');
const XMLCompiler = require('/ext/declarative-mapper/xml-template.sjs');
const UTIL = require('/ext/declarative-mapper/json-template/jsonUtil.sjs');
const jsonRenderer = require('/ext/declarative-mapper/json-template/jsonRenderer.sjs');
// NG - commented out as extractor is now a standard function
//const extractors = require('/ext/declarative-mapper/base-extractors.sjs');


const SYSTEM_VARS = '$systemVars';


let parsers = {
    'XML': parseXmlTemplate,
    'JSON': parseJsonTemplate
};

/**
 * To parse template of given format. 
 * Either template or templateUri should have value but not both. 
 * If both are specified, templateUri is used.
 *
 * @param format - template format such as 'xml', 'json' and so on
 * @param templateDef - inline template definition, null if no inline template
 * @param templateUri - template URI if not inline, null if inline
 * @param compilerContent - complier context
 *
 * return template function that take document and runtime context as arguments
 */
function parseTemplate(format, templateDef, templateUri, compilerContext) {
    let type = format.toUpperCase();
    let result = null;

    let parser = parsers[type];
    if (parser) {
        result = parser(templateDef, templateUri, compilerContext);
    }
    else {
        logger.fatal("parseTemplate", "un-recognize template format: " + format);
    }

    return result;
}

/**
 * To parse XML template
 * Either template or templateUri should have value but not both. 
 * If both are specified, templateUri is used.
 *
 * @param templateDef - inline template definition, null if no inline template
 *                      can either be JSON object or string
 * @param templateUri - template URI if not inline, null if inline
 * @param compilerContent - complier context
 *
 * return template function that take document and runtime context as arguments
 */
function parseXmlTemplate(templateDef, templateUri, compilerContext) {
    let result = null;

    if (templateUri) {
        let template = loadTemplate(templateUri);
        result = XMLCompiler.compileTemplate(template.root, compilerContext);
    }
    else {
        if (!templateDef) {
            logger.fatal('parseXmlTemplate', 'no inline template or template URI');
        }
        else {    // templateDef is expected to be string
            try {
                let template = fn.head(xdmp.unquote(templateDef));
                result = XMLCompiler.compileTemplate(template.root, compilerContext);
            }
            catch(ex) {
                logger.fatal("parseXmlTemplate", ex.toString());
            }
        }
    }

    return result;
}

 /*
  * Load a template from the database, giving an appropriate
  * error if not found
  * @param templateUri - the URI of the template to load
  * @return document node or object node
  */
 function loadTemplate(templateUri) {

    // fn.doc returns a sequence.
    for (const doc of fn.doc(templateUri)) { return doc; }
    logger.fatal(("loadTemplate"), "Unable to load '" + templateUri + "' from the database.");

 }


/**
 * To parse JSON template
 * Either template or templateUri should have value but not both. 
 * If both are specified, templateUri is used.
 *
 * @param templateDef - inline template definition, null if no inline template
 * @param templateUri - template URI if not inline, null if inline
 * @param compilerContent - complier context
 *
 * return template function that take document and runtime context as arguments,
 *        null if error
 */
function parseJsonTemplate(templateDef, templateUri, compilerContext) {
    let result = null;
    let template = templateDef;

    if (templateUri) {
        template = UTIL.loadFile(templateUri);
    }
    else if (!templateDef) {
        logger.fatal('parseJsonTemplate', 'no inline template or template URI');
    }

    if (template)  {
        try {
            if ('string' == typeof template) {
                template = fn.head(xdmp.unquote(template));
            }
            result = jsonRenderer.parseTemplate(template, compilerContext);
        }
        catch (err) {
            logger.fatal('parseJsonTemplate', err.toString());
        }
    }
    
    return result;
}

/**
 * To run template. Runtime context will be reset before run.
 *
 * @param doc - document to feed into template
 * @param templateFunc - template function to run
 * @param compilerContext - compiler context
 * @param systemVars - JSON object of systemvariables to include in runtime context
 *
 * @return A list of documents generated from templates.
 */
 function runTemplate(doc, templateFunc, compilerContext, systemVars) {
     resetRuntimeContext(compilerContext);
     compilerContext.runtimeContext[SYSTEM_VARS] = systemVars;
     return templateFunc(doc, compilerContext.runtimeContext);
 }
 
 /**
  * To reset runtime context
  *
  * @param compilerContext -  compiler context
  * @return runtime context
  */
  
function resetRuntimeContext(compilerContext) {
    compilerContext.runtimeContext = {
        format: compilerContext.format,
        doc: {},
        caches: {}
    }
    return compilerContext.runtimeContext;
}

/**
 * To change input format
 *
 * @param inFormat - format
 * @param compilerContext - compiler context
 *
 */
function setFormat(inFormat, compilerContext) {
    compilerContext.format = inFormat;
//    NG - commented out as this is handled elsewhere in current code.
//    TODO - refactor to support properly
//    compilerContext.functions.extract = extractors.findExtractor(compilerContext);
}

exports.parseTemplate = parseTemplate;
exports.parseJsonTemplate = parseJsonTemplate;
exports.parseXmlTemplate = parseXmlTemplate;
exports.loadTemplate = loadTemplate;
exports.resetRuntimeContext = resetRuntimeContext;
exports.setFormat = setFormat;
exports.runTemplate = runTemplate;
