xquery version "1.0-ml";

module namespace gen  = "http://com.marklogic.es.uml.hr/dhfGen";

declare function gen:createEmployeeTriples(
  $id as xs:string,
  $content as item()?,
  $headers as item()*,
  $options as map:map) as sem:triple* {
  	()
};

declare function gen:createDepartmentTriples(
  $id as xs:string,
  $content as item()?,
  $headers as item()*,
  $options as map:map) as sem:triple* {
  	()
};

declare function gen:writeEmployee(
  $id as xs:string,
  $envelope as node(),
  $options as map:map) as empty-sequence() {
	()
};

declare function gen:writeDepartment(
  $id as xs:string,
  $envelope as node(),
  $options as map:map) as empty-sequence() {
	()
};

declare function gen:createEmployeeContent(
  $id as xs:string,
  $options as map:map, 
  $mapper as xdmp:function ) as node()? {
	()
};

declare function gen:createDepartmentContent(
  $id as xs:string,
  $options as map:map,
  $mapper as xdmp:function ) as node()? {
	()
};

declare function gen:createEmployeeHeaders(
	$id as xs:string,
  $content as item()?,
  $options as map:map) as node()*
{
	()
};

declare function gen:createDepartmentHeaders(
	$id as xs:string,
  $content as item()?,
  $options as map:map) as node()*
{
	()
};

