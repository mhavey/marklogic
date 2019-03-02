/*
  Model http://jude.org/maudle/Maudle-0.0.1 is stereotyped in the model as follows:: 
    hasFunction: 
      doCalculation_A_uri,
      doCalculation_B_a,
      doCalculation_B_c,
      doCalculation_B_uri,
      runWriter_A,
      runWriter_B
*/

'use strict'

const xesgen = require("/modelgen/Maudle/lib.sjs");
const util = require("/xmi2es/util.sjs");

/*
const dm = require('/ext/declarative-mapper.sjs');
const DM_MAPPING_CONFIG_URI = "";
function getDMMapper(options) {
  if (!options.mapper) {
    const ctx = dm.newCompilerContext(DM_MAPPING_CONFIG_URI);
    const mapper = dm.prepare(ctx);
    options.mapper = mapper;
  }
  return options.mapper;
}
*/

/*
* Create Content Plugin
*
* @param id         - the identifier returned by the collector
* @param options    - an object containing options. Options are sent from Java
*
* @return - your content
*/
function createContent(id, options) {
  let doc = cts.doc(id);
  let ioptions = util.setIOptions(id,options);

  let source;

  // for xml we need to use xpath
  if(doc && xdmp.nodeKind(doc) === 'element' && doc instanceof XMLDocument) {
    source = doc
  }
  // for json we need to return the instance
  else if(doc && doc instanceof Document) {
    source = fn.head(doc.root);
  }
  // for everything else
  else {
    source = doc;
  }

  return buildContent_A(id, source, options, ioptions);
}


/*
  Class A is stereotyped in the model as follows:: 
    collections: 
      A,
      Maudle
*/
function buildContent_A(id,source,options,ioptions) {
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
      '$type': 'A',
      '$version': '0.0.1'
   };

var data = id.endsWith(".xml") ? source.xpath("string(/envelope/instance/data)") : source.toObject().envelope.instance.data;

var data = source.toObject().envelope.instance.data;

/*
  Attribute header is stereotyped in the model as follows:: 
    resolvedType: 
      string
*/
   ret["header"] = "ajj"; // type: string, req'd: true, array: false

/*
  Attribute format is stereotyped in the model as follows:: 
    resolvedType: 
      string
*/
   ret["format"] = "json"; // type: string, req'd: true, array: false

/*
  Attribute id is stereotyped in the model as follows:: 
    resolvedType: 
      string
*/
   ret["id"] = "ajj" + data; // type: string, req'd: true, array: false

/*
  Attribute uri is stereotyped in the model as follows:: 
    basedOnAttribute: 
      format,
      id
    ,
    calculation: 
        \/\,
        $attribute(id),
        \.\,
        $attribute(format)
    ,
    isURI: 
      true
    ,
    resolvedType: 
      string
*/
   xesgen.doCalculation_A_uri(id, ret, ioptions) 

   return ret;
}

module.exports = {
  createContent: createContent
};
