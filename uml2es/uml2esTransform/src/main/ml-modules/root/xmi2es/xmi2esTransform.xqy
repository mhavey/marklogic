xquery version "1.0-ml";
module namespace xmi2es = "http://marklogic.com/xmi2es"; 

import module namespace es = "http://marklogic.com/entity-services" at "/MarkLogic/entity-services/entity-services.xqy";
import module namespace pt = "http://marklogic.com/xmi2es/problemTracker" at "/xmi2es/problemTracker.xqy";
import module namespace xes = "http://marklogic.com/xmi2es/extender" at "/xmi2es/extender.xqy";

(: 
Main xmi to ES descriptor function, Pass in XMI. Return descriptor,findings, ES validation status.
:)
declare function xmi2es:xmi2es($xmi as node()) {
  let $problems := pt:init()
  let $xmodel := xes:init($problems)
  let $profileForm := xmi2es:buildModel($xmi, $problems)

  (:
  We will use a 2-pass approach. Pass 1 is to gather all the stuff we need from the XMI. 
  We produce an xml structure based on the "profile form" of the model. 
  In pass 2, we transform profile form to ES descriptor, and also derive model extensions 
  and SEM codegen.
  :)

  (: if there is no model, we're in a bad way :)
  return
    if (not(exists($profileForm))) then ()
    else
      let $_ := xes:transform($xmodel, $profileForm)
      let $descriptor := xes:getDescriptor($xmodel)
      let $val := xmi2es:isEsValid($descriptor)
      let $_ := 
        if (count($val) eq 1) then pt:addProblem($problems, (), (), $pt:MODEL-INVALID, ())
        else()

      (: return the descriptor,findings, ES validation status :)
      return 
        ($descriptor, $xmodel, pt:dumpProblems($problems), $val)
};


(:
On ingest of XMI model, transform to ES. Along with ingest of XMI model, also ingest
a) ES model descriptor
b) Findings/problems
c) ES validation problems (if any)
d) Model extension as turtle 
e) Model extension as text comment
f) SEM triple code gen
:)
declare function xmi2es:transform(
  $content as map:map,
  $context as map:map
) as map:map* {
  let $xmiURI := map:get($content, "uri")
  let $xmi := map:get($content, "value")
  let $docName := substring-before(substring-after($xmiURI,"/xmi2es/xmi/"), ".xml")
  let $transformResult := xmi2es:xmi2es($xmi)

  let $modelDescMap := map:new((
    map:entry("uri", concat("/xmi2es/es/", $docName, ".json")),
    map:entry("value", xdmp:to-json($transformResult[1]))
  ))
  let $findingsMap := map:new((
    map:entry("uri", concat("/xmi2es/findings/", $docName, ".xml")),
    map:entry("value", $transformResult[3])
  ))
  let $valMap := 
    if (count($transformResult[4]) eq 1) then map:new((
      map:entry("uri", concat("/xmi2es/esval/", $docName, ".xml")),
      map:entry("value", $transformResult[4])
    ))
    else ()
  let $xmodel := $transformResult[2]
  let $extensions := xes:generateModelExtension($xmodel)
  let $extensionTurtleMap := 
    if (count($extensions) eq 2) then map:new((
      map:entry("uri", concat("/xmi2es/extension/", $docName, ".ttl")),
      map:entry("value", text { $extensions[1] })
    ))
    else ()
  let $extensionCommentMap := 
    if (count($extensions) eq 2) then map:new((
      map:entry("uri", concat("/xmi2es/extension/", $docName, ".txt")),
      map:entry("value", text{ $extensions[2] })
    ))
    else ()
  let $semCode := xes:generateSEMCode($xmodel)
  let $semGenMap := if (count($semCode) eq 1) then map:new((
      map:entry("uri", concat("/xmi2es/semgen/", $docName, ".txt")),
      map:entry("value", text { $semCode } )
    ))
    else ()

  return ($content, $modelDescMap, $findingsMap, $valMap,
    $extensionTurtleMap, $extensionCommentMap, $semGenMap) 
};

declare function buildModel($xmi as node(), $problems) as node()? {
  let $model := $xmi/*/*:Model
  let $modelName := normalize-space(string($model/@name))
  let $modelTags := $xmi/*/*:esModel
  let $version := normalize-space(string($modelTags/@version))
  let $baseUri := normalize-space(string($modelTags/@baseUri))
  let $description := string($model/ownedComment/@body)
  let $rootNamespace := $xmi/*/*:xmlNamespace[@base_Package eq $model/@*:id]
  let $hints := $xmi/*/*:xImplHints[@base_Package eq $model/@*:id]

  return
    if (count($model) ne 1) then 
      pt:addProblem($problems, (), (), $pt:MODEL-NOT-FOUND, count($model)) 
    else 
      <Model name="{$modelName}">
        <esModel version="{$version}" baseUri="{$baseUri}"/>
        <xImplHints>{xmi2es:xImplHints("model", $hints, $problems)}</xImplHints>
        <description>{$description}</description>
        <classes>{
          (: Build each contained class. Do the non-assoc classes first, then the assocs. This is because in UML
          it is easy to inadventantly create duplicate classes when drawing an association class. In this case, we
          want the one that has type AssociationClass to come last, so it will supercede the one that is of type Class. 
          :)
          let $classes := ($model//packagedElement[@*:type eq "uml:Class"], 
            $model//packagedElement[@*:type eq "uml:AssociationClass"])
          for $class in $classes return xmi2es:buildClass($xmi, $class, $classes, $rootNamespace, $problems) 
        }</classes>
      </Model>
};

(: obtain "profile form" of attrib :)
declare function xmi2es:buildAttribute($xmi as node(), $class as node(), $attrib as node(), $problems) as node()? {

  let $attribName := fn:normalize-space($attrib/@name)
  let $attribID := $attrib/@*:id
  let $attribDescription := string($attrib/ownedComment/@body)
  let $hints := $xmi/*/*:xImplHints[@base_Property eq $attribID]
  let $exclude := exists($xmi/*/*:exclude[@base_Property eq $attribID])
  let $FK :=  exists($xmi/*/*:FK[@base_Property eq $attribID])
  let $rangeIndexElem :=  $xmi/*/*:rangeIndex[@base_Property eq $attribID]
  let $rangeIndex := 
    if (not(exists($rangeIndexElem))) then ""
    else 
      let $indexType := normalize-space($rangeIndexElem/@indexType)
      return
        if (string-length($indexType) eq 0) then "element"
        else $indexType
  let $xCalculated := $xmi/*/*:xCalculated[@base_Property eq $attrib/@*:id]/concat
  let $semProperty := normalize-space($xmi/*/*:semProperty[@base_Property eq $attribID]/@predicate)
  let $esProperty := $xmi/*/*:esProperty[@base_Property eq $attribID]
  let $isArray := count($attrib/upperValue[@value="*"]) eq 1
  let $isRequired := not(exists($attrib/lowerValue))
  let $relationship := ($attrib/@*:aggregation, if (exists($attrib/@*:association)) then "association" else ())[1]
  let $typeIsReference :=  exists($relationship) or exists($attrib/@type)
  let $type := ($attrib/*:type/@href, 
    $xmi//*:packagedElement[@*:id eq $attrib/@type]/@name, 
    $xmi//*:packagedElement[@*:id eq $xmi//*:ownedEnd[@association eq $attrib/@association]/@type]/@name)[1]
  return 
    <Attribute name="{$attribName}" id="{$attribID}" array="{$isArray}" required="{$isRequired}" 
      type="{$type}" typeIsReference="{$typeIsReference}" relationship="{$relationship}">
      <xImplHints>{xmi2es:xImplHints(concat("*",$attribName,"*",$attribID), $hints, $problems)}</xImplHints>
      <description>{$attribDescription}</description>
      <exclude>{$exclude}</exclude>
      <FK>{$FK}</FK>
      <rangeIndex>{$rangeIndex}</rangeIndex>
      <xCalculated>{for $c in $xCalculated return <item>{normalize-space($c)}</item>}</xCalculated>
      <semProperty>{$semProperty}</semProperty>
      <esProperty collation="{normalize-space($esProperty/@collation)}" 
        mlType="{normalize-space($esProperty/@mlType)}" externalRef="{normalize-space($esProperty/@externalRef)}"/> 
    </Attribute>
};

(: Determine the inherited aspects of a class. Used if there are generalizations.
This is recursive and moves UP (recurses TO ancestor)
:)
declare function xmi2es:determineInheritance($xmi as node(), $class as node(), $classes as node()*, 
  $descDef as node()?) as node()? {

  (: xDocument :)
  let $currentXDoc := $xmi/*/*:xDocument[@base_Class eq $class/@*:id]
  let $descXDoc := $descDef/xDocument
  let $xDoc := 
    if (count($descXDoc) eq 0 and count($currentXDoc) eq 0) then ()
    else (
        <collections>{
          if (count($descXDoc/collections/item) gt 0) then $descXDoc/collections/item 
          else for $c in $currentXDoc/*:collections return <item>{normalize-space($c/text())}</item>
        }</collections>,
        <permsCR>{
          if (count($descXDoc/permsCR/item) gt 0) then $descXDoc/permsCR/item
          else for $c in $currentXDoc/*:permsCR return <item>{normalize-space($c/text())}</item>
        }</permsCR>,
        <quality>{
          if (count($descXDoc/quality) gt 0) then $descXDoc/quality
          else normalize-space($currentXDoc/*:quality)
        }</quality>,
        <metadataKV>{
          if (count($descXDoc/metadataKV/item) gt 0) then $descXDoc/metadataKV/item
          else for $c in $currentXDoc/*:metadataKV return <item>normalize-space($c/text())</item>
        }</metadataKV>
      )

  (:
  SEM Types
  :)
  let $currentSEMTypes := $xmi/*/*:semType[@base_Class eq $class/@*:id]/*:types/text()
  let $descSEMTypes := $descDef/semTypes/item
  let $semTypes := 
    if (count($descSEMTypes) eq 0 and count($currentSEMTypes) eq 0) then ()
    else 
        if (count($descSEMTypes) gt 0) then $descSEMTypes 
        else for $c in $currentSEMTypes return <item>{normalize-space($c)}</item>

  (:
  Attributes
  :)
  let $currentAttribs := $class/*:ownedAttribute[string-length(normalize-space(@name)) gt 0]
  let $resolvedAttribs := $descDef/attributes/*:ownedAttribute | 
    ($currentAttribs except $currentAttribs[@name eq $descDef/attributes/*:ownedAttribute/@name])
  let $resolvedPKs := 
    if (count($descDef/pks/item) eq 0) then 
      for $id in $xmi/*/*:PK[@base_Property eq $currentAttribs/@*:id] return
        <item>{normalize-space($xmi//ownedAttribute[@*:id eq $id/@base_Property]/@name)}</item>
    else $descDef/pks/item
  let $resolvedSEMIRIs := 
    if (count($descDef/semIRIs/item) eq 0) then 
      for $id in $xmi/*/*:semIRI[@base_Property eq $currentAttribs/@*:id] return 
        <item>{normalize-space($xmi//ownedAttribute[@*:id eq $id/@base_Property]/@name)}</item>
    else $descDef/semIRIs/item
  let $resolvedSEMLabels := 
    if (count($descDef/semLabels/item) eq 0) then 
      for $id in $xmi/*/*:semLabel[@base_Property eq $currentAttribs/@*:id] return
        <item>{normalize-space($xmi//ownedAttribute[@*:id eq $id/@base_Property]/@name)}</item>
    else $descDef/semLabels/item
  let $resolvedXBizKeys := 
    if (count($descDef/xBizKeys/item) eq 0) then 
      for $id in $xmi/*/*:zBizKey[@base_Property eq $currentAttribs/@*:id] return
        <item>{normalize-space($xmi//ownedAttribute[@*:id eq $id/@base_Property]/@name)}</item>
    else $descDef/xBizKeys/item
  let $resolvedXURIs := 
    if (count($descDef/xURIs/item) eq 0) then 
      for $id in $xmi/*/*:xURI[@base_Property eq $currentAttribs/@*:id] return 
        <item>{normalize-space($xmi//ownedAttribute[@*:id eq $id/@base_Property]/@name)}</item>
    else $descDef/xURIs/item

  let $def:= <Definition>
    <xDocument>{$xDoc}</xDocument>
    <semTypes>{$semTypes}</semTypes>
    <attributes>{$resolvedAttribs}</attributes>
    <pks>{$resolvedPKs}</pks>
    <semIRIs>{$resolvedSEMIRIs}</semIRIs>
    <semLabels>{$resolvedSEMLabels}</semLabels>
    <xBizKeys>{$resolvedXBizKeys}</xBizKeys>
    <xURIs>{$resolvedXURIs}</xURIs>
  </Definition>

  let $parentClass := $classes[@*:id eq $class/generalization[1]/@general]
  return 
    if (count($parentClass) eq 0) then $def
    else xmi2es:determineInheritance($xmi, $parentClass, $classes, $def)
};  

(: build the ES definition of an entity, mapping it from UML class :)
declare function xmi2es:buildClass($xmi as node(), $class as node(), $classes as node()*, 
  $rootNamespace as node()?, $problems) as node() {

  (: start building the class. NOTE: hints and namespace are NOT inherited. :)
  let $className := fn:normalize-space($class/@name)
  let $classID := string($class/@*:id)

  return 
    if (string-length($className) eq 0) then pt:addProblem($problems, (), $classID, $pt:CLASS-NO-NAME, "")
    else
      let $classDescription := string($class/ownedComment/@body)
      let $xmlNamespace := ($xmi/*/*:xmlNamespace[@base_Class eq $classID], $rootNamespace)[1]
      let $hints := $xmi/*/*:xImplHints[@base_Class eq $classID]
      let $exclude := exists($xmi/*/*:exclude[@base_Class eq $classID])
      let $associationClass := $class/@*:type eq "uml:AssociationClass"
      let $assocClassEnds := 
        if ($associationClass eq true()) then
          let $attribs := $xmi//*:ownedAttribute[@*:association eq $classID]
          for $a in $attribs return 
            <end attribute="{normalize-space($a/@name)}" 
            class="{normalize-space($a/../@name)}" 
            FK="{exists($xmi/*/*:FK[@base_Property eq $a/@*:id])}"/>
        else ()

      let $inheritance := xmi2es:determineInheritance($xmi, $class, $classes, ())
      let $_ := 
        if (count($class/generalization) gt 1) then 
          pt:addProblem($problems, (), concat("*", $className, "*", $classID), 
            $pt:CLASS-MULTI-INHERIT, count($class/generalization)) 
        else ()      

      return 
        <Class name="{$className}" id="{$classID}" isAssociationClass="{$associationClass}">
          <associationClass>{
            for $a in $assocClassEnds return $a
          }</associationClass>
          <xmlNamespace> {
            if (exists($xmlNamespace)) then (
              attribute {"prefix"} {normalize-space($xmlNamespace/@prefix)}, 
              attribute {"url"} {normalize-space($xmlNamespace/@url)}
            )
            else ()
          }</xmlNamespace>
          <xImplHints>{xmi2es:xImplHints(concat("*",$className,"*",$classID), $hints, $problems)}</xImplHints>
          <xDocument>{$inheritance/xDocument/*}</xDocument>
          <semTypes>{$inheritance/semTypes/item}</semTypes>
          <description>{$classDescription}</description>
          <exclude>{$exclude}</exclude>
          <pks>{$inheritance/pks/item}</pks>
          <semIRIs>{$inheritance/semIRIs/item}</semIRIs>
          <semLabels>{$inheritance/semLabels/item}</semLabels>
          <xBizKeys>{$inheritance/xBizKeys/item}</xBizKeys>
          <xURIs>{$inheritance/xURIs/item}</xURIs>
          <attributes>{(
            (: Add the attributes. If assoc class, need one attrib for each end. :)
            for $attrib in $inheritance/attributes/* return 
              xmi2es:buildAttribute($xmi, $class, $attrib, $problems),
            for $end in $assocClassEnds return 
              <Attribute name="{concat("ref", $end/@class)}" type="{$end/@class}" 
                array="false" required="true" typeIsReference="true">
                <FK>{$end/@FK}</FK>
              </Attribute> 
          )}</attributes>
        </Class>
};

(:
Capture ES validation of descriptor. Return empty sequence if valid.
:)
declare function xmi2es:isEsValid($descriptor as json:object) {
  try {
    let $validatedDescriptor := es:model-validate($descriptor) 
    return ()
  }
  catch($exception) {
    $exception
  }  
};

(:
Common utility to split comma-separated KV string to a sequence of two strings (K,V),
Nod to Dave Cassel: https://github.com/dmcassel/blog-code/blob/master/src/app/models/csv-lib.xqy
:)
declare function xmi2es:csvParse($kv as xs:string) as xs:string* {
  if ($kv) then
    if (fn:starts-with($kv, '"')) then
      let $after-quote := fn:substring($kv, 2)
      return (
        fn:substring-before($after-quote, '"'),
        xmi2es:csvParse(fn:substring-after($after-quote, '",'))
      )
    else if (fn:matches($kv, ",")) then (
      fn:substring-before($kv, ','),
      xmi2es:csvParse(fn:substring-after($kv, ','))
    )
    else 
      $kv
  else ()
};

declare function xmi2es:xImplHints($scope, $hints, $problems) as node()* {
  let $reminderHints := $hints/*:reminders
  let $hintTriples := $hints/*:triplesPO

  return (
    <reminders>{
          for $r in $reminderHints return <item>{normalize-space($r)}></item>
    }
    </reminders>,
    <triplesPO>{
      for $t in $hintTriples return 
        let $po := xmi2es:csvParse($t)
        return 
          if (count($po) eq 2) then <item predicate="{normalize-space($po[1])}" object="{normalize-space($po[2])}"/>
          else pt:addProblem($problems, (), $scope, $pt:ILLEGAL-TRIPLE-PO, $po) 
    }</triplesPO>
  )
};
