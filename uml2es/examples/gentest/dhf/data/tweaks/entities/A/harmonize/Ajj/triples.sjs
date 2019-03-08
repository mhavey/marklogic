//const xesgen = require("/modelgen/Maudle/lib.sjs");
const util = require("/xmi2es/util.sjs");

/*
 * Create Triples Plugin
 *
 * @param id       - the identifier returned by the collector
 * @param content  - the output of your content plugin
 * @param headers  - the output of your heaaders plugin
 * @param options  - an object containing options. Options are sent from Java
 *
 * @return - an array of triples
 */
function createTriples(id, content, headers, options) {
  //var ioptions = util.getIOptions(id,options);
  //return xesgen.setTriples_A(id, content, headers, ioptions);
  return [];

  // TODO nested triples
}

module.exports = {
  createTriples: createTriples
};

