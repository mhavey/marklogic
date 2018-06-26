xquery version "1.0-ml";

module namespace plugin = "http://marklogic.com/data-hub/plugins";

import module namespace gen = "http://com.marklogic.es.uml.hr/dhfGen"
	at "/ext/hr/gen/dhfLib.xqy";

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
  $options as map:map) as node()?
{
  let $doc := fn:doc($id)
  return gen:createDepartmentContent($id, $options, $doc)
};
