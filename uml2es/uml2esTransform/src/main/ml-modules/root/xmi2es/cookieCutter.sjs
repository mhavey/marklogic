'use strict';

declareUpdate();

const sem = require("/MarkLogic/semantics.xqy");

const ALLOWABLE_PLUGINS = ["xqy", "sjs"];
const ALLOWABLE_FORMATS = ["xml", "json"];
const ALLOWABLE_SELECTS = ["all", "infer"];
const ALLOWABLE_CONTENTS = ["es", "dm"];

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

function describeClass() {

};

function describeAttrib() {

}

function writeFile(folder, name, content, asText, model, coll, stagingDB) {
	var contentNode =content;
	if (asText == true) {
		var textNode = new NodeBuilder();
		textNode.addText(content);
		contentNode = textNode.toNode();
	}
	var uri = folder + name;
	var collections = [coll, "cookieCutter", "http://marklogic.com/entity-services/models"];
	if (model && model != "") collections.push(model);
	if (stagingDB && stagingDB != "") {
		xdmp.eval('declareUpdate(); xdmp.documentInsert(uri,contentNode, {"collections": collections})',
			{"uri": uri, "contentNode": contentNode, "collections": collections},
			{"database": xdmp.database(stagingDB)});
	}
	else {
		xdmp.documentInsert(uri, contentNode, {"collections": collections}); // TODO - perms		
	}
}

function cutContent(modelIRI, modelVersion, entity, flowName, pluginFormat, dataFormat, contentMode, mappingHints, builderFunctions, template) {
	// DM for now is for JSON/SJS only. Reject the other combinations.
	var dmMode = contentMode == "dm";
	if (dmMode == true && pluginFormat != "sjs") throw "Declarative Mapper supports SJS only";
	if (dmMode == true && dataFormat != "json") throw "Declarative Mapper supports JSON only";

	if (dmMode == true) return cutContentDM(modelIRI, modelVersion, entity, flowName, pluginFormat, dataFormat, mappingHints, builderFunctions, template);
	else return cutContentES(modelIRI, modelVersion, entity, flowName, pluginFormat, dataFormat, mappingHints, builderFunctions, template);
}

function cutContentDM(modelIRI, modelVersion, entity, flowName, pluginFormat, dataFormat, mappingHints, builderFunctions, template) {

	// These are Javascript template subs. The name of each matches the ${X} sub in the template.
	// DON'T CHANGE THE NAME.
	var EntityContentEnableDMIn = "";
	var EntityContentEnableDMOut = "";
	var EntityX = entity;
	var EntityXGenURI = modelIRI;
	var EntityXContentDMMapper = "/dm/mapper/" + entity + "/" + flowName + ".json";
	var ContentBuilder = `
function buildContent_${EntityX}(id, source, options, ioptions) {
   mapper = getDMMapper(options);
   return mapper(source);
};
`;
	var dmTemplate = {};
	dmTemplate.config = {"format": "JSON"};
	dmTemplate.config.template = {};
	dmTemplate.config.template[entity] = {};

	// walk the entity and map its attributes; 
	// pay attention to calculated attributes; they need to be vars
	// walk into sub-documents; be aware of loops
	// watch for circular
	// look at cutContentES for how to traverse; there it's a bit different but it helps

	// also, eventually use the mapping Hints

	// we need to save the mapper; 
	// TODO - build.gradle will need to export it back to the gradle
	// TODO - need process to upload it as part of build
	xdmp.documentInsert(EntityXContentDMMapper, dmTemplate);

	// we return module
	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutContentES(modelIRI, modelVersion, entity, flowName, pluginFormat, dataFormat, mappingHints, builderFunctions, template) {

	var EntityContentEnableDMIn = "/*";
	var EntityContentEnableDMOut = "*/";
	var EntityXContentEnable = "";
	var EntityXContentXEnableIn = "";
	var EntityXContentXEnableOut = "";
	var EntityX = entity;
	var EntityXGenURI = modelIRI;
	var ContentBuilder = "";
	var ContentXBuilder = "";
	var EntityXContentDMMapper = "";

	// Introspect the model: what are the entities and attributes that make up the mapping
	var entities = [entity];
	var visitedEntities = [];
	while (entities.length > 0) {
		var nextEntity = entities[0];
		entities = entities.slice(1);
		visitedEntities.push(entity);

		// begin building the function buildEntity_* for the current entity.
		var ClassDesc = describeClass(modelIRI, nextEntity);
		ContentBuilder += `
/*
${ClassDesc}
*/
function buildEntity_${nextEntity}(id,source,options,ioptions) {
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
		ContentXBuilder += `
(:
${ClassDesc}
:)
declare function plugin:buildEntity_${nextEntity}($id,$source,$options,$ioptions) {
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
		//  now we need to map each attribute		
		var attributes = orderAttributes(getAttributes(modelIRI, nextEntity));
		for (var i = 0; i < attributes.length; i++) {
			var attributeName = attributes[i].attributeName;
			var attributeType = attributes[i].attributeType;
			var attributeIsRequired = attributes[i].attributeIsRequired;
			var attributeIsArray = attributes[i].attributeIsArray;

			var AttribDesc = describeAttrib(modelIRI, nextEntity, attributes[i]);
			ContentBuilder += `
   /*
   ${SJSAttribDesc}
   */`;
			ContentXBuilder += `
   (:
   ${SJSAttribDesc}
   :)`;

			if (attributes[i].attributeIsCalculated == true) {

				ContentBuilder += `
   xesgen.doCalculation_${nextEntity}_${attributeName}(id, ret, ioptions) {
`;
				ContentXBuilder += `
   let $_ := xesgen:doCalculation_${nextEntity}_${attributeName}($id, $model, $ioptions) {
`;
			}
			else if (attributes[i].attributeIsExcluded == true) {}
			else if (attributes[i].attributeIsSimpleType == true) {
				ContentBuilder += `
   ret["${attributeName}"] = "TODO"; // type: ${attributeType}, req'd: ${attributeIsRequired}, array: ${attributeIsArray}
`;							
				ContentXBuilder += `
   let $_ := map:put($model, "${attributeName}", "TODO") (: type: ${attributeType}, req'd: ${attributeIsRequired}, array: ${attributeIsArray} :)
`;
			}							
			else {
				var entity2 = attributes[i].attributeType;
				if (entities.indexOf(entity2) < 0 && visitedEntities.indexOf(entity2) < 0) entities.push(entity2);
				if (attributeIsArray == true) {
					ContentBuilder += `
   ret["${attributeName}"] = [];
   while (1 == 1) {
      ret["${attributeName}"].push(buildEntity_${entity2}(id,source,options,ioptions));
   }
`;
					ContentXBuilder += `
   let $_ := map:put($model, "${attributeName}", json:array())
   for $x in 1 to 1 return json:array-push(map:get($model, "${attributeName}"), plugin:buildEntity_${entity2}($id,$source,$options,$ioptions)))
`;
				}
				else {
					ContentBuilder += `
   ret["${attributeName}"] = buildESEntity_${entity2}(id,source,options);
   }
`;
					ContentXBuilder += `
   let $_ := map:put($model, "${attributeName}", plugin:buildEntity_${entity2}($id,$source,$options,$ioptions))
`;
				}
			}
		}

		ContentBuilder += `
   return ret;
}`;
		ContentBuilder += `
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

function cutProperties(dataFormat, template) {
	var DataFormat = dataFormat;
	var tpl = eval('`'+template+'`');
	return tpl;	
}

function validateRequired(p, desc) {
	if (p == null) throw "Required parameter " + desc;
	p = p.trim();
	if (p == "") throw "Required parameter " + desc;
	return p;
}

function createEntities(modelName, entitySelect, entityNames, stagingDB) {

	// validate
	if (entitySelect != null && ALLOWABLE_SELECTS.indexOf(entitySelect) < 0) throw "Illegal entity select *" + entitySelect + "*";
	modelName = validateRequired(modelName, "modelName");

	// find the model
	var doc = cts.doc("/xmi2es/es/" + modelName + ".json");
	if (!doc || doc == null) throw "Model not found *" + modelName + "*";
	var odoc = doc.toObject();
	var info = odoc.info;
	var modelIRI = info.baseUri + "/" +  info.title + "-" + info.version;
	var modelIRIHash = info.baseUri + "#" +  info.title + "-" + info.version; // cuz ES uses model IRI in a weird way

	// which entities?
	var allEntities = useAllEntities(modelIRIHash);
	var entities;
	if (entityNames && entityNames != null) entities = entityNames.split(",").map(function (e) {
		e = e.trim();
		if (allEntities.indexOf(e) < 0) throw "Unknown entity *" + e + "*";
		return e;
	});
	else if (entitySelect == "infer") entities = inferPlugins(modelIRIHash);
	else if (entitySelect == "all") entities = allEntities;
	else throw "Should not have gotten here *" + entitySelect + "*";
	if (entities.length == 0) throw "No entities specified or inferred";

	// for DHF's benefit, do the big split
	// this means each entity in the model gets to be its own ES model
	// and the title of that model is the name of the entity
	// This is only for DHF's benefit; our cookie cutter only needs to see the REAL model.
	for (var i = 0; i < allEntities.length; i++) {
		var defName = allEntities[i];
		var loneDef =  {
			info: JSON.parse(JSON.stringify(odoc.info)),
			definitions: {}
		};
		loneDef.info.title = defName;
		loneDef.info.baseUri = "http://nooneieverheardof.com/es/"; // it needs its own URI to avoid triple explosion.
		loneDef.definitions[defName] = odoc.definitions[defName];

		writeFile("/entities/", defName + ".entity.json", loneDef, false, "", "loneDef", stagingDB); 

		if (entities.indexOf(defName) >= 0) {
			var folder = "/cookieCutter/" + modelName + "/plugins/entities/" + defName + "/";
			writeFile(folder, defName + ".entity.json", loneDef, false, modelName, "plugins"); 
		}
	}
}

function createHarmonizeFlow(modelName, entityName, dataFormat, pluginFormat, flowName, contentMode, mappingSpec) {

	// validate
	if (pluginFormat == null || ALLOWABLE_PLUGINS.indexOf(pluginFormat) < 0) throw "Illegal plugin format *" + pluginFormat + "*";
	if (dataFormat == null || ALLOWABLE_FORMATS.indexOf(dataFormat) < 0) throw "Illegal data format *" + dataFormat + "*";
	if (contentMode == null || ALLOWABLE_CONTENTS.indexOf(contentMode) < 0) throw "Illegal content mode *" + contentMode + "*";
	modelName = validateRequired(modelName, "modelName");
	entityName = validateRequired(entityName, "entityName");
	flowName = validateRequired(flowName, "flowName");

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
	var doc = cts.doc("/xmi2es/es/" + modelName + ".json");
	if (!doc || doc == null) throw "Model not found *" + modelName + "*";
	var odoc = doc.toObject();
	var info = odoc.info;
	var modelIRI = info.baseUri + "/" +  info.title + "-" + info.version;
	var modelIRIHash = info.baseUri + "#" +  info.title + "-" + info.version; // cuz ES uses model IRI in a weird way

	// determine the builder block functions implemented
	var builderFunctions = getBuilderFunctions(modelIRI);

	// create plugins (with harmonization) for each
	var harmonizationFolder = "/cookieCutter/" + modelName + "/plugins/entities/" + entityName + "/harmonize/" + flowName + "/";
	var cookieFolder = templateFolder + pluginFormat + "/";

	// now let's cookie-cut the harmonization flow
	writeFile(harmonizationFolder, flowName + ".properties", 
		cutProperties(dataFormat,
			useTemplate(cookieFolder + "XFlow_" + pluginFormat + ".properties")), true, modelName, "harmonization");
	writeFile(harmonizationFolder, "collector." + pluginFormat, 
		useTemplate(cookieFolder + "collector.t" + pluginFormat), true, modelName, "harmonization");

	writeFile(harmonizationFolder, "main." + pluginFormat, 
		useTemplate(cookieFolder + "main.t" + pluginFormat), true, modelName, "harmonization");

	writeFile(harmonizationFolder, "content." + pluginFormat, 
		cutContent(modelIRI, info.version, entityName, flowName, pluginFormat, dataFormat, contentMode, mappingHints, builderFunctions, 
			useTemplate(cookieFolder + "content.t" + pluginFormat)), true, modelName, "harmonization");

	writeFile(harmonizationFolder, "triples." + pluginFormat, 
		cutTriples(modelIRI, entityName, pluginFormat, dataFormat, mappingHints, builderFunctions, 
			useTemplate(cookieFolder + "triples.t" + pluginFormat)), true, modelName), "harmonization";
	writeFile(harmonizationFolder, "headers." + pluginFormat, 
		cutHeaders(modelIRI, entityName, pluginFormat, dataFormat, mappingHints, builderFunctions, 
			useTemplate(cookieFolder + "headers.t" + pluginFormat)), true, modelName, "harmonization");
	writeFile(harmonizationFolder, "writer." + pluginFormat, 
		cutWriter(modelIRI, entityName, pluginFormat, dataFormat, mappingHints, builderFunctions, 
			useTemplate(cookieFolder + "writer.t" + pluginFormat)), true, modelName, "harmonization");
}

function createConversionModule(modelName, entityName, dataFormat, pluginFormat, moduleName, contentMode, mappingSpec) {

	// validate
	if (pluginFormat == null || ALLOWABLE_PLUGINS.indexOf(pluginFormat) < 0) throw "Illegal plugin format *" + pluginFormat + "*";
	if (dataFormat == null || ALLOWABLE_FORMATS.indexOf(dataFormat) < 0) throw "Illegal data format *" + dataFormat + "*";
	if (contentMode == null || ALLOWABLE_CONTENTS.indexOf(contentMode) < 0) throw "Illegal content mode *" + contentMode + "*";
	modelName = validateRequired(modelName, "modelName");
	entityName = validateRequired(entityName, "entityName");
	moduleName = validateRequired(flowName, "moduleName");

	// find the model
	var doc = cts.doc("/xmi2es/es/" + modelName + ".json");
	if (!doc || doc == null) throw "Model not found *" + modelName + "*";
	var odoc = doc.toObject();
	var info = odoc.info;
	var modelIRI = info.baseUri + "/" +  info.title + "-" + info.version;
	var modelIRIHash = info.baseUri + "#" +  info.title + "-" + info.version; // cuz ES uses model IRI in a weird way

	// determine the builder block functions implemented
	var builderFunctions = getBuilderFunctions(modelIRI);

	// create plugins (with harmonization) for each
	var moduleFolder = "/cookieCutter/" + modelName + "/src/main/ml-modules/" + entityName + "/";

	// now let's cookie-cut the module
	writeFile(moduleFolder, moduleName + "." + pluginFormat, 
		cutConversion(modelIRI, info.version, entityName, moduleName, pluginFormat, dataFormat, contentMode, mappingSpec, builderFunctions, 
			useTemplate("/xmi2es/conversionTemplate/conversion.t" + pluginFormat)), true, modelName, "conversion");
}

module.exports = {
  createEntities: createEntities,
  createHarmonizeFlow: createHarmonizeFlow,
  createConversionModule: createConversionModule
};
