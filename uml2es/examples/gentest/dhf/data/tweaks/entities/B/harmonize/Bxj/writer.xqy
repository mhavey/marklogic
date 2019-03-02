xquery version "1.0-ml";

module namespace plugin = "http://marklogic.com/data-hub/plugins";

import module namespace xesgen = "http://jude.org/maudle/Maudle-0.0.1" at "/modelgen/Maudle/lib.xqy" ;
import module namespace util = "http://marklogic.com/xmi2es/util" at "/xmi2es/util.xqy" ;

declare option xdmp:mapping "false";

(:~
 : Writer Plugin
 :
 : @param $id       - the identifier returned by the collector
 : @param $envelope - the final envelope
 : @param $options  - a map containing options. Options are sent from Java
 :
 : @return - nothing
 :)
declare function plugin:write(
  $id as xs:string,
  $envelope as item(),
  $content,
  $options as map:map) as empty-sequence()
{
  (
     xesgen:runWriter_B($id, $envelope, $content, util:getIOptions($id,$options))
     (:xdmp:document-insert($id, $envelope, xdmp:default-permissions(), map:get($options, "entity")):)
     , util:removeIOptions($id,$options)
  )
};
