(:
  Model http://com.marklogic.es.uml.hr/HR-0.0.1 is stereotyped in the model as follows:: 
    hasFunction: 
      doCalculation_Department_deptIRI,
      doCalculation_Department_uri,
      doCalculation_Employee_empIRI,
      doCalculation_Employee_empLabel,
      doCalculation_Employee_employeeName,
      doCalculation_Employee_uri,
      runWriter_Department,
      runWriter_Employee,
      setHeaders_Department,
      setHeaders_Employee,
      setTriples_Department,
      setTriples_Employee
    ,
    semPrefixes: 
        semPrefix: 
          org
        ,
        semReference: 
          http://www.w3.org/ns/org#
  ,
  The model also has the specified mapping facts:: 
    Mapping URI: /xmi2es/excel-mapper/acme-mapping.json,
    Overall Mapping Source: ACMETech HR Data,
    Overall Mapping Notes: JSON Employee Files From Acquired Firm ACME
  ,
  Comments below include discovery findings. See the full report at this URI:: /xmi2es/discovery/acme-mapping.json
:)

xquery version "1.0-ml";

module namespace plugin = "http://marklogic.com/data-hub/plugins";

import module namespace xesgen = "http://com.marklogic.es.uml.hr/HR-0.0.1" at "/modelgen/DHFEmployeeSample/lib.xqy" ;
import module namespace util = "http://marklogic.com/xmi2es/util" at "/xmi2es/util.xqy" ;

declare namespace es = "http://marklogic.com/entity-services";

declare option xdmp:mapping "false";

(:~
 : Create Content Plugin
 :
 : @param $id          - the identifier returned by the collector
 : @param $options     - a map containing options. Options are sent from Java
 :
 : @return - your transformed content
 :)
declare function plugin:create-content(
  $id as xs:string,
  $options as map:map) as map:map
{
  let $ioptions := util:setIOptions($id,$options)
  let $doc := fn:doc($id)
  let $source := $doc
  return plugin:buildContent_Employee($id, $source, $options, $ioptions)
};


(:
  Class Employee is stereotyped in the model as follows:: 
    collections: 
      Employee
    ,
    excludes: 
      http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/empIRI,
      http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/empLabel,
      http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/employeeName,
      http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/memberOf,
      http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/reportsTo,
      http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/uri
    ,
    semType: 
      http://xmlns.com/foaf/0.1/Agent
  ,
  The class also has the specified mapping facts: 
    Mapping Source: Employee JSON document,
    Mapping Notes: Each employee has JSON file xyz.json, where xyz is the numeric employee ID.,
    Mapping Collections For Discovery: null,
    Mapping URI Patterns For Discovery: null,
    Mapping Sample Data For Discovery: null
  ,
  Discovery found the following:: 
    Documents whose structure resembles the model: 
        doc: /hr/employee/global/842.xml,
        numMatches: 4
      ,
        doc: /hr/employee/global/77.xml,
        numMatches: 4
      ,
        doc: /hr/employee/global/866.xml,
        numMatches: 4
      ,
        doc: /hr/employee/global/852.xml,
        numMatches: 4
    ,
    Possible collections: 
      Employee,
      LoadEmployee
    ,
    Possible URIs: 
      /hr/employee/acme/32920.json,
      /hr/employee/acme/34324.json,
      /hr/employee/global/249.xml,
      /hr/employee/global/25.xml,
      /hr/employee/global/258.xml,
      /hr/employee/global/299.xml,
      /hr/employee/global/596.xml
:)
declare function plugin:buildContent_Employee($id,$source,$options,$ioptions) {
   let $source := $source//es:instance
   let $model := json:object()
   let $_ := (
      map:put($model, '$type', 'Employee'),
      map:put($model, '$version', '0.0.1')
   )

  (:
    Salary data is in the main doc under salary history - and we need most recent.
  :)
    let $salary-doc := 
      let $latest-effective-date := xs:date("1900-01-01")
      let $latest-doc := ()
      let $_ := for $sal in $source/salaryHistory return 
        let $this-effective-date := xs:date(xdmp:parse-dateTime("[M01]/[D01]/[Y0001]", string($sal/effectiveDate)))
        return
          if ($this-effective-date gt $latest-effective-date) then xdmp:set($latest-doc, $sal)
          else ()
      return $latest-doc

(:
  Attribute firstName is stereotyped in the model as follows:: 
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: firstName,
      Source Mapping: firstName,
      Mapping Attribute Notes: null,
      Mapping Attribute Sample Data For Discovery: 
        Rosanne,
        Robert
      ,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/842.xml,
        physicalName: first_name
      ,
        document: /hr/employee/global/749.xml,
        physicalName: first_name
      ,
        document: /hr/employee/global/390.xml,
        physicalName: first_name
      ,
        document: /hr/employee/global/584.xml,
        physicalName: first_name
    ,
    Similar to physical predicate in candidate document: 
:)
let $_ := xdmp:log("GOTTOFIRSTNAME *" || $id || "*" || string($source/firstName) || "*")

   let $_ := map:put($model, "firstName", string($source/firstName)) (: type: string, req'd: true, array: false :)

   (:
   Attribute dateOfBirth is stereotyped in the model as follows:
    resolvedType:
      date
   :)
   let $_ := 
      if (string-length(string($source/dateOfBirth)) gt 0) then
        map:put($model, "dateOrBirth", xdmp:parse-dateTime("[M01]/[D01]/[Y0001]", string($source/dateOfBirth))) (: type: date, req'd: true, array: false :)
      else ()

(:
  Attribute effectiveDate is stereotyped in the model as follows:: 
    resolvedType: 
      date
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: effectiveDate,
      Source Mapping: salaryHistory.effectiveDate,
      Mapping Attribute Notes: mm/dd/yyyy. History can have multiple entries. Take most recent.,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := 
      if (string-length(string($source/effectiveDate)) gt 0) then
        map:put($model, "effectiveDate", xdmp:parse-dateTime("[M01]/[D01]/[Y0001]", string($source/effectiveDate))) (: type: date, req'd: true, array: false :)
      else ()


(:
  Attribute status is stereotyped in the model as follows:: 
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: status,
      Source Mapping: salaryHistory.salary,
      Mapping Attribute Notes: History can have multipe entries. Select the one with most recent effective date.,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/390.xml,
        physicalName: state
      ,
        document: /hr/employee/global/730.xml,
        physicalName: state
      ,
        document: /hr/salary/global/591.xml,
        physicalName: status
      ,
        document: /hr/salary/global/122.xml,
        physicalName: status
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "status", "acquired") (: type: string, req'd: true, array: false :)

(:
  Attribute employeeId is stereotyped in the model as follows:: 
    header: 
      entityId
    ,
    resolvedType: 
      int
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: employeeId,
      Source Mapping: id,
      Mapping Attribute Notes: null,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "employeeId", string($source/id)) (: type: int, req'd: true, array: false :)

(:
  Attribute reportsTo is stereotyped in the model as follows:: 
    reference: 
      http://com.marklogic.es.uml.hr/HR-0.0.1/Employee
    ,
    relationship: 
      association
    ,
    resolvedType: 
      #/definitions/Employee
    ,
    semPredicate: 
      http://www.w3.org/ns/org#reportsTo
    ,
    typeIsReference: 
      true
:)

  let $_ := map:put($ioptions, "reportsTo", "http://www.w3.org/ns/org#ACME")
(:
  Attribute baseSalary is stereotyped in the model as follows:: 
    resolvedType: 
      float
:)
   let $_ := map:put($model, "baseSalary", xs:float(string($salary-doc/salary))) (: type: float, req'd: false, array: false :)

(:
  Attribute hireDate is stereotyped in the model as follows:: 
    resolvedType: 
      date
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: hireDate,
      Source Mapping: hireDate,
      Mapping Attribute Notes: mm/dd/yyyy,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/431.xml,
        physicalName: hire_date
      ,
        document: /hr/employee/global/842.xml,
        physicalName: hire_date
      ,
        document: /hr/employee/global/707.xml,
        physicalName: hire_date
      ,
        document: /hr/employee/global/168.xml,
        physicalName: hire_date
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := 
      if (string-length(string($source/hireDate)) gt 0) then
        map:put($model, "hireDate", xdmp:parse-dateTime("[M01]/[D01]/[Y0001]", string($source/hireDate))) (: type: date, req'd: true, array: false :)
      else ()

(:
  Attribute lastName is stereotyped in the model as follows:: 
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: lastName,
      Source Mapping: lastName,
      Mapping Attribute Notes: null,
      Mapping Attribute Sample Data For Discovery: 
        Henckle,
        Smith
      ,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/77.xml,
        physicalName: last_name
      ,
        document: /hr/employee/global/474.xml,
        physicalName: last_name
      ,
        document: /hr/employee/global/471.xml,
        physicalName: last_name
      ,
        document: /hr/employee/global/707.xml,
        physicalName: last_name
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "lastName", string($source/lastName)) (: type: string, req'd: true, array: false :)

(:
  Attribute memberOf is stereotyped in the model as follows:: 
    reference: 
      http://com.marklogic.es.uml.hr/HR-0.0.1/Department
    ,
    relationship: 
      association
    ,
    resolvedType: 
      #/definitions/Department
    ,
    semPredicate: 
      http://www.w3.org/ns/org#memberOf
    ,
    typeIsReference: 
      true
:)

 let $_ := map:put($ioptions, "memberOf", "http://www.w3.org/ns/org#ACME")

(:
  Attribute employeeName is stereotyped in the model as follows:: 
    basedOnAttribute: 
      firstName,
      lastName
    ,
    calculation: 
        $attribute(firstName),
        \ \,
        $attribute(lastName)
    ,
    header: 
      entityName
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_Employee_employeeName($id, $model, $ioptions) 

(:
  Attribute empLabel is stereotyped in the model as follows:: 
    basedOnAttribute: 
      employeeName
    ,
    calculation: 
        $attribute(employeeName)
    ,
    isSemLabel: 
      true
    ,
    resolvedType: 
      string
    ,
    semPredicate: 
      http://xmlns.com/foaf/0.1/name
:)
   let $_ := xesgen:doCalculation_Employee_empLabel($id, $model, $ioptions) 

(:
  Attribute empIRI is stereotyped in the model as follows:: 
    basedOnAttribute: 
      employeeId
    ,
    calculation: 
        \org:e\,
        $attribute(employeeId)
    ,
    isSemIRI: 
      true
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_Employee_empIRI($id, $model, $ioptions) 

(:
  Attribute uri is stereotyped in the model as follows:: 
    basedOnAttribute: 
      employeeId
    ,
    calculation: 
        \/employee/\,
        $attribute(employeeId),
        \.xml\
    ,
    isURI: 
      true
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_Employee_uri($id, $model, $ioptions) 

   return $model
};

