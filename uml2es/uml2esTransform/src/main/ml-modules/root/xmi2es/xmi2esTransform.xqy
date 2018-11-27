xquery version "1.0-ml";
module namespace xmi2es = "http://marklogic.com/xmi2es"; 

import module namespace es = "http://marklogic.com/entity-services" at "/MarkLogic/entity-services/entity-services.xqy";
import module namespace pt = "http://marklogic.com/xmi2es/problemTracker" at "/xmi2es/problemTracker.xqy";
import module namespace xes = "http://marklogic.com/xmi2es/extender" at "/xmi2es/extender.xqy";

(: 
Main xmi to ES descriptor function, Pass in XMI. Return descriptor,findings, ES validation status.
:)
declare function xmi2es:xmi2es($xmi as node(), $param as xs:string?) as map:map {
  let $problems := pt:init()
  let $xes := xes:init($problems, $param)
  let $params := xmi2es:getParams($param)
  let $descriptor := xmi2es:buildModel($xmi, $xes, $problems, $params)

  (: if there is no model, we're in a bad way :)
  return
    if (not(exists($descriptor))) then map:new((
      if(exists($problems)) then map:entry("problems", pt:dumpProblems($problems)) else ()
    ))
    else
      let $val := xmi2es:isEsValid($descriptor)
      let $_ := 
        if (count($val) eq 1) then pt:addProblem($problems, (), (), $pt:MODEL-INVALID, ())
        else()

      (: return the descriptor,findings, ES validation status :)
      return map:new((
        if(exists($descriptor)) then map:entry("descriptor", $descriptor) else (),
        if(exists($xes)) then map:entry("xmodel", $xes) else (),
        if(exists($problems)) then map:entry("problems", pt:dumpProblems($problems)) else (),
        if(exists($val)) then map:entry("esval", $val) else ()
      ))
};

(:
On ingest of XMI model, transform to ES. Along with ingest of XMI model, also ingest
a) ES model descriptor
b) Findings/problems
c) ES validation problems (if any)
d) Model extension as turtle 
e) Model extension as text comment
f) Code gen
:)
declare function xmi2es:transform(
  $content as map:map,
  $context as map:map
) as map:map* {
  let $xmiURI := map:get($content, "uri")
  let $xmi := map:get($content, "value")
  let $docName := substring-before(substring-after($xmiURI,"/xmi2es/xmi/"), ".xml")
  let $param := map:get($context, "transform_param")
  let $transformResult := xmi2es:xmi2es($xmi, $param)

  let $modelDescMap := 
    if (map:contains($transformResult, "descriptor")) then
      map:new((
        map:entry("uri", concat("/xmi2es/es/", $docName, ".json")),
        map:entry("value", xdmp:to-json(map:get($transformResult, "descriptor")))
      ))
    else ()
  let $findingsMap := 
    if (map:contains($transformResult, "problems")) then
      map:new((
        map:entry("uri", concat("/xmi2es/findings/", $docName, ".xml")),
        map:entry("value", map:get($transformResult, "problems"))
      ))
    else ()
  let $valMap := 
    if (map:contains($transformResult, "esval")) then
      map:new((
        map:entry("uri", concat("/xmi2es/esval/", $docName, ".xml")),
        map:entry("value", map:get($transformResult, "esval"))
      ))
    else ()
  let $xmodel := map:get($transformResult, "xmodel")
  let $extensions := if (exists($xmodel)) then xes:generateModelExtension($xmodel) else ()
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
  let $genCode := if (exists($xmodel)) then xes:generateCode($xmodel) else ()
  let $genMap := if (count($genCode) eq 1) then map:new((
      map:entry("uri", concat("/xmi2es/gen/", $docName, ".txt")),
      map:entry("value", text { $genCode } )
    ))
    else ()

  return ($content, $modelDescMap, $intermediateMap, $findingsMap, $valMap,
    $extensionTurtleMap, $extensionCommentMap, $genMap) 
};

declare function buildModel($xmi as node(), $xes, $problems, $params) as json:object? {
  let $_ := xdmp:log("BUILDMODEL", "info")
  let $model := $xmi/*/*:Model
  let $modelName := normalize-space(string($model/@name))
  
  return
    if (count($model) ne 1) then 
      pt:addProblem($problems, (), (), $pt:MODEL-NOT-FOUND, count($model)) 
    else if (string-length($modelName) eq 0) then 
      pt:addProblem($problems, (), (), $pt:MODEL-NO-NAME, count($model)) 
    else 
      let $modelTags := $xmi/*/*:esModel
      let $version := xes:resolveVersion($xes, normalize-space(string($modelTags/@version)))
      let $baseUri := xes:resolveBaseUri(normalize-space(string($modelTags/@baseUri)))
      let $description := string(($model/ownedComment/@body, $model/ownedComment/body)[1])
      let $rootNamespace := $xmi/*/*:xmlNamespace[@base_Package eq $model/@*:id]
      let $hints := $xmi/*/*:xImplHints[@base_Package eq $model/@*:id]
      let $semPrefixes :=  string($xmi/*/*:semPrefixes[@base_Package eq $model/@*:id]/@*:prefixesTtl)
      let $modelIRI := xes:modelIRI($xes, $modelName, $baseUri, $version)

      (: Model-level facts :)
      let $_ := (
        xes:addFact($xes, $modelIRI, $xes:PRED-SEM-PREFIXES, $semPrefixes, false()),
        xmi2es:xImplHints($modelIRI, $hints, $xes, $problems)
      )
      return
        let $descriptor := json:object()
        let $modelJson := json:object()
        let $classesJson := json:object()
        let $_ := map:put($descriptor, "info", $modelJson)
        let $_ := map:put($modelJson, "title", $modelName)
        let $_ := map:put($modelJson, "version", $version) 
        let $_ := map:put($modelJson, "baseUri", $resolvedURI) 
        let $_ := map:put($modelJson, "description", string($profileForm/description))

        let $_ := map:put($descriptor, "definitions", $classesJson)
        (: Build each contained class. Do the non-assoc classes first, then the assocs. This is because in UML
        it is easy to inadventantly create duplicate classes when drawing an association class. In this case, we
        want the one that has type AssociationClass to come last, so it will supercede the one that is of type Class. 
        :)
        let $classes := ($model//packagedElement[@*:type eq "uml:Class"], 
          $model//packagedElement[@*:type eq "uml:AssociationClass"])
        let $_ := for $class in $classes return 
          xmi2es:buildClass($xmi, $modelIRI, $classesJson, $class, $classes, $rootNamespace, $xes, $problems, $params) 

        (: need to do another pass - this time to resolve the FK :)
        let $_ := for $class in $classes return 
          xmi2es:resolveFK($xmi, $modelIRI, $classesJson, $class, $classes, $rootNamespace, $xes, $problems, $params) 

        return $descriptor
};

(: build the ES definition of an entity, mapping it from UML class :)
declare function xmi2es:buildClass($xmi as node(), $modelIRI as xs:string, $classesJson as json:object, 
  $class as node(), $classes as node()*, 
  $rootNamespace as node()?, $xes, $problems, $params) as empty-sequence() {

  let $_ := xdmp:log(concat("BUILDCLASS *", $class/@name, "*"), "info")

  (: start building the class. NOTE: hints and namespace are NOT inherited. :)
  let $className := fn:normalize-space($class/@name)
  let $classID := string($class/@*:id)

  return 
    if (string-length($className) eq 0) then pt:addProblem($problems, (), $classID, $pt:CLASS-NO-NAME, "")
    else
      let $classIRI := xes:classIRI($modelIRI, $className)
      let $classDescription := string(($class/ownedComment/@body, $class/ownedComment/body)[1])
      let $xmlNamespace := ($xmi/*/*:xmlNamespace[@base_Class eq $classID], $rootNamespace)[1]
      let $hints := $xmi/*/*:xImplHints[@base_Class eq $classID]
      let $exclude := exists($xmi/*/*:exclude[@base_Class eq $classID])
      let $inheritance := xmi2es:determineInheritance($xmi, $problems, $class, $classes, ())
      let $_ := 
        if (count($class/generalization) gt 1) then 
          pt:addProblem($problems, (), concat("*", $className, "*", $classID), 
            $pt:CLASS-MULTI-INHERIT, count($class/generalization)) 
        else ()      

        (: now we need to know all about the attributes :)
      let $associationClass := $class/@*:type eq "uml:AssociationClass"
      let $assocClassEnds := 
        if ($associationClass eq true()) then
          let $attribs := $xmi//*:ownedAttribute[@*:association eq $classID]
        else ()
      let $attributes := 
        <Attributes>{(
          for $attrib in $inheritance/attributes/* return 
            xmi2es:buildAttribute($xmi, $classIRI, $class, $attrib, $xes, $problems),
          for $end in $assocClassEnds return 
          for $a in $attribs return 
            <end attribute="{normalize-space($a/@name)}" 
            class="{normalize-space($a/../@name)}" 
            FK="{exists($xmi/*/*:FK[@base_Property eq $a/@*:id])}"/>
              <Attribute name="{concat("ref", $end/@class)}" type="{$end/@class}" 
                array="false" required="true" typeIsReference="true">
                <FK>{string($end/@FK)}</FK>
              </Attribute>)}</Attributes> 


      (: Gather the info about the class :)
      let $attribsJson := json:object()
      let $classJson := json:object()

      let $allAttribs := $class/attributes/Attribute
      let $includes := $allAttribs[exclude/text() eq false()]
      let $pks := $class/pks/item/text()[. eq $includes/@name]
      let $requireds := $includes[@required eq true()]/@name
      let $paths := $includes[string(rangeIndex) eq "path"]/@name
      let $elements :=$includes[string(rangeIndex) eq "element"]/@name
      let $lexicons := $includes[string(rangeIndex) eq "lexicon"]/@name
      let $piis := $includes[@pii eq true()]/@name

(: TODO - base class :)

    if (string-length($class/@baseClass) gt 0) then 
      xes:addFact($xes, $classIRI, $IRI-BASE_CLASS, concat(map:get($xes, "modelIRI"), "/", $class/@baseClass), true()) 
      else ()
  )








      let $_ := (
          xmi2es:xImplHints($classIRI, $hints, $xes, $problems),
          xes:addFact($xes, $classIRI, $xes:PRED-HAS-COLLECTIONS, $inheritance/xDocument/collections/item, false()),
          for $perm in $inheritance/xDocument/permsCR/item return 
            xes:addQualifiedFact($xes, $classIRI, $xes:PRED-HAS-PERM, 
              ($xes:PRED-HAS-CAPABILITY, xes:PRED-HAS-ROLE), 
              ($perm/@capability, pred/@role)),
          xes:addFact($xes, $classIRI, $xes:PRED-HAS-QUALITY, $inheritance/xDocument/quality, false()),
          for $md in $inheritance/xDocument/metadataKV/item return 
            xes:addQualifiedFact($xes, $classIRI, $xes:PRED-HAS-METADATA, 
              ($xes:PRED-HAS-KEY, xes:PRED-HAS-VALUE), 
              ($md/@key, md/@value)),
          xes:addQualifiedFact($xes, $classIRI, $xes:PRED-HAS-METADATA, $inheritance/xDocument/quality, false()),
          xes:addFact($xes, $classIRI, $xes:PRED-HAS-SEM-TYPES,$inheritance/semTypes/item, false()),
          xes:addFact($xes, $classIRI, $xes:PRED-HAS-SEM-FACTS,$inheritance/semFacts/factsTtl, false()),
          xes:addFact($xes, $classIRI, $xes:PRED-IS-ASSOC-CLASS, string($inheritance/baseClass), false()),
          xes:addFact($xes, $classIRI, $xes:PRED-HAS-BASE-CLASS, $associationClass, false()),
          for $end in $assocClassEnds return 
            xes:addQualifiedFact($xes, $classIRI, $xes:PRED-HAS-ASSOC-CLASS-END,
              ($xes:PRED-ASSOC-CLASS-END-ATTRIB, $xes:PRED-ASSOC-CLASS-END-CLASS, $xes:PRED-ASSOC-CLASS-END-FK),
              ($end/@attribute, $end/@class, $end/@FK))
      )
      return   (: Build the ES descriptor for the class :)
        if ($exclude eq true()) then
        else 
          let $classJson := json:object()
          let $attribsJson := json:object()
          map:put($classesJson, $className, $classJson),
          map:put($classJson, "properties", $attribsJson),
          map:put($classJson, "description", $classDescription), 

          if (count($requireds) gt 0) then map:put($classJson, "required", json:to-array($requireds)) else (),
          if (count($piis) gt 0) then map:put($classJson, "pii", json:to-array($piis)) else (),
      if (count($pks) gt 0) then map:put($classJson, "primaryKey", $pks) else (),
      if (count($class/xmlNamespace/@prefix)) then (
        map:put($classJson, "namespace", $class/xmlNamespace/@url),
        map:put($classJson, "namespacePrefix", $class/xmlNamespace/@prefix)           
        )
      else (),
      if (count($paths) gt 0) then map:put($classJson, "pathRangeIndex", json:to-array($paths)) else (),
      if (count($elements) gt 0) then map:put($classJson, "elementRangeIndex", json:to-array($elements)) else (),
      if (count($lexicons) gt 0) then map:put($classJson, "wordLexicon", json:to-array($lexicons)) else (),
      for $attrib in $allAttribs return 
        xes:transformAttribute($xes, $profileForm, $class, $attrib, $attribsJson)
    )


        <Class name="{$className}" iri="{$classIRI}" id="{$classID}" isAssociationClass="{$associationClass}" 
          baseClass="{string($inheritance/baseClass)}">
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
          <description>{$classDescription}</description>
          <exclude>{$exclude}</exclude>
          <pks>{$inheritance/pks/item}</pks>
          <attributes>{(
            (: Add the attributes. If assoc class, need one attrib for each end. :)
            for $attrib in $inheritance/attributes/* return 
              xmi2es:buildAttribute($xmi, $classIRI, $class, $attrib, $xes, $problems),
            for $end in $assocClassEnds return 
              <Attribute name="{concat("ref", $end/@class)}" type="{$end/@class}" 
                array="false" required="true" typeIsReference="true">
                <FK>{string($end/@FK)}</FK>
              </Attribute> 
          )}</attributes>
        </Class>
};

(: obtain "profile form" of attrib :)
declare function xmi2es:buildAttribute($xmi as node(), $classIRI as xs:string, $class as node(), $attrib as node(), $xes, $problems) as node()? {

  let $attribName := fn:normalize-space($attrib/@name)
  let $attribID := $attrib/@*:id

  return 
    if (string-length($attribName) eq 0) then pt:addProblem($problems, (), $attribID, $pt:ATTRIB-NO-NAME, "")
    else
      let $attribIRI := xes:attribIRI($classIRI, $attribName)
      let $attribDescription := string(($attrib/ownedComment/@body, $attrib/ownedComment/body)[1])
      let $exclude := exists($xmi/*/*:exclude[@base_Property eq $attribID])
      let $PK :=  exists($xmi/*/*:PK[@base_Property eq $attribID])
      let $FK :=  exists($xmi/*/*:FK[@base_Property eq $attribID])
      let $pii := exists($xmi/*/*:PII[@base_Property eq $attrib/@*:id])
      let $esProperty := $xmi/*/*:esProperty[@base_Property eq $attribID]
      let $elementRangeIndex :=  exists($xmi/*/*:elementRangeIndex[@base_Property eq $attribID])
      let $pathRangeIndex :=  exists($xmi/*/*:pathRangeIndex[@base_Property eq $attribID])
      let $wordLexicon :=  exists($xmi/*/*:wordLexicon[@base_Property eq $attribID])
      let $xURI :=  exists($xmi/*/*:xURI[@base_Property eq $attribID])
      let $xBizKey :=  exists($xmi/*/*:xBizKey[@base_Property eq $attribID])
      let $hints := $xmi/*/*:xImplHints[@base_Property eq $attribID]      
      let $xCalculated := $xmi/*/*:xCalculated[@base_Property eq $attrib/@*:id]/concat
      let $xHeader := normalize-space($xmi/*/*:xHeader[@base_Property eq $attrib/@*:id]/@field)
      let $semProperty := $xmi/*/*:semProperty[@base_Property eq $attribID]
      let $semPropertyPredicate := normalize-space($semProperty/@predicate)
      let $semPropertyPredicateTtl := normalize-space($semProperty/@predicateTtl)
      let $semIRI :=  exists($xmi/*/*:semIRI[@base_Property eq $attribID])
      let $semLabel :=  exists($xmi/*/*:semLabel[@base_Property eq $attribID])
      let $isArray := count($attrib/upperValue[@value="*"]) eq 1
      let $isRequired := not(exists($attrib/lowerValue))
      let $relationship := ($attrib/@*:aggregation, if (exists($attrib/@*:association)) then "association" else ())[1]
      let $typeIsReference :=  exists($relationship) or exists($attrib/@type)
      let $associationClass := $xmi//packagedElement[@*:id eq $attrib/@*:association and @*:type eq "uml:AssociationClass"]/@name  
      let $type := ($attrib/*:type/@href, 
        $xmi//*:packagedElement[@*:id eq $attrib/@type]/@name, 
        $xmi//*:packagedElement[@*:id eq $xmi//*:ownedEnd[@association eq $attrib/@association]/@type]/@name)[1]

      let $resolvedType := 
        if (string-length($esProperty/@mlType) gt 0) then (string($esProperty/@mlType), "datatype")
        else if (string-length($esProperty/@externalRef) gt 0) then (string($esProperty/@externalRef), "$ref")
        else if ($typeIsReference eq true()) then
          if (string-length($associationClass) gt 0) then (concat("#/definitions/", $associationClass), "$ref")
          else if ($FK/text() eq true()) then ("TBD", "$ref")
          else (concat("#/definitions/", $type), "$ref")
        else if (xes:emptyString($type) and map:get(map:get($xes, "params"), "lax") eq true()) then ("string", "datatype")
        else 
          if (ends-with($type, "#String")) then ("string", "datatype")
          else if (ends-with($type, "#Boolean")) then ("boolean", "datatype")
          else if (ends-with($type, "#Real")) then ("float", "datatype")
          else if (ends-with($type, "#Integer")) then ("int", "datatype")
          else (string($type), "datatype") (: whatever it is, use it. problem get rejected by ES val :)
      (:TODO - FK - need to get this on a second pass :)

      (: attrib-level facts :)
      let $_ := (
        xmi2es:xImplHints($attribIRI, $hints, $xes, $problems),

        xes:addFact($xes, $attribIRI, $xes:PRED-RELATIONSHIP,$relationship, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-TYPE-IS-REFERENCE,$typeIsReference, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-ASSOCIATION_CLASS,$associationClass, false()),

          for $end in $assocClassEnds return 
            xes:addQualifiedFact($xes, $classIRI, $xes:PRED-HAS-ASSOC-CLASS-END,
              ($xes:PRED-ASSOC-CLASS-END-ATTRIB, $xes:PRED-ASSOC-CLASS-END-CLASS, $xes:PRED-ASSOC-CLASS-END-FK),
              ($end/@attribute, $end/@class, $end/@FK))


        xes:addFact($xes, $attribIRI, $xes:PRED-ASSOCIATION_CLASS,$associationClass, false()),
        TODO type??

        xes:addFact($xes, $attribIRI, $xes:PRED-FK,$FK, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-EXCLUDED,$exclude, false()),

        xes:addFact($xes, $attribIRI, $xes:PRED-BIZ-KEY, $xBizKey, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-URI, $xURI, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-CALCULATION, for $c in $xCalculated return normalize-space($c), false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-HEADER, $xHeader, false()),

        xes:addFact($xes, $attribIRI, $xes:PRED-SEM-IRI, $semIRI, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-SEM-LABEL, $semLabel, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-SEM-PREDICATE, $semPropertyPredicate, false()),
        xes:addFact($xes, $attribIRI, $xes:PRED-SEM-PREDICATE-TTL, $semPropertyPredicateTtl, false()),
      )


    if ($exclude eq true()) then ()
    else (
      map:put($attribsJson, $attribName, $attribJson),
      if ($array eq true()) then 
        let $itemsJson := json:object()
        return (
          map:put($itemsJson, $typeKey, $type),
          if (string-length($collation) gt 0) then map:put($itemsJson, "collation", $collation) else (),
          map:put($attribJson, "datatype", "array"),
          map:put($attribJson, "items", $itemsJson)
        )
      else (
        map:put($attribJson, $typeKey, $type),
        if (string-length($collation) gt 0) then map:put($attribJson, "collation", $collation) else ()
      ),
      map:put($attribJson, "description", string($attrib/description))

      return 
        <Attribute name="{$attribName}" iri="{$attribIRI}" id="{$attribID}" array="{$isArray}" required="{$isRequired}" 
          type="{$type}" typeIsReference="{$typeIsReference}" relationship="{$relationship}"
          associationClass="{$associationClass}">
          <description>{$attribDescription}</description>
          <exclude>{$exclude}</exclude>
          <FK>{$FK}</FK>
          <rangeIndex>{$rangeIndex}</rangeIndex>
          <pii>{$pii}</pii>
          <esProperty collation="{normalize-space($esProperty/@collation)}" 
            mlType="{normalize-space($esProperty/@mlType)}" externalRef="{normalize-space($esProperty/@externalRef)}"/> 
        </Attribute>
};

(: Determine the inherited aspects of a class. Used if there are generalizations.
This is recursive and moves UP (recurses TO ancestor).
:)
declare function xmi2es:determineInheritance($xmi as node(), $problems, $class as node(), $classes as node()*, 
  $descDef as node()?) as node()? {

  (: want the immediate base class of the first class passed in :)
  let $baseClass := 
    if (empty($descDef)) then ""
    else if (string-length($descDef/baseClass) eq 0) then normalize-space($class/@name)
    else $descDef/baseClass

    let $_ := xdmp:log("BASE CLASS "|| $baseClass, "info")

  (: xDocument :)
  let $currentXDoc := $xmi/*/*:xDocument[@base_Class eq $class/@*:id]
  let $descXDoc := $descDef/xDocument
  let $xDoc := 
    if (count($descXDoc) eq 0 and count($currentXDoc) eq 0) then ()
    else (
        <collections>{(
          $descXDoc/collections/item,
          for $c in $currentXDoc/*:collections return <item>{normalize-space($c/text())}</item>
        )}</collections>,
        <permsCR>{(
          $descXDoc/permsCR/item,
          for $c in $currentXDoc/*:permsCR return 
            let $kv := xmi2es:csvParse(normalize-space($c/text()))
            return 
              if (count($kv) eq 2) then <item capability="{normalize-space($kv[1])}" role="{normalize-space($kv[2])}"/>
              else pt:addProblem($problems, (), concat("*",$class/@name,"*",$class/@id), $pt:ILLEGAL-PERM, $kv) 
        )}</permsCR>,
        <quality>{
          if (count($descXDoc/quality) gt 0) then $descXDoc/quality
          else normalize-space($currentXDoc/*:quality)
        }</quality>,
        <metadataKV>{(
          $descXDoc/metadataKV/item,
          for $c in $currentXDoc/*:metadataKV return 
            let $kv := xmi2es:csvParse(normalize-space($c/text()))
            return 
              if (count($kv) eq 2) then <item key="{normalize-space($kv[1])}" value="{normalize-space($kv[2])}"/>
              else pt:addProblem($problems, (), concat("*",$class/@name,"*",$class/@id), $pt:ILLEGAL-METADATA, $kv) 
        )}</metadataKV>
      )

  (:
  SEM Types
  :)
  let $currentSEMTypes := $xmi/*/*:semType[@base_Class eq $class/@*:id]/*:types/text()
  let $descSEMTypes := $descDef/semTypes/item
  let $semTypes := 
    if (count($descSEMTypes) eq 0 and count($currentSEMTypes) eq 0) then ()
    else 
        ($descSEMTypes, 
        for $c in $currentSEMTypes return <item>{normalize-space($c)}</item>)

  (:
  SEM Facts
  :)
  let $semFacts := 
    if (count($descDef/semFacts/factsTtl) gt 0) then $descDef/semFacts
    else 
      let $currentSEMFacts := $xmi/*/*:semFacts[@base_Class eq $class/@*:id]/*:factsTtl/text()
      return 
        if (string-length($currentSEMFacts) eq 0) then ()
        else <semFacts><factsTtl>{$currentSEMFacts}</factsTtl></semFacts>

  (:
  Attributes
  :)
  let $currentAttribs := $class/*:ownedAttribute[string-length(normalize-space(@name)) gt 0]
  let $resolvedAttribs := $descDef/attributes/*:ownedAttribute | 
    ($currentAttribs except $currentAttribs[@name eq $descDef/attributes/*:ownedAttribute/@name])

  let $def:= <Definition>
    <xDocument>{$xDoc}</xDocument>
    <semTypes>{$semTypes}</semTypes>
    <semFacts>{$semFacts}</semFacts>
    <attributes>{$resolvedAttribs}</attributes>
    <baseClass>{$baseClass}</baseClass>
  </Definition>

  let $parentClass := $classes[@*:id eq $class/generalization[1]/@general]
  return 
    if (count($parentClass) eq 0) then $def
    else xmi2es:determineInheritance($xmi, $problems, $parentClass, $classes, $def)
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

declare function xmi2es:xImplHints($iri as xs:string, $hints, $xes, $problems) as empty-sequence() {

  let $reminderHints := $hints/*:reminders
  let $hintTriples := $hints/*:triplesPO

  return (
    for $r in $reminderHints return xes:addFact($xes, $iri, $xes:PRED-HAS-REMINDER, $r, false()), 
    for $t in $hintTriples return 
      let $po := xmi2es:csvParse($t)
      return 
        if (count($po) eq 2) then xes:addFact($xes, $iri, normalize-space($po[1]), normalize-space($po[2]))
        else pt:addProblem($problems, $iri, (), $pt:ILLEGAL-TRIPLE-PO, $po) 
  )
};

(:
Parse and validate extender params. Return map entry for them. Params:

genlang: xqy, sjs
format: xml, json
lax: true/false
notional:  TBD

Currently we ignore them. genlang is assumed to be xqy
:)
declare function xmi2es:getParams($param as xs:string?) as map:map {
  let $nparam := fn:normalize-space($param)
  let $map := map:new((
    map:entry("genlang", "xqy"),
    map:entry("format", "xml"),
    map:entry("lax", false())
  ))

  return
    if (string-length($nparam) eq 0 or $nparam eq "dummy") then $map
    else 
      let $json := xdmp:from-json-string($param)
      let $_ := for $key in map:keys($json) return
        let $val := map:get($json, $key)
        return
          if ($key eq "genlang") then 
            if ($val eq ("xqy", "sjs")) then map:put($map, "genlang", $val)
            else fn:error(xs:QName("ERROR"), "illegal", ($key, $val))
          else if ($key eq "format") then 
            if ($val eq ("xml", "json")) then map:put($map, "format", $val)
            else fn:error(xs:QName("ERROR"), "illegal", ($key, $val))
          else if ($key eq "lax") then 
            if ($val eq "true" or $val eq true()) then map:put($map, "lax", true())
            else if ($val eq "false" or $val eq false()) then map:put($map, "lax", false())
            else fn:error(xs:QName("ERROR"), "illegal", ($key, $val))
          else fn:error(xs:QName("ERROR"), "Illegal", ($key))
      return $map
};
