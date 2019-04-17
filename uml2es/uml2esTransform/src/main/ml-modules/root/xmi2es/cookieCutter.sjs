'use strict';

declareUpdate();

const sem = require("/MarkLogic/semantics.xqy");
const discovery = require("/xmi2es/discovery.sjs");

const ALLOWABLE_PLUGINS = ["xqy", "sjs"];
const ALLOWABLE_FORMATS = ["xml", "json"];
const ALLOWABLE_SELECTS = ["all", "infer"];
const ALLOWABLE_CONTENTS = ["es", "dm"];

function getAttributes(modelIRI, entityName) {

	xdmp.log("GETTING ATTRIBUTES *" + modelIRI + "*" + entityName + "*");
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

function render(obj) {
	// TODO - future; prune
	var jsons = JSON.stringify(obj, null, 2).replace(/[\[\]\{\}\"]+/g,"").split("\n");
	var nonblank = [];
	for (var i = 0; i < jsons.length; i++) {
		if (jsons[i].trim() == "") continue;
		nonblank.push(jsons[i]);
	}
	return nonblank.join("\n");
}

function checkIfRDFList(res) {
  return (res.length == 2 && res[0].p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#first" && res[1].p == "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest");  
}

function runXESQuery(subjectIRI) {
  var query = `select ?p ?o where {<${subjectIRI}> ?p ?o } order by ?p`;
  return sem.sparql(query).toArray();
}

function buildOrderedMatchList(lists) {
	var ret = [];
	// combine the lists
	for (var i = 0; i < lists.length; i++) {
		for (var j = 0; j < lists[i].length; j++) {
			if (ret.length == 7) break;
			if (ret.indexOf(lists[i][j]) >= 0) break;
			ret.push(lists[i][j]);
		}
	}
	return ret;
}

function showViewEntityDiscovery(input, entityName) {

	var res = fn.subsequence(sem.sparql(`
SELECT ?doc (COUNT(?placeholder) AS ?numMatches)
WHERE{
  ?doc <http://marklogic.com/xmi2es/discovery/attributeMatchesModel> ?placeholder 
}
GROUP BY ?doc
ORDER BY DESC(?numMatches)
`,
		{}, [], sem.store(null, cts.documentQuery(input.reportURI))), 1, 4);
	var ret = {
		"Documents whose structure resembles the model": res.toArray(),
		"Possible collections": buildOrderedMatchList([
			input.report.entities[entityName].collectionDiscovery.withData,
			input.report.entities[entityName].collectionDiscovery.byName]),
		"Possible URIs": buildOrderedMatchList([
			input.report.entities[entityName].uriDiscovery.className.withData,
			input.report.entities[entityName].uriDiscovery.withData,
			input.report.entities[entityName].allURIs
			])
	};
	return ret;
}

function showViewAttributeDiscovery(input, entityName, attributeName) {
	var splits = attributeName.split(".");
	if (splits.length > 1) attributeName = splits[0];
	var ret = {
		"Similar to physical attribute in candidate document": 
			fn.subsequence(sem.sparql(`
select ?document ?physicalName where {
	?placeholder <http://marklogic.com/xmi2es/discovery/match/attribute> "${attributeName}" .
	?placeholder <http://marklogic.com/xmi2es/discovery/match/physical> ?physicalName .
	?document <http://marklogic.com/xmi2es/discovery/attributeMatchesModel> ?placeholder
	}`,
			{}, [], sem.store(null, cts.documentQuery(input.reportURI))), 1, 4).toArray(),
		"Similar to physical predicate in candidate document": 
			fn.subsequence(sem.sparql(`
select ?document ?physicalName where {
	?placeholder <http://marklogic.com/xmi2es/discovery/match/attribute> "${attributeName}" .
	?placeholder <http://marklogic.com/xmi2es/discovery/match/physical> ?physicalName .
	?document <http://marklogic.com/xmi2es/discovery/predicateMatchesModel> ?placeholder
	}`,
			{}, [], sem.store(null, cts.documentQuery(input.reportURI))), 1, 4).toArray()
	};
	return ret;
}

function showViewAttributeDiscoveryJS(input, entityName, attributeName) {
	var splits = attributeName.split(".");
	if (splits.length > 1) attributeName = splits[0];
	var ret = {
		"SimilarPhysicalAttributes": 
			fn.subsequence(sem.sparql(`
select ?document ?physicalName where {
	?placeholder <http://marklogic.com/xmi2es/discovery/match/attribute> "${attributeName}" .
	?placeholder <http://marklogic.com/xmi2es/discovery/match/physical> ?physicalName .
	?document <http://marklogic.com/xmi2es/discovery/attributeMatchesModel> ?placeholder
	}`,
			{}, [], sem.store(null, cts.documentQuery(input.reportURI))), 1, 4).toArray(),
		"SimilarPhysicalPredicates": 
			fn.subsequence(sem.sparql(`
select ?document ?physicalName where {
	?placeholder <http://marklogic.com/xmi2es/discovery/match/attribute> "${attributeName}" .
	?placeholder <http://marklogic.com/xmi2es/discovery/match/physical> ?physicalName .
	?document <http://marklogic.com/xmi2es/discovery/predicateMatchesModel> ?placeholder
	}`,
			{}, [], sem.store(null, cts.documentQuery(input.reportURI))), 1, 4).toArray()
	};
	return ret;
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

function describeModel(input, norender) {
	var modelIRI = input.modelIRI;
	var descJ = {};
	descJ[`Model ${modelIRI} is stereotyped in the model as follows:`] = describeFacts(modelIRI);
	if (input.mappingURI && input.mappingObj) {
		descJ["The model also has the specified mapping facts:"] = {
			"Mapping URI": input.mappingURI,
			"Overall Mapping Source": input.mappingObj.mapping.source,
			"Overall Mapping Notes": input.mappingObj.mapping.notes
		};

		if (input.discovery == true) {
			descJ["Comments below include discovery findings. See the full report at this URI:"] = input.reportURI;
		}
	}
	if (norender) return descJ;
	return render(descJ);
}

function describeClass(input, entityName, norender) {
	var descJ = {};
	descJ[`Class ${entityName} is stereotyped in the model as follows:`] = 
		describeFacts(input.modelIRI + "/" + entityName);
	if (input.mappingURI && input.mappingObj) {
		var entity = input.mappingObj.entities[entityName];
		if (entity) {
			descJ["The class also has the specified mapping facts"]= {
				"Mapping Source": entity.source,
				"Mapping Notes": entity.notes,
				"Mapping Collections For Discovery": entity.discoveryCollections,
				"Mapping URI Patterns For Discovery": entity.discoveryURIPatterns,
				"Mapping Sample Data For Discovery": entity.discoverySampleData
			};

			if (input.discovery == true) {
				descJ["Discovery found the following:"] = showViewEntityDiscovery(input, entityName);
			}
		}
	}
	if (norender) return descJ;
	return render(descJ);
}

function describeAttrib(input, entityName, attributeName, norender) {
	var descJ = {};
	descJ[`Attribute ${attributeName} is stereotyped in the model as follows:`] = 
		describeFacts(input.modelIRI + "/" + entityName + "/" + attributeName);
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
				var attribArr = [];
				descJ["The attribute also has the specified mapping facts:"] = attribArr;
	   			for (var i = 0; i < attributes.length; i++) {
					var attr = entity.attributes[attributes[i]];
					attribArr.push({
						"Model Path": attributes[i],
						"Source Mapping": attr.mapping,
						"Mapping Attribute Notes": attr.notes,
						"Mapping Attribute Sample Data For Discovery":  attr.discoverySampleData,
						"Mapping Attribute AKA For Discovery": attr.discoveryAKA
					});	
					if (input.discovery == true) {
						descJ["Discovery found the following:"] = showViewAttributeDiscovery(input, entityName, attributes[i]);
					}
				}
   			}
		}
	}

	if (norender) return descJ;
	return render(descJ);
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
	if (input.mappingURI && input.mappingURI != "") {
		input.mappingURI = discovery.getMappingDocURI(input.mappingURI);
		input.mappingObj = cts.doc(input.mappingURI).toObject();
		if (input.discovery == true) {
			input.reportURI = discovery.getReportURI(input.mappingURI);
			input.report = cts.doc(input.reportURI).toObject();			
		}
	}
	if (dmMode == true) return cutContentDM(input, template);
	else return cutContentES(input, template);
}


function cutContentDM(input, template) {

	// These are Javascript template subs. The name of each matches the ${X} sub in the template.
	// DON'T CHANGE THE NAME.
	var templateFolder = "/dm/mapper/" + input.modelName + "/" + input.entityName + "/";
	var templateName = input.moduleName + ".json";
	var EntityXContentDMMapper = templateFolder + templateName;
	var ModelDesc = "Experimental UML2ES/DM Code. Inspect and tweak DM template " + EntityXContentDMMapper;
	var renderDesc = render(ModelDesc)
	var EntityContentEnableDMIn = "";
	var EntityContentEnableDMOut = "";
	var EntityX = input.entityName;
	var ModelName = input.modelName;
	var ModelGenURI = input.modelIRI;
	var ContentBuilder = `
function buildContent_${EntityX}(id, source, options, ioptions) {
	var mapper = getDMMapper(options);
	var mapping = mapper(source);
	var doptions = mapping[1];
	for (var dopt in doptions) {
		ioptions[dopt] = doptions[dopt];
	}
	return mapping[0];
}
`;

/*
This code snippet works. Aiming to build something like this:

'use strict';

const dm = require('/ext/declarative-mapper.sjs');

var template = {
  input: {"format": "json"}, 
  variables: {
      v1: "extract('//firstName')",
      v2: "concat($v1, '-andmore')",
      v3: "'hi'"
  },
  outputs: {
    main: {
      format: "json",
      content: [
        {
          goodness: "[[$v2]]",
          name: "[[concat(extract('/firstName'), extract('//lastName'))]]" ,
          andSome: {
            hail: "[[extract('//more/grace')]]"
          },
          xfirstName: "hi" ,
          a: "[[extract('//firstName') => upperCase()]]",
          tongs : [ "%%[[ extract('//things', true) ]]", {
					  athing : "[[ extract('a') ]]"
          }]
        },
        {
          someName: "[[extract('//lastName')]]"        
        }
      ]
    }
  },
  //description: {"a": "1"},
};

var dmContext = dm.newCompilerContext(template);
dmContext.flags.trace = true;
var dmTransformer = dm.prepare(dmContext);

//[
  dmTransformer({
    "firstName": "mike", 
    "lastName": "havey", 
    more: {luck : 1, grace: 2}, 
    things: [ {a: 1}, {a: 2}]
  })
                 //,
//  dmContext
//]

*/



	var dmTemplate = { 
		description: describeModel(input, "norender"),
		modules: { "functionLibraries": ["/xmi2es/dm.sjs"] },
		input: { 
			format: "json" 
		}, 
		variables: {},
		outputs: {
			main: {
				format: "json",
				content: [{}, {}]
			}
		}
	};
	dmTemplate.outputs.main.content[0] = walkModelForDM(dmTemplate, input, input.entityName, []);
	writeFile(templateFolder, templateName, dmTemplate, false, input.modelName, "dm");

	// we return module
	var tpl = eval('`'+template+'`');
	return tpl;
}

function walkModelForDM(dmTemplate, input, entityName, visited) {
  var describing = false;
  if (!dmTemplate.description[entityName]) {
  	  describing = true;
	  var entityDesc = describeClass(input, entityName, "norender");
	  dmTemplate.description[entityName] = {description: entityDesc};
	  dmTemplate.description[entityName].attributes = {};  	
  }

  // variable at level zero only
  var topLevel = visited.length == 0;
  var attributes = orderAttributes(getAttributes(input.modelIRI, entityName));
  if (topLevel == true) {
	for (var i = 0; i < attributes.length; i++) {
		if (attributes[i].attributeIsCalculated == true) {
			defineVarsForDM(dmTemplate, input, attributes, attributes[i]);
		}
	}
  }

  // Process each attribute in the entity
  var entityContents = {};

  visited.push(entityName);
  for (var i = 0; i < attributes.length; i++) { 
  	if (attributes[i].attributeIsExcluded == true) continue;

    var attributeName = attributes[i].attributeName;
    if (describing == true) {
		dmTemplate.description[entityName].attributes[attributeName] = 
			describeAttrib(input, entityName, attributeName, "norender");    	
    }

  	if (topLevel == true && dmTemplate.variables[attributeName]) {
	    // special case -this attribute has already been declared as a variable
  		entityContents[attributeName] = `[[ $${attributeName} ]]`;
  	}
  	else {
  		if (attributes[i].attributeIsSimpleType == true) {
	  		entityContents[attributeName] = `[[ extract('//TODO') ]]`;
  		}
  		else {
  			var entity2 = attributes[i].attributeType;
  			if (visited.indexOf(entity2) >= 0) continue;
  			var childContents = walkModelForDM(dmTemplate, input, entity2, visited);
  			// the type is that of another entity - either just one or an array
			if (attributes[i].attributeIsArray == true) {
		  		entityContents[attributeName] = [`%%[[ extract('//LOOPCOUNTER') ]]`, childContents];
			}  	
			else {
		  		entityContents[attributeName] = childContents;
			}	
  		}
  	}
  }
  return entityContents;
}

/*
Walk the calculated attributes and make variables for them (and their dependents).
Add calculated attributes to our content[1] - this is the content of "options" to be passed forward 
to headers, triples, and writers in the harmonization.
 */
function defineVarsForDM(dmTemplate, input, attributes, attribute) {
	var modelName = input.modelName;
	var entityName = input.entityName;
	var attribName = attribute.attributeName;
	var contentMode = attribute.attributeIsExcluded == true ? "options": "content";
	var deps = "";
	if (attribute.attributeIsCalculated == true) {
		for (var i = 0; i < attribute.attributeCalcDependencies.length; i++) {
			var depAttribName = attribute.attributeCalcDependencies[i];
			var depContentMode = "dontknow";
			var depAttrib = null;
			for (var j = 0; j < attributes.length; j++) {
				if (attributes[j].attributeName == depAttribName) {
					depAttrib = attributes[j];
					break;
				}
			}
			if (depAttrib == null) {
				throw "Programming error: deps for *" + attribute.attributeName + "* on dep *" + depAttributeName + "*";
			}
			depContentMode = depAttrib.attributeIsExcluded ? "options" : "content"
			deps += ` , '${depAttribName}', $${depAttribName}, '${depContentMode}' `;
			defineVarsForDM(dmTemplate, input, attributes, depAttrib);
		}
		dmTemplate.variables[attribName] = `xcalc('${modelName}', '${entityName}', '${attribName}', '${contentMode}' ${deps})`;
		if (contentMode == "options") {
			dmTemplate.outputs.main.content[1][attribName] = `[[ $${attribName} ]]`; // for options
		}
	}
	else {
		dmTemplate.variables[attribName] = `extract('//TODO')`;
	}
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

function createHarmonizeFlow(modelName, entityName, dataFormat, pluginFormat, flowName, contentMode, mappingURI, stagingDB) {

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

	if (mappingURI) mappingURI = mappingURI.trim();

	// now let's cookie-cut the harmonization flow
	var input = {
		modelVersion: info.version,
		modelIRI: modelIRI,
		modelName: modelName,
		entityName: entityName,
		pluginFormat: pluginFormat,
		dataFormat: dataFormat,
		contentMode: contentMode,
		mappingURI: mappingURI,
		discovery: mappingURI ? discovery.hasDiscovery(mappingURI) : false,
		discoveryDB: stagingDB,
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

function createConversionModule(modelName, entityName, dataFormat, pluginFormat, moduleName, contentMode, mappingURI) {

	// validate
	if (pluginFormat == null || ALLOWABLE_PLUGINS.indexOf(pluginFormat) < 0) throw "Illegal plugin format *" + pluginFormat + "*";
	if (dataFormat == null || ALLOWABLE_FORMATS.indexOf(dataFormat) < 0) throw "Illegal data format *" + dataFormat + "*";
	if (contentMode == null || ALLOWABLE_CONTENTS.indexOf(contentMode) < 0) throw "Illegal content mode *" + contentMode + "*";
	modelName = validateRequired(modelName, "modelName");
	entityName = validateRequired(entityName, "entityName");
	moduleName = validateRequired(moduleName, "moduleName");

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
	var moduleFolder = "/cookieCutter/" + modelName + "/src/main/ml-modules/root/esconversion/" + modelName + "/" + entityName + "/";

	if (mappingURI) mappingURI = mappingURI.trim();

	var input = {
		modelVersion: info.version,
		modelIRI: modelIRI,
		modelName: modelName,
		entityName: entityName,
		pluginFormat: pluginFormat,
		dataFormat: dataFormat,
		contentMode: contentMode,
		mappingURI: mappingURI,
		discovery: mappingURI ? discovery.hasDiscovery(mappingURI) : false,
		builderFunctions: builderFunctions,
		moduleName: moduleName, 
		harmonizationMode: false
	};
	// now let's cookie-cut the module; it's the same approach as content module of harmonization
	writeFile(moduleFolder, moduleName + "." + pluginFormat, 
		cutContent(input, useTemplate("/xmi2es/conversionTemplate/conversion.t" + pluginFormat)),
		true, modelName, "harmonization");
}

module.exports = {
  createEntities: createEntities,
  createHarmonizeFlow: createHarmonizeFlow,
  createConversionModule: createConversionModule
};
