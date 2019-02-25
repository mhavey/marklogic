// import the generated lib
const ulib = require("/modelgen/EmployeeHubModel/lib.sjs");

function write(id, envelope, options) {

  // from the envelope we need the content part - it has our calculated uri
  var content = envelope.envelope.instance.Department;

  // call the generated lib
  ulib.runWriter_Department(id, envelope, content, options);
}

module.exports = write;
