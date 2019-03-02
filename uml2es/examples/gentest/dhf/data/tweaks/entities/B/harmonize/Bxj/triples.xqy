xquery version "1.0-ml";

module namespace plugin = "http://marklogic.com/data-hub/plugins";

(:import module namespace xesgen = "http://jude.org/maudle/Maudle-0.0.1" at "/modelgen/Maudle/lib.xqy" ;:)
import module namespace util = "http://marklogic.com/xmi2es/util" at "/xmi2es/util.xqy" ;

declare namespace es = "http://marklogic.com/entity-services";

declare option xdmp:mapping "false";

(:~
 : Create Triples Plugin
 :
 : @param $id      - the identifier returned by the collector
 : @param $content - the output of your content plugin
 : @param $headers - the output of your headers plugin
 : @param $options - a map containing options. Options are sent from Java
 :
 : @return - zero or more triples
 :)
declare function plugin:create-triples(
  $id as xs:string,
  $content as item()?,
  $headers as item()*,
  $options as map:map) as sem:triple*
{
  (:
  let $ioptions := util:getIOptions($id, $options)
  return xesgen:setTriples_B($id, $content, $headers, $ioptions)
  :)
  ()

  (: TODO - nested :)
};
