const util = require("/dmIde2dmf.sjs");
const dhfConfig = require("/com.marklogic.hub/config.sjs");

function normalizeInput(payload, params) {
 return (payload instanceof Sequence) ? payload.toArray()[0] : 
    (Array.isArray(payload) ? payload[0] : payload);
}

function errorHandler(statusCode, statusMsg, body) {
  fn.error(null, 'RESTAPI-SRVEXERR', Sequence.from([statusCode, statusMsg, body]));
}

function userError(msg) { errorHandler(400, "Input error", msg);}

function paramInput(params, attrib) {
  if (params[attrib] && params[attrib] != null) {
    var val = ("" + params[attrib]).trim();
    if (val.length > 0) return val;
  }
  userError("Missing required input: " + attrib);
}

function post(context, params, input) {

  xdmp.log("dmfTestGibson params " + JSON.stringify(params));

  // collect input
  var entityName = paramInput(params, "entityName");
  var mappingName = paramInput(params, "mappingName");
  var sample = paramInput(params, "sample");
  var ninput = normalizeInput(input);

  context.outputTypes = ["application/json"];

  // obtain source
  var sourceURI = `/entities/${entityName}/harmonize/${mappingName}/samples/${sample}`;
  var source = fn.head(xdmp.eval('cts.doc(sourceURI)', {sourceURI: sourceURI}, {database: xdmp.database(dhfConfig.MODULESDATABASE)}));
  if (!source || source == null) userError("Sample not found *" + sourceURI + "*");

  // get DM mapping and run mapper
  var dmTemplate = util.convertDmIde2DMF4Test(ninput, entityName);
  return util.runDMMappingTest(dmTemplate, source);
}

exports.POST = post;