'use strict';

declareUpdate();

const sem = require("/MarkLogic/semantics.xqy");

const ALLOWABLE_PLUGINS = ["xqy", "sjs"];
const ALLOWABLE_FORMATS = ["xml", "json"];
const ALLOWABLE_SELECTS = ["all", "infer"];

function getAttributes(modelIRI, entityName) {
	var entity = modelIRI + "/" + entityName;
  var res = sem.sparql(`
select * where {
  <${entity}> <http://marklogic.com/entity-services#property> ?attrib .
  ?attrib <http://marklogic.com/entity-services#title> ?entityName .
  OPTIONAL { ?attrib <http://marklogic.com/entity-services#datatype> ?simpleType }
  OPTIONAL { ?attrib <http://marklogic.com/entity-services#ref> ?refType }
  OPTIONAL { ?attrib <http://marklogic.com/entity-services#datatype> <http://marklogic.com/json#array> .
             ?attrib <http://marklogic.com/entity-services#items> ?sitems .
             ?sitems <http://marklogic.com/entity-services#datatype> ?arraySimpleType }
  OPTIONAL { ?attrib <http://marklogic.com/entity-services#datatype> <http://marklogic.com/json#array> .
             ?attrib <http://marklogic.com/entity-services#items> ?ritems .
             ?ritems <http://marklogic.com/entity-services#ref> ?arrayRefType } 
  OPTIONAL { ?attrib <http://www.w3.org/1999/02/22-rdf-syntax-ns#type>	<http://marklogic.com/entity-services#RequiredProperty> .
             ?attrib <http://marklogic.com/entity-services#title> ?attribRequired }
  OPTIONAL { <${entity}> <http://marklogic.com/xmi2es/xes#excludes> ?attrib .
             ?attrib <http://marklogic.com/entity-services#title> ?attribExcluded }
}`);
  
	var attributes = [];
	for (var r of res) {
		var attrib = r.attrib;
		var typeRes = r.simpleType;
		var isArray = ""+r.simpleType == "http://marklogic.com/json#array";
		var isSimpleType = false;
		var isRefType = false;
		var type;
    
	    if (isArray == true) {
				if (""+r.arraySimpleType != "") {
					isSimpleType = true;
					type = ""+r.arraySimpleType;
	      }
	      else if (""+r.arrayRefType != "") {
	        isRefType = true;
	        type = ""+r.arrayRefType;
				}      
	    }
	    else if (""+r.simpleType != "") {
	      isSimpleType = true;
	      type = ""+r.simpleType;
	    }
	    else if ("" + r.refType != "") {
	      isRefType = true;
	      type = ""+r.refType;
		}

		if (isRefType == true) {
			var toks = type.split("/");
			type = toks[toks.length - 1];
		}
		if (isSimpleType == true) {
			var toks = type.split("#");
			type = toks[1];
		}

    var isCalculated = false;
 		var calcs = [];
  	var calcRes = sem.sparql(`
select * where { 
  <${attrib}> <http://marklogic.com/xmi2es/xes#basedOnAttribute>  ?attribBasis 
  OPTIONAL { <${attrib}> <http://marklogic.com/xmi2es/xes#calculation>  ?attribCalculated }
}`);
    for (var c of calcRes) {
      isCalculated = true;
      calcs.push(c.attribBasis)  
    }
    
 		attributes.push({
			attributeName: r.entityName,
			attributeIsSimpleType: isSimpleType,
			attributeIsRequired: ""+r.attribRequired != "",
			attributeIsArray: isArray,
			attributeType: type,
			attributeIsExcluded: ""+r.attribExcluded != "",
			attributeIsCalculated:  isCalculated,
			attributeCalcDependencies:  Array.from(new Set(calcs)) // avoid repeats
		});
	}
	return attributes;
}

function orderAttributes(attribs) {
  return attribs.sort(function (a,b) {
    if (a.attributeName == b.attributeName) return 0;
    var aHas= (a.attributeCalcDependencies.length > 0);
    var bHas = (b.attributeCalcDependencies.length > 0);
    if (aHas == false && bHas == false) return a.attributeName - b.attributeName;
    if (aHas == true && bHas == false) return 1;
    if (bHas == true && aHas == false) return -1;
    if (a.attributeCalcDependencies.indexOf(b.attributeName) >= 0) return 1;
    if (b.attributeCalcDependencies.indexOf(a.attributeName) >= 0) return -1;
    return a.attributeName - b.attributeName;
  });
}

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

function cutContent(modelIRI, modelVersion, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, template) {
	var EntityXContentEnable = "";
	var EntityXContentXEnableIn = "";
	var EntityXContentXEnableOut = "";
	var EntityX = entity;
	var EntityXGenURI = modelIRI;

	var ESBuilder = "";
	var ESXBuilder = "";

	// need to build functions buildESEntity_${EntityX}(id, source, options);

	// get each attribute; if it's primitive, map from source; if it's object, recurse
	// take into account order of concats

	var entities = [entity];
	var visitedEntities = [];
	while (entities.length > 0) {
		var nextEntity = entities[0];
xdmp.log("entity *" + nextEntity + "* entities" + JSON.stringify(entities) + " visited " + visitedEntities );
		entities = entities.slice(1);
		visitedEntities.push(entity);

		ESBuilder += `
function buildESEntity_${nextEntity}(id,source,options) {
   // now check to see if we have XML or json, then create a node clone from the root of the instance
   if (source instanceof Element || source instanceof ObjectNode) {
      let instancePath = '/*:envelope/*:instance';
      if(source instanceof Element) {
         //make sure we grab content root only
         instancePath += '/node()[not(. instance of processing-instruction() or . instance of comment())]';
      }
      source = new NodeBuilder().addNode(fn.head(source.xpath(instancePath))).toNode();
   }
   else{
      source = new NodeBuilder().addNode(fn.head(source)).toNode();
   }

   var ret = {
      '$type': '${nextEntity}',
      '$version': '${modelVersion}',
   };
`;
		ESXBuilder += `
declare function plugin:buildESEntity_${nextEntity}($id,$source,$options) {
   let $source :=
      if ($source/*:envelope and $source/node() instance of element()) then
         $source/*:envelope/*:instance/node()
      else if ($source/*:envelope) then
         $source/*:envelope/*:instance
      else if ($source/instance) then
         $source/instance
      else
         $source
   let $model := json:object()
   let $_ := (
      map:put($model, '$type', '${nextEntity}'),
      map:put($model, '$version', '${modelVersion}'),
   )
`;

		var attributes = orderAttributes(getAttributes(modelIRI, nextEntity));
		for (var i = 0; i < attributes.length; i++) {
			var attributeName = attributes[i].attributeName;
			var attributeType = attributes[i].attributeType;
			var attributeIsRequired = attributes[i].attributeIsRequired;
			var attributeIsArray = attributes[i].attributeIsArray;
			if (attributes[i].attributeIsCalculated == true) {
				ESBuilder += `
   xesgen.doCalculation_${nextEntity}_${attributeName}(id, ret, options) {
`;
				ESXBuilder += `
   let $_ := xesgen:doCalculation_${nextEntity}_${attributeName}($id, $model, $options) {
`;
			}
			else if (attributes[i].attributeIsExcluded == true) {}
			else if (attributes[i].attributeIsSimpleType == true) {
				ESBuilder += `
   ret["${attributeName}"] = "TODO"; // type ${attributeType}, reqd ${attributeIsRequired}, array ${attributeIsArray}
`;							
				ESXBuilder += `
   let $_ := map:put($model, "${attributeName}", "TODO") (: type ${attributeType}, reqd ${attributeIsRequired}, array ${attributeIsArray} :)
`;
			}							
			else {
				var entity2 = attributes[i].attributeType;
				if (entities.indexOf(entity2) < 0 && visitedEntities.indexOf(entity2) < 0) entities.push(entity2);
				if (attributeIsArray == true) {
					ESBuilder += `
   ret["${attributeName}"] = [];
   while (1 == 1) {
      ret["${attributeName}"].push(buildESEntity_${entity2}(id,source,options));
   }
`;
					ESXBuilder += `
   let $_ := map:put($model, "${attributeName}", json:array())
   for $x in 1 to 42 return json:array-push(map:get($model, "${attributeName}"), plugin:buildESEntity_${entity2}($id,$source,$options)))
`;
				}
				else {
					ESBuilder += `
   ret["${attributeName}"] = buildESEntity_${entity2}(id,source,options);
   }
`;
					ESXBuilder += `
   let $_ := map:put($model, "${attributeName}", plugin:buildESEntity_${entity2}($id,$source,$options))
`;
				}
			}
		}

		ESBuilder += `
   return ret;
}`;
		ESXBuilder += `
   return $model
};`;
}


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

		// Write the ES model. DHF quickstart likes to put just the plugin's entity here. We'll put the whole model.
		writeFile(folder, entity + ".entity.json", doc, false, model); 

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
			cutContent(modelIRI, info.version, entity, pluginFormat, dataFormat, mappingHints, builderFunctions, 
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