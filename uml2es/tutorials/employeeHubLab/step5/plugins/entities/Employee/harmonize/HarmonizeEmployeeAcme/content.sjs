'use strict'

const ulib = require("/modelgen/EmployeeHubModel/lib.sjs");

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

  return extractInstanceEmployee(source);
}
  
/**
* Creates an object instance from some source document.
* @param source  A document or node that contains
*   data for populating a Employee
* @return An object with extracted data and
*   metadata about the instance.
*/
function extractInstanceEmployee(source) {

  var instance = source.toObject().envelope.instance;
  xdmp.log(JSON.stringify(instance));

  // get the salary record with the most recent date
  var salaryDoc = instance.salaryHistory.sort(function(a,b) {
    a.actualEffectiveDate = xdmp.parseDateTime("[M01]/[D01]/[Y0001]", a.effectiveDate);
    b.actualEffectiveDate = xdmp.parseDateTime("[M01]/[D01]/[Y0001]", b.effectiveDate);
    if (a.actualEffectiveDate > b.actualEffectiveDate) return -1;
    if (b.actualEffectiveDate > a.actualEffectiveDate) return 1;
    return 0;
  })[0];

  var content = {
    '$attachments': source,
    '$type': 'Employee',
    '$version': '0.0.1',
  };

  // !!! USING SME MAPPING !!!
  content.employeeId = "ACME_" + instance.id;
  content.firstName = instance.firstName;
  content.lastName = instance.lastName;
  if (instance.dateOfBirth) content.dateOfBirth = xs.date(xdmp.parseDateTime("[M01]/[D01]/[Y0001]", instance.dateOfBirth));
  if (instance.hireDate) content.dateOfBirth = xs.date(xdmp.parseDateTime("[M01]/[D01]/[Y0001]", instance.hireDate));
  if (salaryDoc && salaryDoc.actualEffectiveDate) content.effectiveDate = xs.date(salaryDoc.actualEffectiveDate);
  if (salaryDoc && salaryDoc.salary) content.baseSalary = salaryDoc.salary;

  // !!! CALCULATED !!!
  ulib.doCalculation_Employee_uri(null, content, null);
  return content;
};

module.exports = {
  createContent: createContent
};

