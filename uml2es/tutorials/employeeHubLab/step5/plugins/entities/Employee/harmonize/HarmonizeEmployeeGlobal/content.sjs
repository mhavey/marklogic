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
  
function extractInstanceEmployee(source) {

  var instance = source.toObject().envelope.instance;

  var content = {
    '$attachments': source,
    '$type': 'Employee',
    '$version': '0.0.1',
  };

  // get associated salary doc
  var salaryDoc = cts.doc("/hr/salary/global/" + instance.emp_id + ".json");
  if (salaryDoc) salaryDoc = salaryDoc.toObject();
  if (salaryDoc.envelope && salaryDoc.envelope.instance) salaryDoc = salaryDoc.envelope.instance;

  // !!! USING SME MAPPING !!!
  content.employeeId = instance.emp_id;
  content.firstName = instance.first_name;
  content.lastName = instance.last_name;
  content.reportsTo = instance.reports_to;
  content.memberOf = instance.dept_num;
  if (instance.dob) content.dateOfBirth = xs.date(xdmp.parseDateTime("[M01]/[D01]/[Y0001]", instance.dob));
  if (instance.hire_date) content.hireDate = xs.date(xdmp.parseDateTime("[M01]/[D01]/[Y0001]", instance.hire_date));
  if (salaryDoc) content.status = salaryDoc.status;
  if (salaryDoc) content.baseSalary = salaryDoc.base_salary;
  if (salaryDoc) content.bonus = salaryDoc.bonus;
  if (salaryDoc) content.effectiveDate = xs.date(xdmp.parseDateTime("[M01]/[D01]/[Y0001]", salaryDoc.job_effective_date));

  // sub-documents
  content.addresses =  [extractInstanceAddress(instance)];
  content.phones = [
    extractInstancePhone(instance, "home", "home_phone"),
    extractInstancePhone(instance, "mobile", "mobile"),
    extractInstancePhone(instance, "pager", "pager"),
    extractInstancePhone(instance, "work", "work_phone"),
  ];
  content.emails = [
    extractInstanceEmail(instance, "home", "home_email"),
    extractInstanceEmail(instance, "work", "work_email")
  ];

  // !!! CALCULATED !!!
  ulib.doCalculation_Employee_uri(null, content, null);
  return content;
};

// Extract the one and only address from the employee instance
function extractInstanceAddress(instance) {
  return {
    '$type': 'Address',
    '$version': '0.0.1',
    'addressType': "Primary",
    'lines': [instance.addr1, instance.addr2], 
    'city': instance.city,
    'state': instance.state,
    'zip': instance.zip,
    'country': "USA"
  }
};

// extract phone of given type
function extractInstancePhone(instance, type, data) {
  return {  
    '$type': 'Phone',
    '$version': '0.0.1',
    'phoneType': type,
    'phoneNumber': instance[data]
  }
};

// extract email of given type
function extractInstanceEmail(instance, type, data) {
  return {  
    '$type': 'Email',
    '$version': '0.0.1',
    'emailType': type,
    'emailAddress': instance[data]
  }
};

module.exports = {
  createContent: createContent
};

