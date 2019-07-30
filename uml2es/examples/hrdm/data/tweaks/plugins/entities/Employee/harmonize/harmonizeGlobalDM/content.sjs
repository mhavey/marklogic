/*
Experimental UML2ES/DM Code. Inspect and tweak DM template /dm/mapper/DHFEmployeeSample/Employee/harmonizeGlobalDM.json
*/

'use strict'

const xesgen = require("/modelgen/DHFEmployeeSample/lib.sjs");
const util = require("/xmi2es/util.sjs");


const dhfConfig = require("/com.marklogic.hub/config.sjs");
const dm = require('/ext/declarative-mapper.sjs');
const DM_MAPPING_CONFIG_URI = "/dm/mapper/DHFEmployeeSample/Employee/harmonizeGlobalDM.json";
function getDMMapper(options) {
  if (!options.mapper) {
    var dmTemplate = xdmp.eval('cts.doc(uri)', {uri: DM_MAPPING_CONFIG_URI}, {database: xdmp.database(
      dhfConfig.FINALDATABASE)}).toArray()[0].toObject();
    var ctx = dm.newCompilerContext(dmTemplate);
    var mapper = dm.prepare(ctx);
    options.mapper = mapper;
  }
  return options.mapper;
}


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

  return buildContent_Employee(id, source, options, ioptions);
}

function buildContent_Employee(id, source, options, ioptions) {
	var mapper = getDMMapper(options);

  var salaryURI = fn.replace(id, "/employee/", "/salary/");
  var globalSource = {
    employeeRecord: source,
    salaryRecord: cts.doc(salaryURI).toObject()
  };

	var mapping = mapper(globalSource);
	var doptions = mapping[1];
	for (var dopt in doptions) {
		ioptions[dopt] = doptions[dopt];
	}
  xdmp.log("Options for " + id + " are " + JSON.stringify(ioptions));
	return mapping[0];
}


module.exports = {
  createContent: createContent
};
