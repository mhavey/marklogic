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
  return plugin:buildContent_Department($id, $source, $options, $ioptions)
};


(:
  Class Department is stereotyped in the model as follows:: 
    collections: 
      Department
    ,
    excludes: 
      http://com.marklogic.es.uml.hr/HR-0.0.1/Department/deptIRI,
      http://com.marklogic.es.uml.hr/HR-0.0.1/Department/uri
    ,
    semType: 
      http://www.w3.org/ns/org#OrganizationalUnit
  ,
  The class also has the specified mapping facts: 
    Mapping Source: DeptTable.csv,
    Mapping Notes: null,
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
      Department,
      LoadDepartment
    ,
    Possible URIs: 
      /hr/department/global/1.xml
:)
declare function plugin:buildContent_Department($id,$source,$options,$ioptions) {
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
      map:put($model, '$type', 'Department'),
      map:put($model, '$version', '0.0.1')
   )

(:
  Attribute departmentId is stereotyped in the model as follows:: 
    header: 
      entityId
    ,
    resolvedType: 
      int
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: departmentId,
      Source Mapping: dept_num,
      Mapping Attribute Notes: null,
      Mapping Attribute Sample Data For Discovery: null,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "departmentId", string($source/dept_num)) (: type: int, req'd: true, array: false :)

(:
  Attribute departmentName is stereotyped in the model as follows:: 
    header: 
      entityName
    ,
    isBizKey: 
      true
    ,
    isSemLabel: 
      true
    ,
    resolvedType: 
      string
  ,
  The attribute also has the specified mapping facts:: 
      Model Path: departmentName,
      Source Mapping: dept_name,
      Mapping Attribute Notes: null,
      Mapping Attribute Sample Data For Discovery: Sales,
      Mapping Attribute AKA For Discovery: null
  ,
  Discovery found the following:: 
    Similar to physical attribute in candidate document: ,
    Similar to physical predicate in candidate document: 
:)
   let $_ := map:put($model, "departmentName", string($source/dept_name)) (: type: string, req'd: true, array: false :)

(:
  Attribute deptIRI is stereotyped in the model as follows:: 
    basedOnAttribute: 
      departmentId
    ,
    calculation: 
        \org:d\,
        $attribute(departmentId)
    ,
    isSemIRI: 
      true
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_Department_deptIRI($id, $model, $ioptions) 

(:
  Attribute uri is stereotyped in the model as follows:: 
    basedOnAttribute: 
      departmentId
    ,
    calculation: 
        \/department/\,
        $attribute(departmentId),
        \.xml\
    ,
    isURI: 
      true
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_Department_uri($id, $model, $ioptions) 

   return $model
};
