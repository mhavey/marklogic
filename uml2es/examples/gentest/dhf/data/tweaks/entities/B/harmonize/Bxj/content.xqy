(:
  Model http://jude.org/maudle/Maudle-0.0.1 is stereotyped in the model as follows:: 
    hasFunction: 
      doCalculation_A_uri,
      doCalculation_B_a,
      doCalculation_B_c,
      doCalculation_B_uri,
      runWriter_A,
      runWriter_B,
      setHeaders_A,
      setHeaders_B
:)

xquery version "1.0-ml";

module namespace plugin = "http://marklogic.com/data-hub/plugins";

import module namespace xesgen = "http://jude.org/maudle/Maudle-0.0.1" at "/modelgen/Maudle/lib.xqy" ;
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
  return plugin:buildContent_B($id, $source, $options, $ioptions)
};


(:
  Class B is stereotyped in the model as follows:: 
    collections: 
      B,
      Maudle
    ,
    excludes: 
      http://jude.org/maudle/Maudle-0.0.1/B/a,
      http://jude.org/maudle/Maudle-0.0.1/B/header,
      http://jude.org/maudle/Maudle-0.0.1/B/uri
:)
declare function plugin:buildContent_B($id,$source,$options,$ioptions) {
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
      map:put($model, '$type', 'B'),
      map:put($model, '$version', '0.0.1')
   )
let $data := 
  if (fn:ends-with($id, ".json")) then $source/data
  else $source/data/text()

(:
  Attribute b is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "b", "bxjb") (: type: string, req'd: true, array: false :)

(:
  Attribute format is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "format", "json") (: type: string, req'd: true, array: false :)

(:
  Attribute header is stereotyped in the model as follows:: 
    header: 
      headerFromContent
    ,
    resolvedType: 
      string
:)
(:
  Attribute id is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "id", "bxj" || $data) (: type: string, req'd: true, array: false :)

(:
  Attribute a is stereotyped in the model as follows:: 
    basedOnAttribute: 
      format
    ,
    calculation: 
        $attribute(format)
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_B_a($id, $model, $ioptions) 

(:
  Attribute c is stereotyped in the model as follows:: 
    basedOnAttribute: 
      a,
      b
    ,
    calculation: 
        $attribute(a),
        $attribute(b)
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_B_c($id, $model, $ioptions) 

(:
  Attribute uri is stereotyped in the model as follows:: 
    basedOnAttribute: 
      format,
      id
    ,
    calculation: 
        \/\,
        $attribute(id),
        \.\,
        $attribute(format)
    ,
    isURI: 
      true
    ,
    resolvedType: 
      string
:)
   let $_ := xesgen:doCalculation_B_uri($id, $model, $ioptions) 

   return $model
};
