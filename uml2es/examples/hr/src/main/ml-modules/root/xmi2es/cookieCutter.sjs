'use strict';

declareUpdate();

const sem = require("/MarkLogic/semantics.xqy");

const ALLOWABLE_PLUGINS = ["xqy", "sjs"];
const ALLOWABLE_FORMATS = ["xml", "json"];
const ALLOWABLE_SELECTS = ["all", "infer"];

// In the model find all entities that are not children of another entity. 
// Include entities that are merely self-references.
// We consider these entities to be viable plugins.
// In some models this inference won't work. Our movies model has every entity as a child of something. 
// It's hard to INFER where the plugins are.
function inferPlugins(modelIRI) {
	var res = sem.sparql(`
select distinct ?pluginName where {
  {
    <${modelIRI}> <http://marklogic.com/entity-services#definitions>  ?plugin .
    $plugin <http://marklogic.com/entity-services#title>  ?pluginName
  }
  MINUS {
    {
      <${modelIRI}> <http://marklogic.com/entity-services#definitions> ?entity.
      ?entity <http://marklogic.com/entity-services#property> ?attribute .
      ?attribute <http://marklogic.com/entity-services#items> ?def .
      ?def <http://marklogic.com/entity-services#ref> ?plugin .     
      ?plugin <http://marklogic.com/entity-services#title>  ?pluginName .
    }
    UNION 
    {
      <${modelIRI}> <http://marklogic.com/entity-services#definitions> ?entity.
      ?entity <http://marklogic.com/entity-services#property> ?attribute .
      ?attribute <http://marklogic.com/entity-services#ref> ?plugin .   
      ?plugin <http://marklogic.com/entity-services#title>  ?pluginName .
    }
    FILTER( ?entity != ?plugin)    
  }
}`);
	var plugins = [];
	for (var p of res) plugins.push(p.pluginName);
	return plugins;
}

function useAllEntities(modelIRI) {
	var res = sem.sparql(`
select distinct ?pluginName where {
    <${modelIRI}> <http://marklogic.com/entity-services#definitions>  ?plugin .
    $plugin <http://marklogic.com/entity-services#title>  ?pluginName
 }`);
	var plugins = [];
	for (var p of res) plugins.push(p.pluginName);
	return plugins;
}

function getBuilderFunctions(modelIRI) {
	var res = sem.sparql(`
select distinct ?function where { <${modelIRI}> <http://marklogic.com/xmi2es/xes#hasFunction>  ?function }
`);

	var functions = [];
	for (var p of res) functions.push(p.function);
	return functions;
}

function useTemplate(name) {
	var doc = xdmp.eval('cts.doc(name)', {name: name}, {"database": xdmp.modulesDatabase()});
	if (!doc || doc == null) throw "Unable to find template *" + name + "*";
	return ""+doc;
}

function writeFile(folder, name, content, asText, model) {
	var contentNode =content;
	if (asText == true) {
		var textNode = new NodeBuilder();
		textNode.addText(content);
		contentNode = textNode.toNode();
	}
	xdmp.documentInsert(folder + name, contentNode, 
	{
		"collections": ["cookieCutter", model]
	}); // TODO - perms
}

function cutContent(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, template) {
	var EntityXContentEnable = "";
	var EntityXContentXEnableIn = "";
	var EntityXContentXEnableOut = "";
	var EntityX = entity;
	var EntityXGenURI = modelIRI;

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutTriples(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, template) {
	var hasTripleFunction = builderFunctions.indexOf("setTriples_" + entity) >= 0;
	var EntityXTripleEnable = hasTripleFunction == true ? "" : "//";
	var EntityX = entity;
	var EntityXTripleDisable = hasTripleFunction == false ? "" : "//";
	var EntityXTripleXEnableIn = hasTripleFunction == true ? "" : "(:";
	var EntityXGenURI = modelIRI;
	var EntityXTripleXEnableOut = hasTripleFunction == true ? "" : ":)";
	var EntityXTripleXDisableIn = hasTripleFunction == false ? "" : "(:";
	var EntityXTripleXDisableOut = hasTripleFunction == false ? "" : ":)";

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutHeaders(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, template) {
	var hasHeaderFunction = builderFunctions.indexOf("setHeaders_" + entity) >= 0;
	var EntityXHeaderEnable = hasHeaderFunction == true ? "" : "//";
	var EntityX = entity;
	var EntityXHeaderDisable = hasHeaderFunction == false ? "" : "//";
	var EntityXHeaderXEnableIn = hasHeaderFunction == true ? "" : "(:";
	var EntityXGenURI = modelIRI;
	var EntityXHeaderXEnableOut =hasHeaderFunction == true? "" : ":)";
	var EntityXHeaderXDisableIn = hasHeaderFunction == false ? "" : "(:";
	var EntityXHeaderXDisableOut = hasHeaderFunction == false ? "" : ":)";
	var EntityDataFormat = dataFormat;

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutWriter(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, template) {
	var hasWriterFunction = builderFunctions.indexOf("runWriter_" + entity) >= 0;
	var EntityXWriterEnable = hasWriterFunction == true ? "" : "//";
	var EntityX = entity;
	var EntityXWriterDisable = hasWriterFunction == false ? "" : "//";
	var EntityXWriterXEnableIn = hasWriterFunction == true ? "" : "(:";
	var EntityXGenURI = modelIRI;
	var EntityXWriterXEnableOut = hasWriterFunction == true ? "" : ":)";
	var EntityXWriterXDisableIn = hasWriterFunction == false ? "" : "(:";
	var EntityXWriterXDisableOut = hasWriterFunction == false ? "" : ":)";

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutCookie(model, entitySelect, entitiesCSV, dataFormat, pluginFormat, flowName, mappingHints) {

	// validate
	if (pluginFormat == null || ALLOWABLE_PLUGINS.indexOf(pluginFormat) < 0) throw "Illegal plugin format *" + pluginFormat + "*";
	if (dataFormat == null || ALLOWABLE_FORMATS.indexOf(dataFormat) < 0) throw "Illegal data format *" + dataFormat + "*";
	if (entitySelect != null && ALLOWABLE_SELECTS.indexOf(entitySelect) < 0) throw "Illegal entity select *" + entitySelect + "*";

	// make sure I'm on a version of DHF that I can deal with
	var version = "4.1";
	/*
	TODO - this gives me 4.1.0; only really need 4 or 4.1
	try {
		var configDoc = xdmp.eval('cts.doc("/com.marklogic.hub/config.sjs")', {}, {"database": xdmp.databaseName(xdmp.modulesDatabase())});
		if (!configDoc || configDoc == null) throw "Unable to determine DHF version";
		version = (""+configDoc).split("HUBVERSION:")[1].split("\"")[1].trim();		
	} catch (e) {
		xdmp.log("Unable to determine DHF version " + e);
	}
	*/

	// use this template folder
	var templateFolder = "/xmi2es/dhfTemplate/" + version + "/harmonize/";

	// find the model
	var doc = cts.doc("/xmi2es/es/" + model + ".json");
	if (!doc || doc == null) throw "Model not found *" + model + "*";
	var odoc = doc.toObject();
	var info = odoc.info;
	var modelIRI = info.baseUri + "/" +  info.title + "-" + info.version;
	var modelIRIHash = info.baseUri + "#" +  info.title + "-" + info.version; // cuz ES uses model IRI in a weird way

	// determine the builder block functions implemented
	var builderFunctions = getBuilderFunctions(modelIRI);
	xdmp.log("BUILDER FUNCTIONS " + JSON.stringify(builderFunctions));

	// which entities?
	var entities;
	if (entitiesCSV && entitiesCSV != null) entities = entitiesCSV.split(",");
	else if (entitySelect == "infer") entities = inferPlugins(modelIRIHash);
	else if (entitySelect == "all") entities = useAllEntities(modelIRIHash);
	else throw "Should not have gotten here *" + entitySelect + "*";

	if (entities.length == 0) throw "No entities specified or inferred";

	// create plugins (with harmonization) for each
	if (flowName == null) flowName = "Harmonize";
	for (var i = 0; i < entities.length; i++) {
		var entity = entities[i].trim();
		var folder = "/cookie/" + model + "/" + entity + "/";
		writeFile(folder, entity + ".entity.json", {"note": "the model is not here but in " + model}, false, model);

		var thisFlow = entity + flowName + "_" + pluginFormat;
		var harmonizationFolder = folder + "harmonize/" + thisFlow + "/";
		var cookieFolder = templateFolder + pluginFormat + "/";

		// now let's cookie-cut the harmonization flow
		xdmp.log("COOKIE *" + harmonizationFolder + "*");
		writeFile(harmonizationFolder, thisFlow + ".properties", 
			useTemplate(cookieFolder + "XFlow_" + pluginFormat + ".properties"), true, model);
		writeFile(harmonizationFolder, "collector." + pluginFormat, 
			useTemplate(cookieFolder + "collector.t" + pluginFormat), true, model);
		writeFile(harmonizationFolder, "main." + pluginFormat, 
			useTemplate(cookieFolder + "main.t" + pluginFormat), true, model);
		writeFile(harmonizationFolder, "content." + pluginFormat, 
			cutContent(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, 
				useTemplate(cookieFolder + "content.t" + pluginFormat)), true, model);
		writeFile(harmonizationFolder, "triples." + pluginFormat, 
			cutTriples(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, 
				useTemplate(cookieFolder + "triples.t" + pluginFormat)), true, model);
		writeFile(harmonizationFolder, "headers." + pluginFormat, 
			cutHeaders(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, 
				useTemplate(cookieFolder + "headers.t" + pluginFormat)), true, model);
		writeFile(harmonizationFolder, "writer." + pluginFormat, 
			cutWriter(modelIRI, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, 
				useTemplate(cookieFolder + "writer.t" + pluginFormat)), true, model);
	}
}

module.exports = {
  cutCookie: cutCookie
};