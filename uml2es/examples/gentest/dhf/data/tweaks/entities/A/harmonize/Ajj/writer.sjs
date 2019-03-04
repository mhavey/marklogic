const xesgen = require("/modelgen/Maudle/lib.sjs");
const util = require("/xmi2es/util.sjs");

/*~
 * Writer Plugin
 *
 * @param id       - the identifier returned by the collector
 * @param envelope - the final envelope
 * @param options  - an object options. Options are sent from Java
 *
 * @return - nothing
 */
function write(id, envelope, options) {
  xesgen.runWriter_A(id, envelope, util.getIOptions(id,options));
      util.removeIOptions(id,options);
  //xdmp.documentInsert(id, envelope, xdmp.defaultPermissions(), options.entity);
  util.removeIOptions(id,options);
}

module.exports = write;
