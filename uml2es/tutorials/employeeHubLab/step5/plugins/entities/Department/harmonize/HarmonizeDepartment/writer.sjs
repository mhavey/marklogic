// import the generated lib
const ulib = require("/modelgen/EmployeeHubModel/lib.sjs");

function write(id, envelope, options) {

  // call the generated lib
  ulib.runWriter_Department(id, envelope, options);
}

module.exports = write;
