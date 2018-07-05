xquery version "1.0-ml";

module namespace plugin = "http://marklogic.com/data-hub/plugins";

declare namespace es = "http://marklogic.com/entity-services";

import module namespace hR = "http://com.marklogic.es.uml.hr#HR-0.0.1" 
      at "/ext/entity-services/HR-0.0.1.xqy";

declare option xdmp:mapping "false";


(:
 : Create Content Plugin
 :
 : @param $id          - the identifier returned by the collector
 : @param $options     - a map containing options. Options are sent from Java
 :
 : @return - your transformed content
 :)
declare function plugin:create-content(
  $id as xs:string,
  $options as map:map) as node()?
{
   let $doc := fn:doc($id)
   let $content := hR:instance-to-canonical(hR:extract-instance-Employee($doc/es:envelope/es:instance, $options), "xml")

(: Generated Code of Type calculateds For Class Employee :)
let $empIRI:= concat("http://www.w3.org/ns/org#e",$content/employeeId)
let $_ := map:put($options, "empIRI", $empIRI)
let $employeeName:= concat($content/firstName," ",$content/lastName)
let $_ := map:put($options, "employeeName", $employeeName)
let $empLabel:= concat($employeeName)
let $_ := map:put($options, "empLabel", $empLabel)
let $uri:= concat("/employee/", employeeId, ".xml")
let $_ := map:put($options, "uri", $uri)

	(: this code is not generated; i need to build the IRI links based on my source data :)

return $content   
};

