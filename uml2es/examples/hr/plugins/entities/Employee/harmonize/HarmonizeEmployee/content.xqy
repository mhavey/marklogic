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
   (: pass along some fields not used in creating content by needed later :)
   let $_ := (map:put($options, "reportsTo", $doc//*:reports_to), map:put($options, "deptNum", $doc//*:dept_num))
   return hR:instance-to-canonical(hR:extract-instance-Employee($doc/es:envelope/es:instance), "xml")
};

