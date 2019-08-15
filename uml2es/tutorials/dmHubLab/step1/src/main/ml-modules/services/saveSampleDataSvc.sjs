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

  xdmp.log("saveSampleDataSvc params " + JSON.stringify(params));
  xdmp.log("saveSampleDataSvc input type " + xdmp.type(input));

  input = xdmp.unquote(JSON.parse(input).content);

  xdmp.log("saveSampleDataSvc input " + JSON.stringify(input));

  // collect input
  var entityName = paramInput(params, "entityName");
  var mappingName = paramInput(params, "mappingName");
  var sample = paramInput(params, "sample");

  // obtain source
  var sourceURI = `/entities/${entityName}/harmonize/${mappingName}/samples/${sample}`;
  xdmp.eval('xdmp.documentInsert(sourceURI, source)', {sourceURI: sourceURI, source:input}, 
    {database: xdmp.database(dhfConfig.MODULESDATABASE), isolation:"different-transaction", update:"true"});
}

exports.POST = post;