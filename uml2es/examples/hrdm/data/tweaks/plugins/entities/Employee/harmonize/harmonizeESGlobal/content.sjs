/*
Experimental UML2ES/DM Code. Inspect and tweak DM template /dm/mapper/EmployeeHubModel/Employee/harmonizeGlobalDM.json
*/

'use strict'

const xesgen = require("/modelgen/EmployeeHubModel/lib.sjs");
const util = require("/xmi2es/util.sjs");


const dm = require('/ext/declarative-mapper.sjs');
const DM_MAPPING_CONFIG_URI = "/dm/mapper/EmployeeHubModel/Employee/harmonizeGlobalDM.json";
function getDMMapper(options) {
  if (!options.mapper) {
    const ctx = dm.newCompilerContext(cts.doc(DM_MAPPING_CONFIG_URI).toObject());
    const mapper = dm.prepare(ctx);
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
	var mapping = mapper(source);
	var doptions = mapping[1];
	for (dopt in doptions) {
		ioptions[dopt] = doptions[dopt];
	}
	return mapping[0];
}


module.exports = {
  createContent: createContent
};
