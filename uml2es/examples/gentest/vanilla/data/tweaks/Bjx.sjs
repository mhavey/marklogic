/*
  Model http://jude.org/maudle/Maudle-0.0.1 is stereotyped in the model as follows:: 
    hasFunction: 
      doCalculation_A_uri,
      doCalculation_B_a,
      doCalculation_B_c,
      doCalculation_B_uri,
      runWriter_A,
      runWriter_B,
      setHeaders_A,
      setHeaders_B
*/

const xesgen = require("/modelgen/Maudle/lib.sjs");

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

var options = {};

function createContent(id,source, options) {
  return buildContent_B(id, source, options, options);
}


/*
  Class B is stereotyped in the model as follows:: 
    collections: 
      B,
      Maudle
    ,
    excludes: 
      http://jude.org/maudle/Maudle-0.0.1/B/a,
      http://jude.org/maudle/Maudle-0.0.1/B/header,
      http://jude.org/maudle/Maudle-0.0.1/B/uri
*/
function buildContent_B(id,source,options,ioptions) {
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
      '$type': 'B',
      '$version': '0.0.1'
   };

  var sampleData = id.endsWith(".xml") ? source.xpath("string(/envelope/instance/data)") : source.toObject().envelope.instance.data;

/*
  Attribute b is stereotyped in the model as follows:: 
    resolvedType: 
      string
*/
   ret["b"] = "Bjxb"; // type: string, req'd: true, array: false

/*
  Attribute format is stereotyped in the model as follows:: 
    resolvedType: 
      string
*/
   ret["format"] = "xml"; // type: string, req'd: true, array: false

/*
  Attribute header is stereotyped in the model as follows:: 
    header: 
      headerFromContent
    ,
    resolvedType: 
      string
*/
/*
  Attribute id is stereotyped in the model as follows:: 
    resolvedType: 
      string
*/
   ret["id"] = "Bjx" + sampleData; // type: string, req'd: true, array: false

/*
  Attribute a is stereotyped in the model as follows:: 
    basedOnAttribute: 
      format
    ,
    calculation: 
        $attribute(format)
    ,
    resolvedType: 
      string
*/
   xesgen.doCalculation_B_a(id, ret, ioptions) 

/*
  Attribute c is stereotyped in the model as follows:: 
    basedOnAttribute: 
      a,
      b
    ,
    calculation: 
        $attribute(a),
        $attribute(b)
    ,
    resolvedType: 
      string
*/
   xesgen.doCalculation_B_c(id, ret, ioptions) 

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
   xesgen.doCalculation_B_uri(id, ret, ioptions) 

   return ret;
}

module.exports = {
  createContent: createContent
};
