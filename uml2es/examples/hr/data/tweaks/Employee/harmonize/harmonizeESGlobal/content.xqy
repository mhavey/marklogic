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
    Mapping URI: /xmi2es/excel-mapper/global-mapping.json,
    Overall Mapping Source: GlobalCorp HR Data,
    Overall Mapping Notes: CSV Files Containing Employee, Department, and Salary Data
  ,
  Comments below include discovery findings. See the full report at this URI:: /xmi2es/discovery/global-mapping.json
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
    Mapping Source: 
      EmployeeTable.csv (Primary),
      SalaryTable.csv (Additional)
    ,
    Mapping Notes: Notice we map addresses inline. We could also have split them into a separate sheet. Inline makes more sense here. Same for phones and emails.,
    Mapping Collections For Discovery: null,
    Mapping URI Patterns For Discovery: null,
    Mapping Sample Data For Discovery: null
  ,
  Discovery found the following:: 
    Documents whose structure resembles the model: 
        doc: /hr/salary/global/104.xml,
        numMatches: 7
      ,
        doc: /hr/salary/global/335.xml,
        numMatches: 7
      ,
        doc: /hr/salary/global/858.xml,
        numMatches: 7
      ,
        doc: /hr/salary/global/840.xml,
        numMatches: 7
    ,
    Possible collections: 
      Employee,
      LoadEmployee
    ,
    Possible URIs: 
      /hr/employee/global/171.xml,
      /hr/employee/global/270.xml,
      /hr/employee/global/370.xml,
      /hr/employee/global/56.xml,
      /hr/employee/global/690.xml,
      /hr/employee/global/712.xml,
      /hr/employee/global/884.xml
:)
declare function plugin:buildContent_Employee($id,$source,$options,$ioptions) {
   let $source :=
      if ($source/*:envelope and $source/node() instance of element()) then
         $source/*:envelope/*:instance/node()
      else if ($source/*:envelope) then
         $source/*:envelope/*:instance
      else if ($source/instance) then
         $source/instance
      else
         $source
   let $model := json:object()
   let $_ := (
      map:put($model, '$type', 'Employee'),
      map:put($model, '$version', '0.0.1')
   )

   let $salary-doc := fn:doc(concat("/hr/salary/global/", string($source/emp_id), ".xml"))//*:instance/node()
(:
  Attribute addresses is stereotyped in the model as follows:: 
    reference: 
      http://com.marklogic.es.uml.hr/HR-0.0.1/Address
    ,
    resolvedType: 
      #/definitions/Address
    ,
    typeIsReference: 
      true
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: addresses.addressType,
      Source Mapping: \Primary\,
      Mapping Attribute Notes: constant,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: addresses.city,
      Source Mapping: city,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: addresses.country,
      Source Mapping: \USA\,
      Mapping Attribute Notes: constant,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: addresses.geoCoordinates.latitute,
      Source Mapping: latitude,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: addresses.geoCoordinates.longitude,
      Source Mapping: longitude,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: addresses.lines,
      Source Mapping: addr1, addr2,
      Mapping Attribute Notes: EmployeeTable, array,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: addresses.state,
      Source Mapping: states,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: addresses.zip,
      Source Mapping: zip,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "addresses", json:array())
   let $_ := for $x in 1 to 1 return json:array-push(map:get($model, "addresses"), plugin:buildContent_Address($id,$source,$options,$ioptions))

(:
  Attribute firstName is stereotyped in the model as follows:: 
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: firstName,
      Source Mapping: first_name,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: Larry,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/132.xml,
        physicalName: first_name
      ,
        document: /hr/employee/global/50.xml,
        physicalName: first_name
      ,
        document: /hr/employee/global/830.xml,
        physicalName: first_name
      ,
        document: /hr/employee/global/42.xml,
        physicalName: first_name
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "firstName", string($source/first_name)) (: type: string, req'd: true, array: false :)

(:
  Attribute bonus is stereotyped in the model as follows:: 
    resolvedType: 
      float
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: bonus,
      Source Mapping: bonus from salary,
      Mapping Attribute Notes: SalaryTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/salary/global/329.xml,
        physicalName: bonus
      ,
        document: /hr/salary/global/151.xml,
        physicalName: bonus
      ,
        document: /hr/salary/global/204.xml,
        physicalName: bonus
      ,
        document: /hr/salary/global/483.xml,
        physicalName: bonus
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := 
    if (string-length(string($salary-doc/bonus)) gt 0) then
      map:put($model, "bonus", xs:float(string($salary-doc/bonus))) (: type: float, req'd: false, array: false :)
    else ()


(:
  Attribute dateOfBirth is stereotyped in the model as follows:: 
    resolvedType: 
      date
:)
   let $_ := 
    if (string-length(string($source/dob)) gt 0) then 
      map:put($model, "dateOfBirth", xdmp:parse-dateTime("[M01]/[D01]/[Y0001]", string($source/dob))) (: type: date, req'd: true, array: false :)
    else ()

(:
  Attribute effectiveDate is stereotyped in the model as follows:: 
    resolvedType: 
      date
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: effectiveDate,
      Source Mapping: job_effective_date from salary,
      Mapping Attribute Notes: SalaryTable, date format,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := 
    if (string-length(string($salary-doc/job_effective_date)) gt 0) then 
      map:put($model, "effectiveDate", xdmp:parse-dateTime("[M01]/[D01]/[Y0001]", string($salary-doc/job_effective_date))) (: type: date, req'd: true, array: false :)
    else ()


(:
  Attribute emails is stereotyped in the model as follows:: 
    reference: 
      http://com.marklogic.es.uml.hr/HR-0.0.1/Email
    ,
    resolvedType: 
      #/definitions/Email
    ,
    typeIsReference: 
      true
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: emails.emailAddress,
      Source Mapping: home_email, work_email,
      Mapping Attribute Notes: EmployeeTable, 2,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $email-spec := (("home", "home_email"), ("work", "work_email"))
   let $_ := map:put($model, "emails", json:array())
   let $_ := for $a at $pos in $email-spec return 
      if (($pos mod 2) eq 0) then
          let $email-type := $email-spec[$pos - 1]
          let $email-field := $email-spec[$pos]
          let $email-value := $source/*[name()=$email-field] ! xs:string(.) 
          return 
              if (string-length($email-value) gt 0) then 
              json:array-push(map:get($model, "emails"), 
                plugin:buildContent_Email($id,$email-type, $email-value,$options,$ioptions))
              else ()
      else ()

(:
  Attribute title is stereotyped in the model as follows:: 
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: title,
      Source Mapping: job_title,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "title", string($source/job_title)) (: type: string, req'd: false, array: false :)

(:
  Attribute status is stereotyped in the model as follows:: 
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: status,
      Source Mapping: status from salary,
      Mapping Attribute Notes: SalaryTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/salary/global/483.xml,
        physicalName: status
      ,
        document: /hr/salary/global/204.xml,
        physicalName: status
      ,
        document: /hr/salary/global/840.xml,
        physicalName: status
      ,
        document: /hr/salary/global/297.xml,
        physicalName: status
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "status", string($salary-doc/status)) (: type: string, req'd: true, array: false :)

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
      Source Mapping: emp_id,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "employeeId", string($source/emp_id)) (: type: int, req'd: true, array: false :)

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
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: reportsTo,
      Source Mapping: reports_to,
      Mapping Attribute Notes: 
        EmployeeTable,
        Make IRI based on this
      ,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/782.xml,
        physicalName: reports_to
      ,
        document: /hr/employee/global/550.xml,
        physicalName: reports_to
      ,
        document: /hr/employee/global/50.xml,
        physicalName: reports_to
      ,
        document: /hr/employee/global/725.xml,
        physicalName: reports_to
    ,
    Similar to physical predicate in candidate document: 
:)
  let $_ := 
    if (exists($source/reports_to)) then map:put($ioptions, "reportsTo", concat("http://www.w3.org/ns/org#e", string($source/reports_to)))
    else()

(:
  Attribute baseSalary is stereotyped in the model as follows:: 
    resolvedType: 
      float
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: baseSalary,
      Source Mapping: base_salary from salary,
      Mapping Attribute Notes: SalaryTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/salary/global/104.xml,
        physicalName: base_salary
      ,
        document: /hr/salary/global/68.xml,
        physicalName: base_salary
      ,
        document: /hr/salary/global/204.xml,
        physicalName: base_salary
      ,
        document: /hr/salary/global/687.xml,
        physicalName: base_salary
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "baseSalary", xs:float($salary-doc/base_salary)) (: type: float, req'd: false, array: false :)

(:
  Attribute hireDate is stereotyped in the model as follows:: 
    resolvedType: 
      date
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: hireDate,
      Source Mapping: hire_date,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/915.xml,
        physicalName: hire_date
      ,
        document: /hr/employee/global/830.xml,
        physicalName: hire_date
      ,
        document: /hr/employee/global/50.xml,
        physicalName: hire_date
      ,
        document: /hr/employee/global/553.xml,
        physicalName: hire_date
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := 
    if (string-length(($source/hire_date)) gt 0) then
      map:put($model, "hireDate", xdmp:parse-dateTime("[M01]/[D01]/[Y0001]", string($source/hire_date))) (: type: date, req'd: true, array: false :)
    else ()
(:
  Attribute lastName is stereotyped in the model as follows:: 
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: lastName,
      Source Mapping: last_name,
      Mapping Attribute Notes: EmployeeTable,
      Mapping Attribute Sample Data For Discovery: Fields,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: 
        document: /hr/employee/global/382.xml,
        physicalName: last_name
      ,
        document: /hr/employee/global/725.xml,
        physicalName: last_name
      ,
        document: /hr/employee/global/782.xml,
        physicalName: last_name
      ,
        document: /hr/employee/global/132.xml,
        physicalName: last_name
    ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "lastName", string($source/last_name)) (: type: string, req'd: true, array: false :)

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
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: memberOf,
      Source Mapping: dept_num,
      Mapping Attribute Notes: 
        EmployeeTable,
        Make IRI based on this
      ,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)

  let $_ := 
    if (exists($source/dept_num)) then map:put($ioptions, "memberOf", concat("http://www.w3.org/ns/org#d", string($source/dept_num)))
    else()

(:
  Attribute phones is stereotyped in the model as follows:: 
    reference: 
      http://com.marklogic.es.uml.hr/HR-0.0.1/Phone
    ,
    resolvedType: 
      #/definitions/Phone
    ,
    typeIsReference: 
      true
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: phones.phoneType,
      Source Mapping: \home\, \mobile\, \pager\ ,\work\,
      Mapping Attribute Notes: constant, 4,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
    ,
      Model Path: phones.phoneValue,
      Source Mapping: home_phone, mobile, pager, work_phone,
      Mapping Attribute Notes: EmployeeTable, 4,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $phone-spec := (("home", "home_phone"), ("mobile", "mobile"), ("pager", "pager"), ("work", "work_phone"))   let $_ := map:put($model, "phones", json:array())
   let $_ := for $p at $pos in $phone-spec return 
      if (($pos mod 2) eq 0) then
          let $phone-type := $phone-spec[$pos - 1]
          let $phone-field := $phone-spec[$pos]
          let $phone-value := $source/*[name()=$phone-field] ! xs:string(.) 
          return 
              if (string-length($phone-value) gt 0) then 
              json:array-push(map:get($model, "phones"), plugin:buildContent_Phone($id,$phone-type, $phone-value,$options,$ioptions))
              else ()
      else ()

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
(:
  Class Address is stereotyped in the model as follows:: 
:)
declare function plugin:buildContent_Address($id,$source,$options,$ioptions) {
   let $source :=
      if ($source/*:envelope and $source/node() instance of element()) then
         $source/*:envelope/*:instance/node()
      else if ($source/*:envelope) then
         $source/*:envelope/*:instance
      else if ($source/instance) then
         $source/instance
      else
         $source
   let $model := json:object()
   let $_ := (
      map:put($model, '$type', 'Address'),
      map:put($model, '$version', '0.0.1')
   )

   (:
   Attribute addressType is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "addressType", "Primary") (: type: string, req'd: true, array: false :)

   (:
   Attribute city is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "city", string($source/city)) (: type: string, req'd: true, array: false :)

   (:
   Attribute country is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "country", "USA") (: type: string, req'd: true, array: false :)

   (:
   Attribute geoCoordinates is stereotyped in the model as follows:
    reference:
      http://com.marklogic.es.uml.hr/HR-0.0.1/GeoCoordinates
    resolvedType:
      #/definitions/GeoCoordinates
    typeIsReference:
      true
   :)
   let $_ := map:put($model, "geoCoordinates", plugin:buildContent_GeoCoordinates($id,$source,$options,$ioptions))

   (:
   Attribute lines is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "lines", json:to-array((string($source/addr1), string($source/addr2)))) (: type: string, req'd: true, array: true :)

   (:
   Attribute state is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "state", string($source/state)) (: type: string, req'd: true, array: false :)

   (:
   Attribute zip is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "zip", string($source/zip)) (: type: string, req'd: true, array: false :)

   return $model
};
(:
  Class Email is stereotyped in the model as follows:: 
:)
declare function plugin:buildContent_Email($id,$email-type, $email-value,$options,$ioptions) {
   let $model := json:object()
   let $_ := (
      map:put($model, '$type', 'Email'),
      map:put($model, '$version', '0.0.1')
   )

   (:
   Attribute emailAddress is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "emailAddress", $email-value) (: type: string, req'd: true, array: false :)

   (:
   Attribute emailType is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "emailType", $email-type) (: type: string, req'd: true, array: false :)

   return $model
};
(:
  Class Phone is stereotyped in the model as follows:: 
:)
declare function plugin:buildContent_Phone($id,$phone-type, $phone-value,$options,$ioptions) {
   let $model := json:object()
   let $_ := (
      map:put($model, '$type', 'Phone'),
      map:put($model, '$version', '0.0.1')
   )

   (:
   Attribute phoneNumber is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "phoneNumber", $phone-value) (: type: string, req'd: true, array: false :)

   (:
   Attribute phoneType is stereotyped in the model as follows:
    resolvedType:
      string
   :)
   let $_ := map:put($model, "phoneType", $phone-type) (: type: string, req'd: true, array: false :)

   return $model
};
(:
Class GeoCoordinates is stereotyped in the model as follows:
:)
declare function plugin:buildContent_GeoCoordinates($id,$source,$options,$ioptions) {
   let $source :=
      if ($source/*:envelope and $source/node() instance of element()) then
         $source/*:envelope/*:instance/node()
      else if ($source/*:envelope) then
         $source/*:envelope/*:instance
      else if ($source/instance) then
         $source/instance
      else
         $source
   let $model := json:object()
   let $_ := (
      map:put($model, '$type', 'GeoCoordinates'),
      map:put($model, '$version', '0.0.1')
   )

   (:
   Attribute latitude is stereotyped in the model as follows:
    resolvedType:
      float
   :)
   let $_ := map:put($model, "latitude", string($source/latitude)) (: type: float, req'd: true, array: false :)

   (:
   Attribute longitude is stereotyped in the model as follows:
    resolvedType:
      float
   :)
   let $_ := map:put($model, "longitude", string($source/longitude)) (: type: float, req'd: true, array: false :)

   return $model
};
