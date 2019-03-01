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

module namespace plugin = "http://marklogic.com/data-hub/plugins/Bxj";

import module namespace xesgen = "http://jude.org/maudle/Maudle-0.0.1" at "/modelgen/Maudle/lib.xqy" ;

declare option xdmp:mapping 'false';


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

let $sampleData := $source/data


(:
  Attribute b is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "b", "Bxjb") (: type: string, req'd: true, array: false :)

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
(:
  Attribute id is stereotyped in the model as follows:: 
    resolvedType: 
      string
:)
   let $_ := map:put($model, "id", "Bxj" || $sampleData) (: type: string, req'd: true, array: false :)

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
