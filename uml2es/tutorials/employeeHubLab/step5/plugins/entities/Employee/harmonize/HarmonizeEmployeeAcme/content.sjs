'use strict'

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
  // the original source documents
  let attachments = source;
  // now check to see if we have XML or json, then create a node clone from the root of the instance
  if (source instanceof Element || source instanceof ObjectNode) {
    let instancePath = '/*:envelope/*:instance';
    if(source instanceof Element) {
      //make sure we grab content root only
      instancePath += '/node()[not(. instance of processing-instruction() or . instance of comment())]';
    }
    source = new NodeBuilder().addNode(fn.head(source.xpath(instancePath))).toNode();
  }
  else{
    source = new NodeBuilder().addNode(fn.head(source)).toNode();
  }
  let employeeId = !fn.empty(fn.head(source.xpath('/employeeId'))) ? xs.string(fn.head(fn.head(source.xpath('/employeeId')))) : null;
  let firstName = !fn.empty(fn.head(source.xpath('/firstName'))) ? xs.string(fn.head(fn.head(source.xpath('/firstName')))) : null;
  let lastName = !fn.empty(fn.head(source.xpath('/lastName'))) ? xs.string(fn.head(fn.head(source.xpath('/lastName')))) : null;
  let status = !fn.empty(fn.head(source.xpath('/status'))) ? xs.string(fn.head(fn.head(source.xpath('/status')))) : null;
  let hireDate = !fn.empty(fn.head(source.xpath('/hireDate'))) ? xs.date(fn.head(fn.head(source.xpath('/hireDate')))) : null;
  let effectiveDate = !fn.empty(fn.head(source.xpath('/effectiveDate'))) ? xs.date(fn.head(fn.head(source.xpath('/effectiveDate')))) : null;
  let baseSalary = !fn.empty(fn.head(source.xpath('/baseSalary'))) ? xs.float(fn.head(fn.head(source.xpath('/baseSalary')))) : null;
  let bonus = !fn.empty(fn.head(source.xpath('/bonus'))) ? xs.float(fn.head(fn.head(source.xpath('/bonus')))) : null;
  let dateOfBirth = !fn.empty(fn.head(source.xpath('/dateOfBirth'))) ? xs.date(fn.head(fn.head(source.xpath('/dateOfBirth')))) : null;
  let uri = !fn.empty(fn.head(source.xpath('/uri'))) ? xs.string(fn.head(fn.head(source.xpath('/uri')))) : null;
  let memberOf = !fn.empty(fn.head(source.xpath('/memberOf'))) ? xs.int(fn.head(fn.head(source.xpath('/memberOf')))) : null;
  let reportsTo = !fn.empty(fn.head(source.xpath('/reportsTo'))) ? xs.string(fn.head(fn.head(source.xpath('/reportsTo')))) : null;
  
  /* The following property is a local reference. */
  let addresses = [];
  if(fn.head(source.xpath('/addresses'))) {
    for(const item of Sequence.from(source.xpath('/addresses'))) {
      // let's create and pass the node
      let itemSource = new NodeBuilder();
      itemSource.addNode(fn.head(item));
      // this will return an instance of a Address
      addresses.push(extractInstanceAddress(itemSource.toNode()));
      // or uncomment this to create an external reference to a Address
      //addresses.push(makeReferenceObject('Address', itemSource.toNode()));
    }
  };
  
  /* The following property is a local reference. */
  let phones = [];
  if(fn.head(source.xpath('/phones'))) {
    for(const item of Sequence.from(source.xpath('/phones'))) {
      // let's create and pass the node
      let itemSource = new NodeBuilder();
      itemSource.addNode(fn.head(item));
      // this will return an instance of a Phone
      phones.push(extractInstancePhone(itemSource.toNode()));
      // or uncomment this to create an external reference to a Phone
      //phones.push(makeReferenceObject('Phone', itemSource.toNode()));
    }
  };
  
  /* The following property is a local reference. */
  let emails = [];
  if(fn.head(source.xpath('/emails'))) {
    for(const item of Sequence.from(source.xpath('/emails'))) {
      // let's create and pass the node
      let itemSource = new NodeBuilder();
      itemSource.addNode(fn.head(item));
      // this will return an instance of a Email
      emails.push(extractInstanceEmail(itemSource.toNode()));
      // or uncomment this to create an external reference to a Email
      //emails.push(makeReferenceObject('Email', itemSource.toNode()));
    }
  };

  // return the instance object
  return {
    '$attachments': attachments,
    '$type': 'Employee',
    '$version': '0.0.1',
    'employeeId': employeeId,
    'firstName': firstName,
    'lastName': lastName,
    'status': status,
    'hireDate': hireDate,
    'effectiveDate': effectiveDate,
    'baseSalary': baseSalary,
    'bonus': bonus,
    'dateOfBirth': dateOfBirth,
    'uri': uri,
    'memberOf': memberOf,
    'reportsTo': reportsTo,
    'addresses': addresses,
    'phones': phones,
    'emails': emails
  }
};

/**
* Creates an object instance from some source document.
* @param source  A document or node that contains
*   data for populating a Address
* @return An object with extracted data and
*   metadata about the instance.
*/
function extractInstanceAddress(source) {
  let attachments = source;
  // now check to see if we have XML or json, then create a node clone to operate of off
  if (source instanceof Element || source instanceof ObjectNode) {
    let instancePath = '/';
    if(source instanceof Element) {
      //make sure we grab content root only
      instancePath = '/node()[not(. instance of processing-instruction() or . instance of comment())]';
    }
    source = new NodeBuilder().addNode(fn.head(source.xpath(instancePath))).toNode();
  }
  else{
    source = new NodeBuilder().addNode(fn.head(source)).toNode();
  }
  let addressType = !fn.empty(fn.head(source.xpath('/addressType'))) ? xs.string(fn.head(fn.head(source.xpath('/addressType')))) : null;
  let lines = !fn.empty(fn.head(source.xpath('/lines'))) ? fn.head(source.xpath('/lines')) : [];
  let city = !fn.empty(fn.head(source.xpath('/city'))) ? xs.string(fn.head(fn.head(source.xpath('/city')))) : null;
  let state = !fn.empty(fn.head(source.xpath('/state'))) ? xs.string(fn.head(fn.head(source.xpath('/state')))) : null;
  let zip = !fn.empty(fn.head(source.xpath('/zip'))) ? xs.string(fn.head(fn.head(source.xpath('/zip')))) : null;
  let country = !fn.empty(fn.head(source.xpath('/country'))) ? xs.string(fn.head(fn.head(source.xpath('/country')))) : null;

  // return the instance object
  return {
  
    '$type': 'Address',
    '$version': '0.0.1',
    'addressType': addressType,
    'lines': lines,
    'city': city,
    'state': state,
    'zip': zip,
    'country': country
  }
};

/**
* Creates an object instance from some source document.
* @param source  A document or node that contains
*   data for populating a Phone
* @return An object with extracted data and
*   metadata about the instance.
*/
function extractInstancePhone(source) {
  let attachments = source;
  // now check to see if we have XML or json, then create a node clone to operate of off
  if (source instanceof Element || source instanceof ObjectNode) {
    let instancePath = '/';
    if(source instanceof Element) {
      //make sure we grab content root only
      instancePath = '/node()[not(. instance of processing-instruction() or . instance of comment())]';
    }
    source = new NodeBuilder().addNode(fn.head(source.xpath(instancePath))).toNode();
  }
  else{
    source = new NodeBuilder().addNode(fn.head(source)).toNode();
  }
  let phoneType = !fn.empty(fn.head(source.xpath('/phoneType'))) ? xs.string(fn.head(fn.head(source.xpath('/phoneType')))) : null;
  let phoneNumber = !fn.empty(fn.head(source.xpath('/phoneNumber'))) ? xs.string(fn.head(fn.head(source.xpath('/phoneNumber')))) : null;

  // return the instance object
  return {
  
    '$type': 'Phone',
    '$version': '0.0.1',
    'phoneType': phoneType,
    'phoneNumber': phoneNumber
  }
};

/**
* Creates an object instance from some source document.
* @param source  A document or node that contains
*   data for populating a Email
* @return An object with extracted data and
*   metadata about the instance.
*/
function extractInstanceEmail(source) {
  let attachments = source;
  // now check to see if we have XML or json, then create a node clone to operate of off
  if (source instanceof Element || source instanceof ObjectNode) {
    let instancePath = '/';
    if(source instanceof Element) {
      //make sure we grab content root only
      instancePath = '/node()[not(. instance of processing-instruction() or . instance of comment())]';
    }
    source = new NodeBuilder().addNode(fn.head(source.xpath(instancePath))).toNode();
  }
  else{
    source = new NodeBuilder().addNode(fn.head(source)).toNode();
  }
  let emailType = !fn.empty(fn.head(source.xpath('/emailType'))) ? xs.string(fn.head(fn.head(source.xpath('/emailType')))) : null;
  let emailAddress = !fn.empty(fn.head(source.xpath('/emailAddress'))) ? xs.string(fn.head(fn.head(source.xpath('/emailAddress')))) : null;

  // return the instance object
  return {
  
    '$type': 'Email',
    '$version': '0.0.1',
    'emailType': emailType,
    'emailAddress': emailAddress
  }
};


function makeReferenceObject(type, ref) {
  return {
    '$type': type,
    '$ref': ref
  };
}

module.exports = {
  createContent: createContent
};

