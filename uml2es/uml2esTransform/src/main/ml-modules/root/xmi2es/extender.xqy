(:
This module builds an "Extended" ES model, which consists of:
- Descriptor (JSON)
- Semantic triples describing additional aspects of the model, which are NOT captured in the descriptor. 
Here we leverage the ES extension mechanism - define your own triples
:)

(:
TODO - concat can use a prefix like :org. If it's ":org", use that string, but if it''s not quoted, it's the prefix;
if name clash, use the prefix and throw a warning

sem:rdf-builder looks promising..

Can xCalculated refer to attributes in other classes?
Definitely xCalculated can refer to prefixes

:)

xquery version "1.0-ml";

module namespace xes = "http://marklogic.com/xmi2es/extender"; 

import module namespace sem = "http://marklogic.com/semantics" at "/MarkLogic/semantics.xqy";
import module namespace pt = "http://marklogic.com/xmi2es/problemTracker" at "/xmi2es/problemTracker.xqy";

declare variable $DEFAULT-NAMESPACE := "http://example.org/Example-1.0.0";
declare variable $DEFAULT-MODEL := "zzz";
declare variable $DEFAULT-VERSION := "0.0.1";

declare variable $IRI-PREFIX := "http://marklogic.com/xmi2es/xes/";

declare variable $PRED-REMINDER := $IRI-PREFIX || "reminder";

declare variable $PRED-COLLECTIONS := $IRI-PREFIX || "collections";
declare variable $PRED-PERM := $IRI-PREFIX || "perm";
declare variable $PRED-CAPABILITY := $IRI-PREFIX || "capability";
declare variable $PRED-ROLE := $IRI-PREFIX || "role";
declare variable $PRED-QUALITY := $IRI-PREFIX || "quality";
declare variable $PRED-METADATA := $IRI-PREFIX || "metadata";
declare variable $PRED-KEY := $IRI-PREFIX || "key";
declare variable $PRED-VALUE := $IRI-PREFIX || "value";

declare variable $PRED-IS-EXCLUDED := $IRI-PREFIX || "isExcluded";
declare variable $PRED-RELATIONSHIP := $IRI-PREFIX || "relationship";
declare variable $PRED-TYPE-IS-REFERENCE := $IRI-PREFIX || "typeIsReference";
declare variable $PRED-TYPE-REFERENCE := $IRI-PREFIX || "reference";
declare variable $PRED-ASSOCIATION-CLASS := $IRI-PREFIX || "associationClass";
declare variable $PRED-IS-ASSOCIATION-CLASS := $IRI-PREFIX || "isAssociationClass";
declare variable $PRED-IS-FK := $IRI-PREFIX || "isFK";
declare variable $PRED-HAS-ASSOC-CLASS-END := $IRI-PREFIX || "hasAssociationClassEnd";
declare variable $PRED-ASSOC-CLASS-END-ATTRIB := $IRI-PREFIX || "associationClassEndAttribute";
declare variable $PRED-ASSOC-CLASS-END-CLASS := $IRI-PREFIX || "associationClassEndClass";
declare variable $PRED-ASSOC-CLASS-END-FK := $IRI-PREFIX || "associationClassEndFK";

declare variable $PRED-IS-BIZ-KEY := $IRI-PREFIX || "isBizKey";
declare variable $PRED-IS_URI := $IRI-PREFIX || "isURI";
declare variable $PRED-CALCULATION := $IRI-PREFIX || "calculation";
declare variable $PRED-HEADER := $IRI-PREFIX || "header";
declare variable $PRED-BASE_CLASS := $IRI-PREFIX || "baseClass";

declare variable $PRED-IS-SEM-LABEL := $IRI-PREFIX || "isSemLabel";
declare variable $PRED-SEM-PREDICATE := $IRI-PREFIX || "semPredicate";
declare variable $PRED-SEM-PREDICATE-TTL := $IRI-PREFIX || "semPredicateTtl";
declare variable $PRED-SEM-PREFIXES := $IRI-PREFIX || "semPrefixes";
declare variable $PRED-IS-SEM-IRI := $IRI-PREFIX || "isSemIRI";
declare variable $PRED-SEM-TYPES := $IRI-PREFIX || "semTypes";
declare variable $PRED-SEM-FACTS := $IRI-PREFIX || "semFacts";
 
(:
PUBLIC Interface
:)

declare function xes:init($problems, $param as xs:string?) as map:map {

	map:new((
		map:entry("params", xes:getParams($param)),
		map:entry("descriptor", json:object()),
		map:entry("problems", $problems),
		map:entry("triples", json:array())
	))
};

declare function xes:getDescriptor($xes as map:map) as json:object {
	map:get($xes, "descriptor")
};

(:
Add a fact to the extended model.
:)
declare function xes:addFact($xes as map:map,
	$subjectIRI as xs:string, $predicateIRI as xs:string, 
	$objects as xs:anyAtomicType+, $objectIsIRI as xs:boolean) as empty-sequence() {

	let $triples := map:get($xes, "triples")
	let $problems := map:get($xes,  "problems")
	return 
		if (xes:emptyString($predicateIRI)) then
			pt:addProblem($problems, $subjectIRI, (), $pt:ILLEGAL-XES-TRIPLE, "no predicate") 
		else
			for $object in $objects return 
				if (xes:emptyString($object)) then
					pt:addProblem($problems, $subjectIRI, (), $pt:ILLEGAL-XES-TRIPLE, "no object") 
				else
					let $triple := sem:triple(sem:iri($subjectIRI), sem:iri($predicateIRI), 
						if ($objectIsIRI eq true()) then sem:iri($object) else $object)
					return 
						json:array-push($triples, $triple)
};

(:
Add qualified fact to the extended model.
:)
declare function xes:addQualifiedFact($xes as map:map,
	$subjectIRI as xs:string, $predicateIRI as xs:string, $qualifiedMap as map:map) 
	as empty-sequence() {

	let $triples := map:get($xes, "triples")
	let $problems := map:get($xes,  "problems")
	return 
		if (xes:emptyString($predicateIRI)) then
			pt:addProblem($problems, $subjectIRI, (), $pt:ILLEGAL-XES-TRIPLE, "no predicate") 
		else
			let $bnode := sem:bnode()
			return (
				json:array-push(sem:triple(sem:iri($subjectIRI), sem:iri($predicateIRI), $bnode))),
				for $pred in map:keys($qualifiedMap) return 
					json:array-push(sem:triple($bnode, sem:iri($pred), map:get($qualifiedMap, $pred)))
};

(:
Parse and validate extender params. Return map entry for them. Params:

lax: true/false
class: name, subordinates: subNames
notional:  TBD

Currently we ignore them. genlang is assumed to be xqy
:)
declare function xmi2es:getParams($param as xs:string?) as map:map {
  let $nparam := fn:normalize-space($param)
  let $map := map:new((
    map:entry("lax", false())
  ))

  return
    if (string-length($nparam) eq 0 or $nparam eq "dummy") then $map
    else 
      let $json := xdmp:from-json-string($param)
      let $_ := for $key in map:keys($json) return
        let $val := map:get($json, $key)
        return
          if ($key eq "lax") then 
            if ($val eq "true" or $val eq true()) then map:put($map, "lax", true())
            else if ($val eq "false" or $val eq false()) then map:put($map, "lax", false())
            else fn:error(xs:QName("ERROR"), "illegal", ($key, $val))
          else fn:error(xs:QName("ERROR"), "Illegal", ($key))
      return $map
};

declare function xes:resolveBaseUri($xes, $baseUri as xs:string?) as xs:string {
	let $problems := map:get($xes, "problems")
	return 
		if (xes:emptyString($baseUri)) then 
			let $_ := pt:addProblem($problems, (), (), $pt:MODEL-BASE-URI-NOT-FOUND, ())
			return $DEFAULT-NAMESPACE
		else $baseUri
};

declare function xes:resolveVersion($xes, $version as xs:string?) as xs:string {
	let $problems := map:get($xes, "problems")
	return 
		if (xes:emptyString($version)) then 
			let $_ := pt:addProblem($problems, (), (), $pt:MODEL-VERSION-NOT-FOUND, ())
			return $DEFAULT-VERSION
		else $version
};

declare function xes:modelIRI($xes, $modelName as xs:string, $baseUri as xs:string?, $version as xs:string?) as xs:string {
    concat($resolvedURI, "/", $profileForm/@name, "-", $resolvedVersion)
};

declare function xes:classIRI($xes, $modelIRI as xs:string, $className as xs:string) as xs:string {
	concat($modelIRI, "/", $className)
};

declare function xes:attribIRI($xes, $classIRI as xs:string, $attribName as xs:string) as xs:string {
	concat($classIRI, "/", $attribName)
};

(:
Return a turtle serialization of the XES triples. Also return a reasonably useful comment summarizing the extensions.
The comment can be pasted into your conversion module to help guide you.
:)
declare function xes:generateModelExtension($xes as map:map) as xs:string* {
	let $triples := json:array-values(map:get($xes, "triples"))
	return
		if (count($triples) eq 0) then ()
		else
			let $turtle := sem:rdf-serialize($triples, "turtle")
			let $comment := concat(
				"Your model has the following extended facts. These facts are also saved as triples in your content DB:",
				$turtle)
			return ($turtle, $comment)
};

(:
Returns MLCP-style map. Each contains: uri and value. 
uri is $dir/moduleName.[xqy|sjs]
value is the content of the module
:)
declare function xes:generateCode($xes as map:map, $dir as xs:string) as map:map* {
  let $genMap := if (count($genCode) eq 1) then map:new((
      map:entry("uri", concat("/xmi2es/gen/", $docName, ".txt")),
      map:entry("value", text { $genCode } )
    ))
    else ()
	"hi"
};

(:
Set the one and only model 
:)
declare function xes:transform($xes as map:map, $profileForm as node()) as empty-sequence() {
	let $problems := map:get($xes, "problems")
	let $descriptor := map:get($xes, "descriptor")

	(: start with the model :)	
	let $_ := transformModel($xes, $profileForm)

	(: now the classes :)
	let $allClasses := $profileForm//Class/@name
	let $duplicateClasses := $allClasses[index-of($allClasses, .)[2]]
	let $_ := 
		if (count($duplicateClasses) gt 0) then 
			pt:addProblem($problems, (), (), $pt:MODEL-DUPLICATE-CLASSES, string-join($duplicateClasses, ","))
		else ()
	let $_ := for $class in $profileForm/classes/Class return 
		xes:transformClass($xes, $profileForm, $class)

	(: we have all the triples we need; create an in-mem store for queries :)
	let $_ := map:put("store", sem:in-memory-store(json:array-values(map:get($xes, "triples"))))
	return ()
};

(:
Private Interface
:)

declare function xes:transformModel($xes as map:map, $profileForm as node()) as empty-sequence() {
	let $problems := map:get($xes, "problems")
	let $descriptor := map:get($xes, "descriptor")

    let $modelJson := json:object()
    let $classesJson := json:object()
    let $_ := map:put($descriptor, "info", $modelJson)
	return (
		map:put($modelJson, "title", string($profileForm/name)),
    	map:put($modelJson, "version", string($profileForm/version)), 
    	map:put($modelJson, "baseUri", string($profileForm/baseUri)), 
    	map:put($modelJson, "description", string($profileForm/description)),
    	map:put($descriptor, "definitions", $classesJson))
};

declare function xes:transformClass($xes as map:map, $profileForm as node(),  
	$class as node()) as empty-sequence() {

	let $problems := map:get($xes, "problems")
	let $classesJson := map:get(map:get($xes, "descriptor"), "definitions")
	let $classIRI := string($class/iri)

	(: Gather the info about the class :)
	let $attribsJson := json:object()
	let $classJson := json:object()
	let $allAttribs := $class/attributes/Attribute
	let $includes := $allAttribs[exclude/text() eq false()]
	let $pks := string($includes[PK/text() eq true()]/name)
	let $requireds := string($includes[required/text() eq true()]/name)
	let $paths := string($includes[pathRangeIndex/text() eq true()]/name)
	let $elements :=string($includes[elementRangeIndex/text() eq true()]/name)
	let $lexicons := string($includes[wordLexicon/text() eq true()]/name)
	let $piis := string($includes[pii/text() eq true()]/name)

	(: Build the ES descriptor for the class :)
	return
		if ($class/exclude/text() eq true()) then ()
		else (
			map:put($classesJson, string($class/name), $classJson),
			map:put($classJson, "properties", $attribsJson),
			map:put($classJson, "description", string($class/description)),	
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
};

declare function xes:transformAttribute($xes as map:map, $profileForm as node(), 
	$class as node(), $attrib as node(), $attribsJson as json:object) as empty-sequence() {
	let $problems := map:get($xes, "problems")
	let $attribIRI := string($attrib/iri)
	let $attribJson := json:object()
	let $exclude := $attrib/exclude/text() eq true()
	let $FK := $attrib/FK/text() eq true()
	let $array := $attrib/array/text() eq true()
	let $required := $attrib/required/text() eq true()
	let $PK := $attrib/PK/text() eq true()
	let $collation := $attrib/esProperty/@collation

	(: OK, let's figure out the type... :)
	let $resolveTypeResult := xes:resolveType($xes, $profileForm, $class, $attrib)
	let $type := $resolveTypeResult[1]
	let $typeKey := $resolveTypeResult[2]
	
	(: facts and problems :)
	let $_ := (
		if (string-length($collation) gt 0 and $type ne "string") then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-COLLATION-NONSTRING, "") 
		else (),
		if ($PK eq true() and ($required eq false() or $array eq true())) then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ONE, "PK") 
		else ()
	)

	return
		if ($exclude eq true()) then ()
		else (
			map:put($attribsJson, $attrib/@name, $attribJson),
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
		)
};

(:
Determine the ES model descriptor type of the attribute. 
:)
declare function xes:resolveType($xes as map:map, $profileForm as node(), 
	$class as node(), $attrib as node()) as xs:string+ {

	let $attribIRI := string($attrib/iri)
	let $type := string($attrib/type)
	return 
		if (string-length($attrib/esProperty/@mlType) gt 0) then (attrib/esProperty/@mlType, "datatype")
		else if (string-length($attrib/esProperty/@externalRef) gt 0) then ($attrib/esProperty/@externalRef, "$ref")
		else if ($attrib/typeIsReference/text() eq true()) then
			if (string-length(string($attrib/associationClass)) gt 0) then (concat("#/definitions/", string($attrib/associationClass)), "$ref")
			else if ($attrib/FK/text() eq true()) then
				let $refClass :=  $profileForm/classes/Class[name eq string($attrib/type)]
				let $refPKAttrib := $refClass/attributes/Attribute[PK/text() eq true()]
				return 
					if (count($refPKAttrib) ne 1) then 
						let $_ := pt:addProblem($xes, $attribIRI, (), $pt:ATTRIB-BROKEN-FK, "unable to find PK of ref")
						return (concat("broken FK: ", $type), "datatype")
					else
						let $refType := xes:resolveType($xes, $profileForm, $refClass, $refPKAttrib)
						return
							if ($refType[2] eq "$ref") then 
								let $_ := pt:addProblem($xes, $attribIRI, (), $pt:ATTRIB-BROKEN-FK, "PK of ref must be primitive")
								return (concat("broken FK: ", $type), "datatype")
							else
								$refType
			else (concat("#/definitions/", $type), "$ref")
		else if (xes:emptyString($type) and map:get(map:get($xes, "params"), "lax") eq true()) then ("string", "datatype")
		else 
			if (ends-with($type, "#String")) then ("string", "datatype")
			else if (ends-with($type, "#Boolean")) then ("boolean", "datatype")
			else if (ends-with($type, "#Real")) then ("float", "datatype")
			else if (ends-with($type, "#Integer")) then ("int", "datatype")
			else (string($type), "datatype") (: whatever it is, use it. problem get rejected by ES val :)
};

declare function xes:emptyString($s) {
	not($s) or string-length($s) eq 0
};


