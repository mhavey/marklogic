(:
  Model http://jude.org/maudle/Maudle-0.0.1 is stereotyped in the model as follows:: 
    hasFunction: 
      doCalculation_A_uri,
      doCalculation_B_a,
      doCalculation_B_c,
      doCalculation_B_uri,
      runWriter_A,
      runWriter_B
:)

xquery version '1.0-ml';

module namespace plugin = "http://marklogic.com/data-hub/plugins/Axj";

import module namespace xesgen = "http://jude.org/maudle/Maudle-0.0.1" at "/modelgen/Maudle/lib.xqy" ;

declare option xdmp:mapping 'false';


(:
  Class A is stereotyped in the model as follows:: 
    collections: 
      A,
      Maudle
:)
declare function plugin:buildContent_A($id,$source,$options,$ioptions) {
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
      map:put($model, '$type', 'A'),
      map:put($model, '$version', '0.0.1')
   )

let $sampleData := $source/data

(:
  Attribute format is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "format", "json") (: type: string, req'd: true, array: false :)

(:
  Attribute header is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "header", "Axj") (: type: string, req'd: true, array: false :)

(:
  Attribute id is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "id", "Axj" || $sampleData) (: type: string, req'd: true, array: false :)

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
   let $_ := xesgen:doCalculation_A_uri($id, $model, $ioptions) 

   return $model
};
