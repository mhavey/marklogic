//const xesgen = require("/modelgen/Maudle/lib.sjs");
const util = require("/xmi2es/util.sjs");

/*
 * Create Headers Plugin
 *
 * @param id       - the identifier returned by the collector
 * @param content  - the output of your content plugin
 * @param options  - an object containing options. Options are sent from Java
 *
 * @return - an object of headers
 */
function createHeaders(id, content, options) {
  //var lang = xml
  //var ioptions = util.getIOptions(id,options);
  //return xesgen.setHeaders_A(id, content, ioptions, lang);
  return {};

  // TODO nested headers
}

module.exports = {
  createHeaders: createHeaders
};
