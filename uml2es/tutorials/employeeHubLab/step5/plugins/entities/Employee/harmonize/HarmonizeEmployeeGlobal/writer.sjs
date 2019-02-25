// import the generated lib
const ulib = require("/modelgen/EmployeeHubModel/lib.sjs");

function write(id, envelope, options) {
  // from the envelope we need the content part - it has our calculated uri
  var content = envelope.envelope.instance.Employee;

  // call the generated lib
  ulib.runWriter_Employee(id, envelope, content, options);
}

module.exports = write;
