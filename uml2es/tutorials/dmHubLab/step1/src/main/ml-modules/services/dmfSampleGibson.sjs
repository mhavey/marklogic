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

  input = xdmp.unquote(input); // IDE passes as string
  xdmp.log("dmfSampleGibson params " + JSON.stringify(params));
  xdmp.log("dmfSampleGibson input " + input);

  // collect input
  var entityName = paramInput(params, "entityName");
  var mappingName = paramInput(params, "mappingName");
  var sample = paramInput(params, "sample");
  var ninput = normalizeInput(input);

  //context.outputTypes = ["application/json"];

  // obtain source
  var sourceURI = `/entities/${entityName}/harmonize/${mappingName}/samples/${sample}`;
  xdmp.eval('xdmp.documentInsert(sourceURI, source)', {sourceURI: sourceURI, source:ninput}, 
    {database: xdmp.database(dhfConfig.MODULESDATABASE), isolation:"different-transaction", update:"true"});
  //return {ok:true};
}

exports.POST = post;