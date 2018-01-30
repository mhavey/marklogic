xquery version "1.0-ml";
module namespace xmi2es = "http://marklogic.com/xmi2es"; 

import module namespace es = "http://marklogic.com/entity-services" at "/MarkLogic/entity-services/entity-services.xqy";

(: build the ES definition of a property, mapping it from UML attributes :)
declare function xmi2es:buildAttribute($xmi as node(), $class as node(), $classes as node()*, $attrib as node(),
  $findings as map:map) as node()? {

  let $msgPrefix := concat("class[", $class/@name, " ", $class/@*:id, "].attribute[", $attrib/@name, " ", $attrib/@*:id, "] -")
  let $val0 := if (string-length($attrib/@name) = 0) then xmi2es:addFinding($findings, "errors", concat($msgPrefix, "attribute has no name")) else ()

  (: reference attribute :)
  let $externalReference := string($xmi/*/*:mlProperty[string-length(@externalRef)>0 and @base_Property=$attrib/@*:id]/@externalRef)
  let $internalReference := 
    if (string-length($attrib/@type)>0) then string($classes[@*:id=$attrib/@type]/@name)
    else if (string-length($attrib/@association)>0) then string($classes[@*:id=$xmi//ownedEnd[@association=$attrib/@association]/@type]/@name) 
    else ""
  let $specialType := string($xmi/*/*:mlProperty[string-length(@mlType)>0 and @base_Property=$attrib/@*:id]/@mlType)
  let $refNode := 
    if (string-length($internalReference) > 0 ) then <es:ref>#/definitions/{$internalReference}</es:ref>
    else if ($specialType = "ref") then <es:ref>{$externalReference}</es:ref>
    else ()
  let $val1 := if (string-length($internalReference) > 0 and string-length($specialType) > 0 and $specialType != "ref") then
    xmi2es:addFinding($findings, "warnings", concat($msgPrefix, "conflict: internal class reference vs. special type ", $internalReference, " vs ", $specialType)) else ()
  let $val2 := if ($specialType="ref" and string-length($externalReference) = 0 and string-length($internalReference) = 0) then
    xmi2es:addFinding($findings, "warnings", concat($msgPrefix, "unable to resolve reference; you must link to an internal class or provide external ref")) else ()

  let $hint1 := 
    if ($attrib/@aggregation = "shared") then 
      xmi2es:addFinding($findings, "hints", concat($msgPrefix, "this reference is shared aggregation")) 
    else if ($attrib/@aggregation = "composite") then 
      xmi2es:addFinding($findings, "hints", concat($msgPrefix, "this reference is composition")) 
    else if (string-length($attrib/@association) > 0) then
      let $assocClass := string($classes[@*:id=$attrib/@association]/@name)
      return 
        if (string-length($assocClass) > 0) then 
          xmi2es:addFinding($findings, "hints", concat($msgPrefix, "this reference has association class ", $assocClass)) 
        else
          xmi2es:addFinding($findings, "hints", concat($msgPrefix, "this reference is association"))         
    else ()

  (: primitive attribute :)
  let $collation := string($xmi/*/*:mlProperty[string-length(@collation)>0 and @base_Property=$attrib/@*:id]/@collation)
  let $umlPrimitiveType := $attrib/type/@href  
  let $umlPrimitiveToML := 
    if (ends-with($umlPrimitiveType, "#String") = true()) then "string"
    else if (ends-with($umlPrimitiveType, "#Boolean") = true()) then "boolean"
    else if (ends-with($umlPrimitiveType, "#Real") = true()) then "float"
    else if (ends-with($umlPrimitiveType, "#Integer") = true()) then "int"
    else ""    
  let $resolvedMLDataType := 
    if (count($refNode) > 0) then ""
    else if (string-length($specialType) = 0) then $umlPrimitiveToML
    else $specialType    
  let $val3 := if (count($refNode)=0 and string-length($resolvedMLDataType) = 0) then 
    xmi2es:addFinding($findings, "warnings", concat($msgPrefix, "unable to resolve data type ", $umlPrimitiveType)) else ()
  let $val4 := if (string-length($collation) > 0 and $resolvedMLDataType != "string") then
    xmi2es:addFinding($findings, "warnings", concat($msgPrefix, "collation provided for non-string datatype")) else ()
  let $typeNode := 
    if (count($refNode) > 0) then $refNode
    else (<es:datatype>{$resolvedMLDataType}</es:datatype>,
      if (string-length($collation) > 0) then <es:collation>{$collation}</es:collation> else ())

  let $isArray := count($attrib/upperValue[@value="*"])=1
  let $attribDescription := <es:description>{string($attrib/ownedComment/@body)}</es:description>
  return if (string-length($attrib/@name) = 0) then () else
    element {$attrib/@name} { 
      if ($isArray = true()) then 
        (<es:datatype>array</es:datatype>,<es:items>{$typeNode}</es:items>,$attribDescription)
      else 
        ($typeNode, $attribDescription)
    }
};

(: 
Determine the attributes and PK of a given class, taking into account ancestor classes wrt generalization
:)
declare function xmi2es:resolveAttributes($xmi as node(), $class as node(), $classes as node()*, 
  $attribs as node()*, $pks as node()*) as node()* {

  let $myAttribs := $class/ownedAttribute[string-length(@name)>0]
  let $resolvedPKs := 
    if (count($pks) = 0) then $xmi/*/*:PK[@base_Property = $myAttribs/@*:id] 
    else $pks
  let $resolvedAttribs := $attribs | ($myAttribs except $myAttribs[@name = $attribs/@name])
  let $parentClass := $classes[@*:id=$class/generalization[1]/@general]
  return 
    if (count($parentClass) = 0) then 
      <resolvedAttribs>
        <attribs>{$resolvedAttribs}</attribs>
        <pks>{$resolvedPKs}</pks>
      </resolvedAttribs>
    else xmi2es:resolveAttributes($xmi, $parentClass, $classes, $resolvedAttribs, $resolvedPKs)
};
    
(: build the ES definition of an entity, mapping it from UML class :)
declare function xmi2es:buildClass($xmi as node(), $class as node(), $classes as node()*, $rootNamespace as node()*,
 $findings as map:map) as node()? {

   (: basic validations whose failure means error :)
  let $msgPrefix := concat("class[", $class/@name, " ", $class/@*:id, "] - ")
  let $val0 := if (string-length($class/@name) = 0) then xmi2es:addFinding($findings, "errors", concat($msgPrefix, "class has no name")) else ()
  let $val2 := if (count($class/generalization)>1) then xmi2es:addFinding($findings, "errors", concat($msgPrefix, "class inherits from more than one class; unsupported")) else ()

  (: namespace - if I have one use it; otherwise, use package-level, if it exists; inheritance does NOT affect namespace :)
  let $classNamespace := $xmi/*/*:namespace[@base_Class=$class/@*:id]
  let $resolvedNamespace :=
    if (count($classNamespace) = 1) then $classNamespace
    else $rootNamespace

  (: attributes - mine, plus those of classes that I inherit from :)
  let $resolvedAttribStructure := xmi2es:resolveAttributes($xmi, $class, $classes, (), ())
  let $resolvedAttribs := $resolvedAttribStructure/attribs/*
  let $val3 := if (count($resolvedAttribs) = 0) then xmi2es:addFinding($findings, "warnings", concat($msgPrefix, "class has no attributes")) else ()

  (: pk - if I define, use it; else use parent's if any :)
  let $pks := $resolvedAttribStructure/pks/*
  let $val4 := if (count($pks) > 1) then xmi2es:addFinding($findings, "warnings", concat($msgPrefix, "class has more than one PK")) else ()

  let $indexes := $xmi/*/*:rangeIndex[@base_Property = $resolvedAttribs/@*:id]
  let $lexicons := $indexes[@indexType="lexicon"]
  let $pathIndexes := $indexes[@indexType="path"]
  let $elementIndexes := $indexes[not(@indexType="lexicon" or @indexType="path")]
  let $requireds := $resolvedAttribs[not(exists(lowerValue))]/@name

  let $classDescription := string($class/ownedComment/@body)

  let $classDescriptor := if (string-length($class/@name)= 0) then () else element {$class/@name} {( 
    <es:properties>{
      for $attrib in $resolvedAttribs 
        let $attribRet := xmi2es:buildAttribute($xmi, $class, $classes, $attrib, $findings)
        return $attribRet
    }</es:properties>,

    for $required in $requireds return <es:required>{string($required)}</es:required>,

    if (count($pks) = 1) then 
      <es:primary-key>{string($xmi//ownedAttribute[@*:id=$pks[1]/@base_Property]/@name)}</es:primary-key> 
    else (),

    if (count($resolvedNamespace) = 1) then
      (<es:namespace>{$resolvedNamespace/@url}</es:namespace>,
       <es:namespace-prefix>{$resolvedNamespace/@prefix}</es:namespace-prefix>)  
    else  (),

    for $pathIndex in $pathIndexes return 
      <es:path-range-index>
       {string($xmi//ownedAttribute[@*:id=$pathIndex/@base_Property]/@name)}
      </es:path-range-index>,

    for $elementIndex in $elementIndexes return 
    <es:element-range-index>
       {string($xmi//ownedAttribute[@*:id=$elementIndex/@base_Property]/@name)}
    </es:element-range-index>,

    for $lexicon in $lexicons return 
    <es:word-lexicon>
       {string($xmi//ownedAttribute[@*:id=$lexicon/@base_Property]/@name)}
    </es:word-lexicon>,

    <es:description>{$classDescription}</es:description>
  )}
  return $classDescriptor 
};

declare function xmi2es:isEsValid($descriptor as node()) as xs:boolean {
  try {
    let $validatedDescriptor := es:model-validate($descriptor) 
    return true()
  }
  catch($exception) {
    let $dummy :=  ""
    return false()
  }    
};

(: 
add errors, warning, hint finding to our running maps
:)
declare function xmi2es:addFinding($findings as map:map, $findingType as xs:string, $msg as xs:string) {
  let $findingList := if (count(map:get($findings, $findingType))=0) then map:map() else map:get($findings, $findingType)
  let $newEntry := map:put($findingList, $msg, "")
  let $updatedList := map:put($findings, $findingType, $findingList)
  return ()
};

(: 
main xmi to ES descriptor function, Pass in XMI. Get back a sequence of:
1. The ES descriptor in XML format. Will be incomplete if there are issues.
2. A list of warnings, errors, and hints discovered by this function.
3. A flag indicating whether the ES component of ML validates the descriptor in #1.
:)
declare function xmi2es:xmi2es($xmi as node()) as node()* {
  let $findings := map:map()
  let $model := $xmi/*/*:Model
  let $modelName := string($model/@name)
  let $modelTags := $xmi/*/*:mlModel
  let $version := string($modelTags/@version)
  let $baseUri := string($modelTags/@baseUri)
  let $description := string($model/ownedComment/@body)
  let $rootNamespace := $xmi/*/*:namespace[@base_Package=$model/@*:id]
  let $classes := $model//packagedElement[@*:type="uml:Class" or @*:type="uml:AssociationClass"]

  let $val1 := if (count($model) != 1) then xmi2es:addFinding($findings, "errors", concat("model not found ", count($model))) else ()
  let $val2 := if (string-length($version) = 0) then xmi2es:addFinding($findings, "warnings", "model version not found") else ()
  let $val3 := if (count($classes) = 0) then xmi2es:addFinding($findings, "errors", "no classes found in model") else ()

  let $descriptor := 
    <es:model>
      <es:info>{(
        <es:title>{$modelName}</es:title>,
        <es:version>{$version}</es:version>,
        if (string-length($baseUri) > 0) then
          <es:base-uri>{$baseUri}</es:base-uri>
        else (),
        <es:description>{$description}</es:description>
      )}</es:info>
      <es:definitions>
       {for $class in $classes return xmi2es:buildClass($xmi, $class, $classes, $rootNamespace, $findings)}
      </es:definitions>
    </es:model>

  (: validate against ES :)
  let $esValidated := xmi2es:isEsValid($descriptor)

  (: return the descriptor,findings, ES validation status :)
  return ($descriptor, <findings validationStatus="{$esValidated}"> 
    <hints>{
      let $hints := map:get($findings, "hints")
      let $msgs := map:keys($hints)
      for $msg in $msgs return <hint>{$msg}</hint>
    }</hints>
    <warnings>{
      let $warnings := map:get($findings, "warnings")
      let $msgs := map:keys($warnings)
      for $msg in $msgs return <warning>{$msg}</warning>
    }</warnings>
    <errors>{
      let $errors := map:get($findings, "errors")
      let $msgs := map:keys($errors)
      for $msg in $msgs return <error>{$msg}</error>
    }</errors>
    </findings>)
};

declare function xmi2es:transform(
  $content as map:map,
  $context as map:map
) as map:map* {
  let $xmiURI := map:get($content, "uri")
  let $xmi := map:get($content, "value")
  let $docName := substring-after($xmiURI,"/xmi2es/xmi/") 
  let $transformResult := xmi2es:xmi2es($xmi)
  let $modelDesc := fn:subsequence($transformResult, 1, 1)
  let $findings := fn:subsequence($transformResult, 2, 1)
  let $modelDescMap := map:map()
  let $modelDescURI := map:put($modelDescMap, "uri", concat("/xmi2es/es/", $docName))
  let $modelDescValue := map:put($modelDescMap, "value", $modelDesc)
  let $findingsMap := map:map()
  let $findingsURI := map:put($findingsMap, "uri", concat("/xmi2es/findings/", $docName))
  let $findingsValue := map:put($findingsMap, "value", $findings)
  return ($content, $modelDescMap, $findingsMap) 
};
