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

function getIndent(i) {
	var indent = "";
	for (var i = 0; i <= indent; i++) indent += "   ";
	return indent;	
}

function mappingValue(v, indent) {
	if (!v || v == null) return "";
	if (Array.isArray()) {
		if (v.length == 0) return "";
		var sindent = getIndent(indent + 1);
		var vi = v[0];
		var desc = `${vi}`;
		for (var i = 1; i < v.length; i++) {
			vi = v[i];
			desc += `
${sindent}${vi}`;
		}
		return desc;
	}
	else return v;
}

function describeClassMapping(entityName, mappingURI, mappingObj, indent) {
	var sindent = getIndent(indent);
	var overallMappingSource = mappingValue(mappingObj.mapping.source, indent);
	var overallMappingNotes = mappingValue(mappingObj.mapping.notes, indent);
	var desc = `
${sindent}- Mapping URI: ${mappingURI}
${sindent}- Overall Mapping Source: ${overallMappingSource}
${sindent}- Overall Mapping Notes: ${overallMappingNotes}`;

	var entity = mappingObj.entities[entityName];
	if (entity) {
		var mappingSource = mappingValue(entity.source, indent);
		var mappingNotes = mappingValue(entity.notes, indent);
		var mappingCollections = mappingValue(entity.discoveryCollections, indent);
		var mappingURIPatterns = mappingValue(entity.discoveryURIPatterns, indent);
		var mappingSampleData = mappingValue(entity.discoverySampleData, indent);
		// TODO - some basic class-level discovery results
		desc += `
${sindent}- Mapping Source: ${mappingSource}
${sindent}- Mapping Notes: ${mappingNotes}
${sindent}- Mapping Collections For Discovery: ${mappingCollections}
${sindent}- Mapping URI Patterns For Discovery: ${mappingURIPatterns}
${sindent}- Mapping Sample Data For Discovery: ${mappingSampleData}`;
	}
	return desc;
}

function describeAttribMapping(entityName, attributeName, mappingURI, mappingObj, indent) {
	var entity = mappingObj.entities[entityName];
	if (!entity) return "";

	// I want - the attribute itself plus any attribute that begins with attribute.x
	var attributes = [];
xdmp.log("ATT IS *" + attributeName + "*");
	for (var a in entity.attributes) {
		var sa = ""+a;
xdmp.log("CONSIDER *" + sa + "*");
		if (sa == attributeName || fn.startsWith(sa, attributeName + ".")) attributes.push(sa);
	}
	attributes = attributes.sort();
xdmp.log("ATTRIBS *" + JSON.stringify(attributes) + "*");
	var desc = ``;
	for (var i = 0; i < attributes.length; i++) {
		var thisAttribName = attributes[i];
		var attribute = entity.attributes[thisAttribName];

		var sindent = getIndent(indent);
		var mapping = mappingValue(attribute.mapping, indent);
		var mappingNotes = mappingValue(attribute.notes, indent);
		var mappingDiscovery = mappingValue(attribute.discoverySampleData, indent);
		var mappingAKA = mappingValue(attribute.discoveryAKA, indent);
		desc += `
${sindent}- Attribute: ${thisAttribName}
${sindent}- Attribute Mapping: ${mapping}
${sindent}- Mapping Attribute Notes: ${mappingNotes}
${sindent}- Mapping Attribute Sample Data For Discovery: ${mappingDiscovery}
${sindent}- Mapping Attribute AKA For Discovery: ${mappingAKA}`;
	}

	return desc;
}

function predWalk(o, indent) {
	var res = sem.sparql(`select ?p ?o where {<${o}> ?p ?o } order by ?p`);
	var comment = "";
	var sindent = getIndent(indent);
	for (var r of res) {
		var pred = ""+r.p;
		var obj = ""+r.o;

		// list stuff
		if (obj == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") continue;
		else if (pred == "http://www.w3.org/1999/02/22-rdf-syntax-ns#first") pred = "";
		else if (pred == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest") {
			pred = "";
			obj = predWalk(r.o, indent);
		}

		// non-list
		else if (pred.startsWith("http://marklogic.com/xmi2es/xes#")) {
			pred = fn.substringAfter(pred, "http://marklogic.com/xmi2es/xes#");
			if (sem.isBlank(r.o)) obj = predWalk(r.o, indent+1);
		}
		comment += `
${sindent}- ${pred} ${obj}`;
	}
	return comment;	
}

function describeFacts(subjectIRI, indent) {
	var sindent =getIndent(indent);
	var res = sem.sparql(`select ?p ?o where {<${subjectIRI}> ?p ?o } order by ?p`);
	var comment = "";
	for (var r of res) {
		var pred = ""+r.p;
		var obj = ""+r.o;

		if (pred.startsWith("http://marklogic.com/entity-services#")) continue;
		if (pred == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") continue;
		if (pred.startsWith("http://marklogic.com/xmi2es/xes#")) {
			pred = fn.substringAfter(pred, "http://marklogic.com/xmi2es/xes#");
			if (sem.isBlank(r.o)) obj = predWalk(r.o, indent + 1);
		}
		comment += 
`
${sindent}- ${pred} ${obj}`;
	}
	if (comment.trim() == "") comment = `
${sindent}None`;	
	return comment;
}

function describeClass(modelIRI, entityName, mappingURI, mappingObj) {
	var sindent = getIndent(0);
	var desc = `
${sindent}Class ${entityName} has the following facts:`;
	desc += describeFacts(modelIRI + "/" + entityName, 0);
	if (mappingURI && mappingObj) {
		desc += describeClassMapping(entityName, mappingURI, mappingObj, 0);		
	}

	desc += 
`
${sindent}Class is part of model ${modelIRI}, which itself has the following facts:`;
	desc += describeFacts(modelIRI, 0);
	return desc;
}

function describeAttrib(modelIRI, entityName, attribute, mappingURI, mappingObj) {
	var sindent = getIndent(1);
	var attributeName = attribute.attributeName;
	var desc = 
`
${sindent}Attribute ${attributeName} has the following facts:`;
	desc += describeFacts(modelIRI + "/" + entityName + "/" + attributeName, 1);
	if (mappingURI && mappingObj) {
		desc += describeAttribMapping(entityName, attributeName, mappingURI, mappingObj, 1);		
	}
	return desc;
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

function cutContent(modelIRI, modelVersion, modelName, entityName, flowName, pluginFormat, dataFormat, contentMode, mappingSpec, builderFunctions, template) {
	// DM for now is for JSON/SJS only. Reject the other combinations.
	var dmMode = contentMode == "dm";
	if (dmMode == true && pluginFormat != "sjs") throw "Declarative Mapper supports SJS only";
	if (dmMode == true && dataFormat != "json") throw "Declarative Mapper supports JSON only";

	// open mapping spec
	var mappingObj;
	var mappingURI;
	if (mappingSpec && mappingSpec.trim() != "") {
		mappingURI = mappingSpec.trim();
		if (mappingURI.endsWith(".xlsx")) {
			var len = mappingURI.length;
			mappingURI = mappingURI.substring(1, len - "xlsx".length) + "json"
		}
		mappingObj = cts.doc(mappingURI).toObject();
	}

	if (dmMode == true) return cutContentDM(modelIRI, modelVersion, modelName, entityName, flowName, pluginFormat, dataFormat, mappingURI, mappingObj, builderFunctions, template);
	else return cutContentES(modelIRI, modelVersion, modelName, entityName, flowName, pluginFormat, dataFormat, mappingURI, mappingObj, builderFunctions, template);
}

function cutContentDM(modelIRI, modelVersion, modelName, entityName, flowName, pluginFormat, dataFormat, mappingURI, mappingObj, builderFunctions, template) {

	// These are Javascript template subs. The name of each matches the ${X} sub in the template.
	// DON'T CHANGE THE NAME.
	var EntityContentEnableDMIn = "";
	var EntityContentEnableDMOut = "";
	var EntityX = entityName;
	var ModelName = modelName;
	var ModelGenURI = modelIRI;
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

function cutContentES(modelIRI, modelVersion, modelName, entityName, flowName, pluginFormat, dataFormat, mappingURI, mappingObj, builderFunctions, template) {

	var EntityContentEnableDMIn = "/*";
	var EntityContentEnableDMOut = "*/";
	var EntityXContentEnable = "";
	var EntityXContentXEnableIn = "";
	var EntityXContentXEnableOut = "";
	var EntityX = entityName;
	var ModelGenURI = modelIRI;
	var ModelName = modelName;
	var ContentBuilder = "";
	var ContentXBuilder = "";
	var EntityXContentDMMapper = "";

	// Introspect the model: what are the entities and attributes that make up the mapping
	var entities = [entityName];
	var visitedEntities = [];
	while (entities.length > 0) {
		var nextEntity = entities[0];
		entities = entities.slice(1);
		visitedEntities.push(nextEntity);

		// begin building the function buildEntity_* for the current entity.
		var ClassDesc = describeClass(modelIRI, nextEntity, mappingURI, mappingObj);
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

			var AttribDesc = describeAttrib(modelIRI, nextEntity, attributes[i], mappingURI, mappingObj);
			ContentBuilder += `
   /*
   ${AttribDesc}
   */`;
			ContentXBuilder += `
   (:
   ${AttribDesc}
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

function cutTriples(modelIRI, modelName, entityName, pluginFormat, dataFormat, builderFunctions, template) {
	var hasTripleFunction = builderFunctions.indexOf("setTriples_" + entityName) >= 0;
	var EntityXTripleEnable = hasTripleFunction == true ? "" : "//";
	var EntityX = entityName;
	var EntityXTripleDisable = hasTripleFunction == false ? "" : "//";
	var EntityXTripleXEnableIn = hasTripleFunction == true ? "" : "(:";
	var ModelGenURI = modelIRI;
	var ModelName = modelName;
	var EntityXTripleXEnableOut = hasTripleFunction == true ? "" : ":)";
	var EntityXTripleXDisableIn = hasTripleFunction == false ? "" : "(:";
	var EntityXTripleXDisableOut = hasTripleFunction == false ? "" : ":)";

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutHeaders(modelIRI, modelName, entityName, pluginFormat, dataFormat, builderFunctions, template) {
	var hasHeaderFunction = builderFunctions.indexOf("setHeaders_" + entityName) >= 0;
	var EntityXHeaderEnable = hasHeaderFunction == true ? "" : "//";
	var EntityX = entityName;
	var EntityXHeaderDisable = hasHeaderFunction == false ? "" : "//";
	var EntityXHeaderXEnableIn = hasHeaderFunction == true ? "" : "(:";
	var ModelGenURI = modelIRI;
	var ModelName = modelName;
	var EntityXHeaderXEnableOut =hasHeaderFunction == true? "" : ":)";
	var EntityXHeaderXDisableIn = hasHeaderFunction == false ? "" : "(:";
	var EntityXHeaderXDisableOut = hasHeaderFunction == false ? "" : ":)";
	var EntityDataFormat = dataFormat;

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutWriter(modelIRI, modelName, entityName, pluginFormat, dataFormat, builderFunctions, template) {
	var hasWriterFunction = builderFunctions.indexOf("runWriter_" + entityName) >= 0;
	var EntityXWriterEnable = hasWriterFunction == true ? "" : "//";
	var EntityX = entityName;
	var EntityXWriterDisable = hasWriterFunction == false ? "" : "//";
	var EntityXWriterXEnableIn = hasWriterFunction == true ? "" : "(:";
	var ModelGenURI = modelIRI;
	var ModelName = modelName;
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
		cutContent(modelIRI, info.version, modelName, entityName, flowName, pluginFormat, dataFormat, contentMode, mappingSpec, builderFunctions, 
			useTemplate(cookieFolder + "content.t" + pluginFormat)), true, modelName, "harmonization");

	writeFile(harmonizationFolder, "triples." + pluginFormat, 
		cutTriples(modelIRI, modelName, entityName, pluginFormat, dataFormat, builderFunctions, 
			useTemplate(cookieFolder + "triples.t" + pluginFormat)), true, modelName), "harmonization";
	writeFile(harmonizationFolder, "headers." + pluginFormat, 
		cutHeaders(modelIRI, modelName, entityName, pluginFormat, dataFormat, builderFunctions, 
			useTemplate(cookieFolder + "headers.t" + pluginFormat)), true, modelName, "harmonization");
	writeFile(harmonizationFolder, "writer." + pluginFormat, 
		cutWriter(modelIRI, modelName, entityName, pluginFormat, dataFormat, builderFunctions, 
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

	// now let's cookie-cut the module; it's the same approach as content module of harmonization
	writeFile(moduleFolder, moduleName + "." + pluginFormat, 
		cutContent(modelIRI, info.version, modelName, entityName, moduleName, pluginFormat, dataFormat, contentMode, mappingSpec, builderFunctions, 
			useTemplate("/xmi2es/conversionTemplate/conversion.t" + pluginFormat)), true, modelName, "conversion");
}

module.exports = {
  createEntities: createEntities,
  createHarmonizeFlow: createHarmonizeFlow,
  createConversionModule: createConversionModule
};
