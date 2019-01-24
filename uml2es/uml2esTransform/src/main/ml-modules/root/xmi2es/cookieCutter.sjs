'use strict';

declareUpdate();

const sem = require("/MarkLogic/semantics.xqy");

const ALLOWABLE_PLUGINS = ["xqy", "sjs"];
const ALLOWABLE_FORMATS = ["xml", "json"];
const ALLOWABLE_SELECTS = ["all", "infer"];
const ALLOWABLE_CONTENTS = ["es", "dm"];

const DISCOVERY_LIMIT = 10;

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
	for (var ii = 0; ii < i; ii++) indent += "   ";
	return indent;	
}

function render(obj, indent) {
  var sindent = getIndent(indent);
  var r = ``;

  // array
  if (Array.isArray(obj)) {
    if (obj.length > 0) {
      for (var i = 0; i < obj.length; i++) {
        var val = obj[i];
        if (val !== Object(val)) {
          r  += `
${sindent}${val}`;
        }
        else {
            r  += render(val, indent);
        }
      }
    }  
  }
  else {
    // object
    for (var prop in obj) {
      if (obj.hasOwnProperty(prop)) {
        if (obj[prop] && obj[prop] != null) {
          var val = obj[prop];
          if (val !== Object(val)) {
          }
          else {
            val = render(val, indent+1);
          }
          r  += `
${sindent} ${prop} : ${val}`;
        }
      }
    }
  }
  return r;
}

function queryStaging(input, cmd, vars) {
	return xdmp.eval(cmd, vars, {"database": xdmp.database(input.stagingDB)});
}

function wordsFromString(searchTerm) {
	var words = [];
	cts.tokenize(searchTerm).toArray().forEach(function (word) {
		if ( fn.deepEqual(sc.name(sc.type(word)), fn.QName("http://marklogic.com/cts", "word"))) {
			if (words.indexOf(word) < 0) words.push(word.valueOf());
		}
	});
	return words;
}

function discoverModel(input) {
	// this is mainly building common data structures for later use
	// for example, if we want spell check on collections
	// or if we want a lexicon of element names across documents!
	// for now we keep it simple and use just uri and collection lexicons
}

// Check for documents similar to my class
function discoverClass(input, entityName) {

	if (!input.discoveryReport.entities) input.discoveryReport.entities = {};
	var report = {}
	input.discoveryReport.entities[entityName] = report;
	var entity = input.mappingObj.entities[entityName];	

	// 
	// Step 1 - Prepare data queries
	// 
	var dataChecks = [];
	if (entity.discoverySampleData == null) entity.discoverySampleData = [];
	entity.discoverySampleData =  Array.isArray(entity.discoverySampleData) ? entity.discoverySampleData : [entity.discoverySampleData];
	var sampleData = entity.discoverySampleData;
	var attribSampleData = entity.attributes;
	for (var a in entity.attributes) {
		var attrib = entity.attributes[a];
		if (attrib.discoverySampleData == null) attrib.discoverySampleData = [];
		attrib.discoverySampleData =  Array.isArray(attrib.discoverySampleData) ? attrib.discoverySampleData : [attrib.discoverySampleData];
		sampleData = sampleData.concat(attrib.discoverySampleData);
	}
	for (var i = 0; i < sampleData.length; i++) {
		if (sampleData[i] == null) continue;
		var sdi =sampleData[i].trim();
		if (sdi == "") continue;
		dataChecks.push(cts.wordQuery(sdi, ["case-insensitive"]));
		dataChecks.push(cts.wordQuery("* *" + sdi + "* *", ["case-insensitive"]));
	}
	var dataQuery = dataChecks.length > 0 ? cts.orQuery(dataChecks) : cts.trueQuery();
	var elemQuery = cts.elementQuery(xs.QName(entityName), cts.andQuery([]));
	xdmp.log("discoverClass *" + entityName + "* has dataQuery " + dataQuery, "info");
	xdmp.log("discoverClass *" + entityName + "* has elemQuery " + elemQuery, "info");

	var evars = {
		"dataQuery": dataQuery,
		"elemQuery": elemQuery,
		"className": entityName
	};

	// 
	// 2. collection discovery
	// 
	if (entity.discoveryCollections == null) entity.discoveryCollections = [];
	entity.discoveryCollections =  Array.isArray(entity.discoveryCollections) ? entity.discoveryCollections : [entity.discoveryCollections];
	var collCandidates = [entityName].concat(entity.discoveryCollections);
	var collNames = [];
	var collData = [];
	var collElem = [];
	for (var i = 0; i < collCandidates.length; i++) {
		evars.candidate = collCandidates[i];
		collNames = collNames.concat(queryStaging(input, 
			'cts.collectionMatch("*" + candidate + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"])',
			evars).toArray());
		collData = collData.concat(queryStaging(input, 
			'cts.collectionMatch("*" + candidate + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
			evars).toArray());
		collElem = collElem.concat(queryStaging(input, 
			'cts.collectionMatch("*" + candidate + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)', 
			evars).toArray());
	}
	var collReport = 
	report["Matching Collections"] = {
		"By Name": Array.from(new Set(collNames)), 
		"Containing Sample Data": Array.from(new Set(collData)), 
		"Containing Root Element": Array.from(new Set(collElem))
	};

	//
	// 2. directory/URI discovery
	//
	var dirClassD = [];
	var dirClassDData = [];
	var dirClassDElem = [];
	var dirPattern = [];
	var dirPatternData = [];
	var dirPatternElem = [];
	for (var i = 0; i < entity.discoverySampleData; i++) {
		evars.sampleDataWords = wordFromString(entity.discoverySampleData[i]).join("*");
		dirClassD = dirClassD.concat(queryStaging(input, 
			'cts.uriMatch("*" + className + "*" + sampleDataWords + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"])',
			evars).toArray());
		dirClassD = dirClassD.concat(queryStaging(input, 
			'cts.uriMatch("*" + sampleDataWords + "*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"])',
			evars).toArray());
		dirClassDData = dirClassDData.concat(queryStaging(input, 
			'cts.uriMatch("*" + className + "*" + sampleDataWords + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
			evars).toArray());
		dirClassDData = dirClassDData.concat(queryStaging(input, 
			'cts.uriMatch("*" + sampleDataWords + "*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
			evars).toArray());
		dirClassDElem = dirClassDElem.concat(queryStaging(input, 
			'cts.uriMatch("*" + className + "*" + sampleDataWords + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)',
			evars).toArray());
		dirClassDElem = dirClassDElem.concat(queryStaging(input, 
			'cts.uriMatch("*" + sampleDataWords + "*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)',
			evars).toArray());
	};
	if (entity.discoveryURIPatterns == null) entity.discoveryURIPatterns = [];
	entity.discoveryURIPatterns =  Array.isArray(entity.discoveryURIPatterns) ? entity.discoveryURIPatterns : [entity.discoveryURIPatterns];
	for (var i = 0; i < entity.discoveryURIPatterns; i++) {
		evars.pattern = entity.discoveryURIPatterns[i];
		dirPattern = dirPattern.concat(queryStaging(input, 
			'cts.uriMatch(pattern, ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"])',
			evars).toArray());
		dirPatternData = dirPatternData.concat(queryStaging(input, 
			'cts.uriMatch(pattern, ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
			evars).toArray());
		dirPatternElem = dirPatternElem.concat(queryStaging(input, 
			'cts.uriMatch(pattern, ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)',
			evars).toArray());
	};
	report["Matching URIs"] =  {
		"URI Based On Class Name": {
			"Just URI": Array.from(new Set(queryStaging(input, 
				'cts.uriMatch("*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"])', 
			evars))),
			"Containing Sample Data": Array.from(new Set(queryStaging(input, 
				'cts.uriMatch("*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)', 
			evars))),
			"Containing Root Element": Array.from(new Set(queryStaging(input, 
				'cts.uriMatch("*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)', 
			evars)))
		},
		"URI Based On Class Name Plus Sample Data": {
			"Just URI": Array.from(new Set(dirClassD)),
			"Containing Sample Data": Array.from(new Set(dirClassDData)),
			"Containing Root Element": Array.from(new Set(dirClassDElem))
		},
		"URI Sample Pattern": {
			"Just URI": Array.from(new Set(dirPattern)),
			"Containing Sample Data": Array.from(new Set(dirPatternData)),
			"Containing Root Element": Array.from(new Set(dirPatternElem))
		}
	};

	//
	// 3. look for any URIs that match the data query
	//
	report["Documents Containing Data"] = Array.from(new Set(queryStaging(input, 
		'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], dataQuery)', 
		evars)));
	report["Documents Containing Root Element"] = Array.from(new Set(queryStaging(input, 
		'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], elemQuery)', 
		evars)));

	xdmp.log("discoverClass *" + entityName + "* has report " + JSON.stringify(report), "info");

}

function discoverAttribute(input, entityName, attributeName) {
	
}

function checkIfRDFList(res) {
  return (res.length == 2 && res[0].p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#first" && res[1].p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest");  
}

function runXESQuery(subjectIRI) {
  var query = `select ?p ?o where {<${subjectIRI}> ?p ?o } order by ?p`;
  return sem.sparql(query).toArray();
}

function describeFacts(subjectIRI) {
  var res = runXESQuery(subjectIRI);
  var isList = checkIfRDFList(res);
  if (isList == true) {
    var list = [];
    while(true) {
      if (checkIfRDFList(res) == false) throw "no way";
      if (sem.isBlank(res[0].o)) {
        list.push(describeFacts(""+res[0].o));
      }
      else {
        list.push(""+res[0].o);
      } 

      if (res[1].o == "http://www.w3.org/1999/02/22-rdf-syntax-ns#nil") return list;
      subjectIRI = ""+ res[1].o;
    	res = runXESQuery(subjectIRI);
    }
    return list;
  }
  else {
  	var valueMap = {};
	  for (var r of res) {
		  var pred = ""+r.p;
		  var obj;

      // skip these
      if (pred.startsWith("http://marklogic.com/entity-services#")) continue;
      if (pred == "http://www.w3.org/1999/02/22-rdf-syntax-ns#type") continue;
      
  		// xes properties
	  	if (pred.startsWith("http://marklogic.com/xmi2es/xes#")) {
			  pred = fn.substringAfter(pred, "http://marklogic.com/xmi2es/xes#");
			  if (sem.isBlank(r.o)) obj = describeFacts(r.o);
			  else obj = "" + r.o;
			}
      else {
			  obj = "" + r.o;        
      }
      
      if (!valueMap[pred]) {
        valueMap[pred] = [];
      }
      valueMap[pred].push(obj);
		}
    return valueMap;
  }
}

function describeModel(input) {
	var modelIRI = input.modelIRI;
	var desc = `Model ${modelIRI} is stereotyped in the model as follows:`;
	desc += render(describeFacts(modelIRI), 0);
	if (input.mappingURI && input.mappingObj) {
		desc += `
The model also has the specified mapping facts:`;
		desc += render({
			"Mapping URI": input.mappingURI,
			"Overall Mapping Source": input.mappingObj.mapping.source,
			"Overall Mapping Notes": input.mappingObj.mapping.notes
		}, 0);

		if (input.discover == true) {
			input.discoveryReport = {};
			discoverModel(input);
		}
	}
	return desc;
}

function describeClass(input, entityName) {
	var desc = `Class ${entityName} is stereotyped in the model as follows:`;
	desc += render(describeFacts(input.modelIRI + "/" + entityName), 0);
	if (input.mappingURI && input.mappingObj) {
		var entity = input.mappingObj.entities[entityName];
		if (entity) {
			desc += `
The class also has the specified mapping facts:`;
			desc += render({
				"Mapping Source": entity.source,
				"Mapping Notes": entity.notes,
				"Mapping Collections For Discovery": entity.discoveryCollections,
				"Mapping URI Patterns For Discovery": entity.discoveryURIPatterns,
				"Mapping Sample Data For Discovery": entity.discoverySampleData
			}, 0);

			if (input.discover == true) {
				discoverClass(input, entityName);
xdmp.log("ATTEMPT TO RENDER :" + JSON.stringify(input.discoveryReport.entities[entityName]));
xdmp.log("GIVES :" + render(input.discoveryReport.entities[entityName], 0));
				desc +=  JSON.stringify(input.discoveryReport.entities[entityName], null, 2); /*render(input.discoveryReport.entities[entityName], 0); */
			}
		}
	}
	return desc;
}

function describeAttrib(input, entityName, attributeName) {
	var desc = 
`Attribute ${attributeName} is stereotyped in the model as follows:`;
	desc += render(describeFacts(input.modelIRI + "/" + entityName + "/" + attributeName), 1);
	if (input.mappingURI && input.mappingObj) {
		var entity = input.mappingObj.entities[entityName];
		if (entity) {
			// I want - the attribute itself plus any attribute that begins with attribute.x
			var attributes = [];
			for (var a in entity.attributes) {
				var sa = ""+a;
				if (sa == attributeName || fn.startsWith(sa, attributeName + ".")) attributes.push(sa);
			}
			attributes = attributes.sort();	

			if (attributes.length > 0) {
				desc += `
   The attribute also has the specified mapping facts:`;
   			for (var i = 0; i < attributes.length; i++) {
   				var attr = entity.attributes[attributes[i]];
				desc += render({
					"Model Path": attributes[i],
					"Source Mapping": attr.mapping,
					"Mapping Attribute Notes": attr.notes,
					"Mapping Attribute Sample Data For Discovery":  attr.discoverySampleData,
					"Mapping Attribute AKA For Discovery": attr.discoveryAKA}, 1);
				}
				if (input.discover == true && 1 == 3) {
					discoverAttribute(input, entityName, attributes[i]);
					desc += render(input.discoveryReport.entities[entityName].attributes[attributes[i]], 1);
				}
   			}
		}
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

function cutContent(input, template) {
	// DM for now is for JSON/SJS only. Reject the other combinations.
	var dmMode = input.contentMode == "dm";
	if (dmMode == true && input.pluginFormat != "sjs") throw "Declarative Mapper supports SJS only";
	if (dmMode == true && input.dataFormat != "json") throw "Declarative Mapper supports JSON only";

	// open mapping spec
	if (input.mappingSpec && input.mappingSpec.trim() != "") {
		xdmp.log("*" + input.mappingSpec+ "*");
		input.mappingURI = input.mappingSpec.trim();
		if (input.mappingURI.endsWith(".xlsx")) {
			var len = input.mappingURI.length;
			input.mappingURI = input.mappingURI.substring(0, len - "xlsx".length) + "json"
		}
		xdmp.log("*" + input.mappingURI + "*");
		input.mappingObj = cts.doc(input.mappingURI).toObject();
	}

	if (dmMode == true) return cutContentDM(input, template);
	else return cutContentES(input, template);
}

function cutContentDM(input, template) {

	// These are Javascript template subs. The name of each matches the ${X} sub in the template.
	// DON'T CHANGE THE NAME.
	var ModelDesc = "Hi";
	var EntityContentEnableDMIn = "";
	var EntityContentEnableDMOut = "";
	var EntityX = input.entityName;
	var ModelName = input.modelName;
	var ModelGenURI = input.modelIRI;
	var EntityXContentDMMapper = "/dm/mapper/" + input.entityName + "/" + input.flowName + ".json";
	var ContentBuilder = `
function buildContent_${EntityX}(id, source, options, ioptions) {
   mapper = getDMMapper(options);
   return mapper(source);
};
`;
	var dmTemplate = {};
	dmTemplate.config = {"format": "JSON"};
	dmTemplate.config.template = {};
	dmTemplate.config.template[input.entityName] = {};

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

function cutContentES(input, template) {

	var EntityContentEnableDMIn = "/*";
	var EntityContentEnableDMOut = "*/";
	var EntityXContentEnable = "";
	var EntityXContentXEnableIn = "";
	var EntityXContentXEnableOut = "";
	var EntityX = input.entityName;
	var ModelGenURI = input.modelIRI;
	var ModelName = input.modelName;
	var ContentBuilder = "";
	var ContentXBuilder = "";
	var EntityXContentDMMapper = "";
	var modelVersion = input.modelVersion;

	var ModelDesc = describeModel(input);

	// Introspect the model: what are the entities and attributes that make up the mapping
	var entities = [input.entityName];
	var visitedEntities = [];
	while (entities.length > 0) {
		var nextEntity = entities[0];
		entities = entities.slice(1);
		visitedEntities.push(nextEntity);

		// begin building the function buildEntity_* for the current entity.
		var ClassDesc = describeClass(input, nextEntity);
		ContentBuilder += `
/*
${ClassDesc}
*/
function buildContent_${nextEntity}(id,source,options,ioptions) {
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
      '$version': '${modelVersion}'
   };
`;
		ContentXBuilder += `
(:
${ClassDesc}
:)
declare function plugin:buildContent_${nextEntity}($id,$source,$options,$ioptions) {
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
      map:put($model, '$version', '${modelVersion}')
   )
`;
		//  now we need to map each attribute		
		var attributes = orderAttributes(getAttributes(input.modelIRI, nextEntity));
		for (var i = 0; i < attributes.length; i++) {
			var attributeName = attributes[i].attributeName;
			var attributeType = attributes[i].attributeType;
			var attributeIsRequired = attributes[i].attributeIsRequired;
			var attributeIsArray = attributes[i].attributeIsArray;

			var AttribDesc = describeAttrib(input, nextEntity, attributeName);
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
   xesgen.doCalculation_${nextEntity}_${attributeName}(id, ret, ioptions) 
`;
				ContentXBuilder += `
   let $_ := xesgen:doCalculation_${nextEntity}_${attributeName}($id, $model, $ioptions) 
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
      ret["${attributeName}"].push(buildContent_${entity2}(id,source,options,ioptions));
   }
`;
					ContentXBuilder += `
   let $_ := map:put($model, "${attributeName}", json:array())
   let $_ := for $x in 1 to 1 return json:array-push(map:get($model, "${attributeName}"), plugin:buildContent_${entity2}($id,$source,$options,$ioptions))
`;
				}
				else {
					ContentBuilder += `
   ret["${attributeName}"] = buildESEntity_${entity2}(id,source,options);
   }
`;
					ContentXBuilder += `
   let $_ := map:put($model, "${attributeName}", plugin:buildContent_${entity2}($id,$source,$options,$ioptions))
`;
				}
			}
		}

		ContentBuilder += `
   return ret;
}`;
		ContentXBuilder += `
   return $model
};`;
	}

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutTriples(input, template) {
	var hasTripleFunction = input.builderFunctions.indexOf("setTriples_" + input.entityName) >= 0;
	var EntityXTripleEnable = hasTripleFunction == true ? "" : "//";
	var EntityX = input.entityName;
	var EntityXTripleDisable = hasTripleFunction == false ? "" : "//";
	var EntityXTripleXEnableIn = hasTripleFunction == true ? "" : "(:";
	var ModelGenURI = input.modelIRI;
	var ModelName = input.modelName;
	var EntityXTripleXEnableOut = hasTripleFunction == true ? "" : ":)";
	var EntityXTripleXDisableIn = hasTripleFunction == false ? "" : "(:";
	var EntityXTripleXDisableOut = hasTripleFunction == false ? "" : ":)";

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutHeaders(input, template) {
	var hasHeaderFunction = input.builderFunctions.indexOf("setHeaders_" + input.entityName) >= 0;
	var EntityXHeaderEnable = hasHeaderFunction == true ? "" : "//";
	var EntityX = input.entityName;
	var EntityXHeaderDisable = hasHeaderFunction == false ? "" : "//";
	var EntityXHeaderXEnableIn = hasHeaderFunction == true ? "" : "(:";
	var ModelGenURI = input.modelIRI;
	var ModelName = input.modelName;
	var EntityXHeaderXEnableOut =hasHeaderFunction == true? "" : ":)";
	var EntityXHeaderXDisableIn = hasHeaderFunction == false ? "" : "(:";
	var EntityXHeaderXDisableOut = hasHeaderFunction == false ? "" : ":)";
	var EntityDataFormat = input.dataFormat;

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutWriter(input, template) {
	var hasWriterFunction = input.builderFunctions.indexOf("runWriter_" + input.entityName) >= 0;
	var EntityXWriterEnable = hasWriterFunction == true ? "" : "//";
	var EntityX = input.entityName;
	var EntityXWriterDisable = hasWriterFunction == false ? "" : "//";
	var EntityXWriterXEnableIn = hasWriterFunction == true ? "" : "(:";
	var ModelGenURI = input.modelIRI;
	var ModelName = input.modelName;
	var EntityXWriterXEnableOut = hasWriterFunction == true ? "" : ":)";
	var EntityXWriterXDisableIn = hasWriterFunction == false ? "" : "(:";
	var EntityXWriterXDisableOut = hasWriterFunction == false ? "" : ":)";

	var tpl = eval('`'+template+'`');
	return tpl;
}

function cutProperties(input, template) {
	var DataFormat = input.dataFormat;
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

function createHarmonizeFlow(modelName, entityName, dataFormat, pluginFormat, flowName, contentMode, mappingSpec, discover, stagingDB) {

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
	var input = {
		modelVersion: info.version,
		modelIRI: modelIRI,
		modelName: modelName,
		entityName: entityName,
		pluginFormat: pluginFormat,
		dataFormat: dataFormat,
		contentMode: contentMode,
		mappingSpec: mappingSpec,
		discover: (discover && discover == true || discover == "true"),
		stagingDB: stagingDB,
		builderFunctions: builderFunctions,
		moduleName: flowName, 
		harmonizationMode: true
	};

	writeFile(harmonizationFolder, flowName + ".properties", 
		cutProperties(input, useTemplate(cookieFolder + "XFlow_" + pluginFormat + ".properties")), 
		true, modelName, "harmonization");
	writeFile(harmonizationFolder, "collector." + pluginFormat, 
		useTemplate(cookieFolder + "collector.t" + pluginFormat), true, modelName, "harmonization");
	writeFile(harmonizationFolder, "main." + pluginFormat, 
		useTemplate(cookieFolder + "main.t" + pluginFormat), true, modelName, "harmonization");
	writeFile(harmonizationFolder, "content." + pluginFormat, 
		cutContent(input, useTemplate(cookieFolder + "content.t" + pluginFormat)), true, modelName, "harmonization");
	writeFile(harmonizationFolder, "triples." + pluginFormat, 
		cutTriples(input, useTemplate(cookieFolder + "triples.t" + pluginFormat)), true, modelName), "harmonization";
	writeFile(harmonizationFolder, "headers." + pluginFormat, 
		cutHeaders(input, useTemplate(cookieFolder + "headers.t" + pluginFormat)), true, modelName, "harmonization");
	writeFile(harmonizationFolder, "writer." + pluginFormat, 
		cutWriter(input, useTemplate(cookieFolder + "writer.t" + pluginFormat)), true, modelName, "harmonization");
}

function createConversionModule(modelName, entityName, dataFormat, pluginFormat, moduleName, contentMode, mappingSpec, discover, stagingDB) {

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

	var input = {
		modelVersion: info.version,
		modelIRI: modelIRI,
		modelName: modelName,
		entityName: entityName,
		pluginFormat: pluginFormat,
		dataFormat: dataFormat,
		contentMode: contentMode,
		mappingSpec: mappingSpec,
		discover: (discover && discover == true || discover == "true"),
		stagingDB: stagingDB,
		builderFunctions: builderFunctions,
		moduleName: moduleName, 
		harmonizationMode: false
	};
	// now let's cookie-cut the module; it's the same approach as content module of harmonization
	writeFile(moduleFolder, moduleName + "." + pluginFormat, 
		cutContent(inputuseTemplate("/xmi2es/conversionTemplate/conversion.t" + pluginFormat)), 
		true, modelName, "conversion");
}

module.exports = {
  createEntities: createEntities,
  createHarmonizeFlow: createHarmonizeFlow,
  createConversionModule: createConversionModule
};
