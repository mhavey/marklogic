const dm = require('/ext/declarative-mapper.sjs');

/*
This module converts DM IDE mapping to Nic Gibcon json-sc DM template format.
It's a workaround: Ivo/Stelian tool does not support DM IDE to DM json-sc format. 
The mapping world at ML is moving fast. This module serves a purpose at a moment 
in time and will soon by OBSOLETE.
DON'T USE THIS!
*/

//declareUpdate();

function convertDmIde2DMF(dmuiMappingURI, dmfMappingURI, mainEntity) {
  var doc = fn.head(xdmp.eval('cts.doc(dmuiMappingURI)', {dmuiMappingURI: dmuiMappingURI}, {'database': xdmp.modulesDatabase()})); 
  if (!doc || doc == null) throw "Not found in modules DB: *" + dmuiMappingURI + "*";
  var dmTemplate = buildDMTemplate(doc, mainEntity);
  xdmp.documentInsert(dmfMappingURI, dmTemplate, {
    "collections": ["dm", "cookieCutter", "http://marklogic.com/entity-services/models", mainEntity],
    "permissions": xdmp.documentGetPermissions(dmuiMappingURI)
  });
}

function convertDmIde2DMF4Test(dmuiMapping, mainEntity) {
  return buildDMTemplate(dmuiMapping, mainEntity);
}

function buildDMTemplate(dmuiTemplate, mainEntity) {
  return {
     "input": {
        "format": "json"
     },
     "outputs": {
        "main": {
           "format": "json",
           "content": [
             buildEntity(dmuiTemplate, mainEntity), 
             {}
           ]
        }
     }
  };
}

function buildEntity(doc, entityName) {
  var props = doc.xpath("//definitions/" + entityName + "/properties/*/node-name()");
  var content = {};
  var theOneCondition = null;
  content[entityName] = {};
  for (var prop of props) {
    var sprop = ("" + prop).trim();
    if (sprop == "") continue;
    var propDef = fn.head(doc.xpath("//definitions/" + entityName + "/properties/" + sprop));

    var condition = fn.head(propDef.xpath("coalesce/condition"));
    if (condition && condition != null && (""+condition) != "") {
      if (theOneCondition == null) {
        theOneCondition = ""+condition;
      }
      else if (theOneCondition != condition) {
        throw "Multiple conditions *" + theOneCondition + "*" + condition + "*";
      }
    }

    var expression = fn.head(propDef.xpath("coalesce/expression"));
    if (expression && expression != null && (""+expression) != "") {
      content[entityName][sprop] = ""+expression;
    }
    else {
      var ref = fn.head(propDef.xpath("*[string(node-name(.)) eq '$ref']"));
      if (ref && ref != null && ""+ref != "") {
        var toks = (""+ref).split("/");
        ref = toks[toks.length - 1];
        content[entityName][sprop] = buildEntity(doc, ref);
      }      
    }
  }
  
  if (theOneCondition == null) return content;
  else return [theOneCondition, content];
}

function runDMMappingTest(dmTemplate, source) {
  var ctx = dm.newCompilerContext(dmTemplate);
  var mapper = dm.prepare(ctx);
  var mapping = mapper(source);
  return mapping[0];
}

module.exports = {
  convertDmIde2DMF : convertDmIde2DMF,
  convertDmIde2DMF4Test: convertDmIde2DMF4Test,
  runDMMappingTest: runDMMappingTest
};

