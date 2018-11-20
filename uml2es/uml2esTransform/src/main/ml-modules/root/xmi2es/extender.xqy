(:
This module builds an "Extended" ES model, which consists of:
- Descriptor (JSON)
- Semantic triples describing additional aspects of the model, which are NOT captured in the descriptor. 
Here we leverage the ES extension mechanism - define your own triples
:)

(:
TODO - concat can use a prefix like :org. If it's ":org", use that string, but if it''s not quoted, it's the prefix;
if name clash, use the prefix and throw a warning
:)

xquery version "1.0-ml";

module namespace xes = "http://marklogic.com/xmi2es/extender"; 

import module namespace sem = "http://marklogic.com/semantics" at "/MarkLogic/semantics.xqy";
import module namespace pt = "http://marklogic.com/xmi2es/problemTracker" at "/xmi2es/problemTracker.xqy";

declare variable $DEFAULT-NAMESPACE := "http://example.org/Example-1.0.0";
declare variable $DEFAULT-MODEL := "zzz";
declare variable $DEFAULT-VERSION := "0.0.1";

declare variable $IRI-PREFIX := "http://marklogic.com/xmi2es/xes/";
declare variable $IRI-REMINDER := $IRI-PREFIX || "reminder";
declare variable $IRI-EXCLUDE := $IRI-PREFIX || "exclude";
declare variable $IRI-DOC-COLLECTION := $IRI-PREFIX || "doc-collection";
declare variable $IRI-DOC-PERM := $IRI-PREFIX || "doc-perm";
declare variable $IRI-DOC-QUALITY := $IRI-PREFIX || "doc-quality";
declare variable $IRI-DOC-METADATA := $IRI-PREFIX || "doc-metadata";
declare variable $IRI-BIZ-KEY := $IRI-PREFIX || "bizKey";
declare variable $IRI-URI := $IRI-PREFIX || "URI";
declare variable $IRI-CALCULATED := $IRI-PREFIX || "calculated";
declare variable $IRI-HEADER := $IRI-PREFIX || "header";
declare variable $IRI-FK := $IRI-PREFIX || "FK";
declare variable $IRI-RELATIONSHIP := $IRI-PREFIX || "relationship";
declare variable $IRI-BASE_CLASS := $IRI-PREFIX || "baseClass";

declare variable $IRI-SEM-PREFIXES := $IRI-PREFIX || "semPrefixes";
declare variable $IRI-SEM-IRI := $IRI-PREFIX || "semIRI";
declare variable $IRI-SEM-LABEL := $IRI-PREFIX || "semLabel";
declare variable $IRI-SEM-FACTS := $IRI-PREFIX || "semFacts";
declare variable $IRI-SEM-PROPERTY := $IRI-PREFIX || "semProperty";
declare variable $IRI-SEM-PROPERTY-TTL := $IRI-PREFIX || "semPropertyTtl";
declare variable $IRI-SEM-TYPE := $IRI-PREFIX || "semType";


(:
XES facts and problems

:)

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
	for $class in $profileForm/classes/Class return 
		xes:transformClass($xes, $profileForm, $class)
};

declare function xes:generateCode($xes as map:map) as xs:string? {
	"hi"
};

(:
Private Interface
:)

declare function xes:transformModel($xes as map:map, $profileForm as node()) as empty-sequence() {

	(:
	Stereotypes: 
	- esModel (ES)
	- xImplHints (XES)
	- semPrefixes (XES)
	:)

	let $problems := map:get($xes, "problems")
	let $descriptor := map:get($xes, "descriptor")

	let $semPrefixes := string($profileForm/semPrefixes/prefixesTtl)
	let $resolvedVersion := 
    	if (xes:emptyString($profileForm/esModel/@version)) then 
    		let $_ := pt:addProblem($problems, (), (), $pt:MODEL-VERSION-NOT-FOUND, ())
    		return $DEFAULT-VERSION
    	else $profileForm/esModel/@version
    let $resolvedURI := 
    	if (xes:emptyString($profileForm/esModel/@baseUri)) then 
    		$DEFAULT-NAMESPACE
    	else $profileForm/esModel/@baseUri
    let $modelIRI := concat($resolvedURI, "/", $profileForm/@name, "-", $resolvedVersion)
	let $_ := map:put($xes, "modelIRI", $modelIRI)

    let $modelJson := json:object()
    let $classesJson := json:object()
    let $_ := map:put($descriptor, "info", $modelJson)
	let $_ := (map:put($modelJson, "title", $profileForm/@name),
    	map:put($modelJson, "version", $resolvedVersion), 
    	map:put($modelJson, "baseUri", $resolvedURI), 
    	map:put($modelJson, "description", string($profileForm/description)),
    	map:put($descriptor, "definitions", $classesJson)
    )
	let $_ := (
		if (string-length($semPrefixes) gt 0) then xes:addFact($xes, $modelIRI, $IRI-SEM-PREFIXES, $semPrefixes, false()) else (),
		for $r in $profileForm/xImplHints/reminders/item return xes:addFact($xes, $modelIRI, $IRI-REMINDER, $r, false()),
		for $t in $profileForm/xImplHints/triplesPO/item return xes:addFact($xes, $modelIRI, $t/@predicate, $t/@object, false())
	)
	return ()
};

declare function xes:transformClass($xes as map:map, $profileForm as node(),  
	$class as node()) as empty-sequence() {

	(:
	Stereotypes: 
	- xmlNamespace (ES; package and class)
	- xImplHints (XES)
	- exclude (ES with fact)
	- xDocument (XES)
	- xHeader
	- xURI
	- xCalculated
	- xBizKey
	- semType
	- semFacts
	- semIRI
	- semLabel
	- semProperty 
	:)


	let $problems := map:get($xes, "problems")
	let $classesJson := map:get(map:get($xes, "descriptor"), "definitions")
	let $classIRI := concat(map:get($xes, "modelIRI"), "/", $class/@name)

	(: Gather the info about the class :)
	let $associationClass := $class/@isAssociationClass eq true()
	let $attribsJson := json:object()
	let $classJson := json:object()
	let $allAttribs := $class/attributes/Attribute
	let $includes := $allAttribs[exclude/text() eq false()]
	let $xBizKeys := $class/xBizKeys/item/text()
	let $pks := $class/pks/item/text()[. eq $includes/@name]
	let $requireds := $includes[@required eq true()]/@name
	let $paths := $includes[string(rangeIndex) eq "path"]/@name
	let $elements :=$includes[string(rangeIndex) eq "element"]/@name
	let $lexicons := $includes[string(rangeIndex) eq "lexicon"]/@name
	let $piis := $includes[@pii eq true()]/@name
	let $invalidRangeIndexes := $allAttribs[string-length(rangeIndex/text()) gt 0 
  		and not(rangeIndex/text() eq ("element", "path", "lexicon"))]

	let $semIRIs := $class/semIRIs/item/text()
	let $semLabels := $class/semLabels/item/text()
	let $semTypes := $class/semTypes/item
	let $semFacts := $class/semFacts/factsTtl/text()
	let $semPredicates := $allAttribs[string-length(semProperty/predicate) gt 0]
	let $semPredicatesTtl := $allAttribs[string-length(semProperty/predicateTtl) gt 0]

		for $a in $semProperties return (
			let $isIRI := $a/@typeIsReference eq true()
			let $fieldSource := 
				if ($a/exclude/text() eq true()) then concat('map:get($options, "', $a/@name, '")')
				else concat('$content/', $a/@name)
			return (
				xes:addFact($xes, concat($classIRI, "/", $a/@name), $IRI-SEM-PROPERTY, $a/semProperty/text(), $isIRI),
				json:array-push($semLines, concat('sem:triple(sem:iri($semIRI), sem:iri("', $a/semProperty/text(), '"),',
					if ($isIRI) then concat('sem:iri(', $fieldSource, '))')
					else concat($fieldSource, ")"))),
				json:array-push($semLines, ",")
			)
		),

		for $a in $semTypes return xes:addFact($xes, $classIRI, $IRI-SEM-TYPE, $a, false())
		if (count($semIRIs) eq 0 and count($semLabels) + count($semProperties) + count($semTypes) gt 0) 
			then pt:addProblem($problems, $classIRI, (), $pt:CLASS-SEM-NO-IRI, "")
		else (),


	(: facts and problems :)
	let $_ := (
		for $i in $invalidRangeIndexes return 
			pt:addProblem($problems, concat($classIRI, "/", $i/@name), (), $pt:ATTRIB-ILLEGAL-INDEX, $i/@rangeIndex),
		for $a in $xBizKeys return xes:addFact($xes, $classIRI, $IRI-BIZ-KEY, concat($classIRI, "/", $a), true()),
		for $r in $class/xImplHints/reminders/item return xes:addFact($xes, $classIRI, $IRI-REMINDER, $r, false()),
		for $t in $class/xImplHints/triplesPO/item return xes:addFact($xes, $classIRI, $t/@predicate, $t/@object, false()),
		if (string-length($class/@baseClass) gt 0) then 
			xes:addFact($xes, $classIRI, $IRI-BASE_CLASS, concat(map:get($xes, "modelIRI"), "/", $class/@baseClass), true()) 
			else ()
	)

	(: Build the ES descriptor for the class :)
	return
		if ($class/exclude/text() eq true()) then
			xes:addFact($xes, $classIRI, $IRI-EXCLUDE, "self", false())
		else (
			map:put($classesJson, $class/@name, $classJson),
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
	let $classIRI := concat(map:get($xes, "modelIRI"), "/", $class/@name)
	let $attribIRI := concat($classIRI, "/", $attrib/@name)
	let $attribJson := json:object()
	let $exclude := $attrib/exclude/text() eq true()
	let $FK := $attrib/FK/text() eq true()
	let $relationship := $attrib/@relationship
	let $array := $attrib/@array eq true()
	let $required := $attrib/@required eq true()
	let $PK := $attrib/@name eq $class/pks/item
	let $collation := $attrib/esProperty/@collation
	let $header := $attrib/xHeader/text()

	(: OK, let's figure out the type... :)
	let $resolveTypeResult := xes:resolveType($xes, $profileForm, $class, $attrib)
	let $type := $resolveTypeResult[1]
	let $typeKey := $resolveTypeResult[2]
	
	(: facts and problems :)
	let $_ := (
		for $r in $attrib/xImplHints/reminders/item return xes:addFact($xes, $attribIRI, $IRI-REMINDER, $r, false()),
		for $t in $attrib/xImplHints/triplesPO/item return xes:addFact($xes, $attribIRI, $t/@predicate, $t/@object, false()),
		if ($FK eq true()) then xes:addFact($xes, $attribIRI, $IRI-FK, "self", false()) else (),
		if (string-length($header)) then xes:addFact($xes, $attribIRI, $IRI-HEADER, $header, false()) else (), 
		if (string-length($relationship) gt 0) then xes:addFact($xes, $attribIRI, $IRI-RELATIONSHIP, $relationship, false()) else (),
		if (string-length($collation) gt 0 and $type ne "string") then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-COLLATION-NONSTRING, "") 
		else (),
		if ($PK eq true() and ($required eq false() or $array eq true())) then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ONE, "PK") 
		else ()
	)

	return
		if ($exclude eq true()) then
			xes:addFact($xes, $attribIRI, $IRI-EXCLUDE, "self", false())
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

	let $attribIRI := concat(map:get($xes, "modelIRI"), "/", $class/@name, "/", $attrib/@name)
	return 
		if (string-length($attrib/esProperty/@mlType) gt 0) then (string($attrib/esProperty/@mlType), "datatype")
		else if (string-length($attrib/esProperty/@externalRef) gt 0) then (string($attrib/esProperty/@externalRef), "$ref")
		else if ($attrib/@typeIsReference eq true()) then
			if (string-length($attrib/@associationClass) gt 0) then (concat("#/definitions/", $attrib/@associationClass), "$ref")
			else if ($attrib/FK/text() eq true()) then
				let $refClass :=  $profileForm/classes/Class[@name eq $attrib/@type]
				let $refPKAttrib := $refClass/attributes/Attribute[@name eq $refClass/pks/item[1]]
				return 
					if (count($refPKAttrib) ne 1) then 
						let $_ := pt:addProblem($xes, $attribIRI, (), $pt:ATTRIB-BROKEN-FK, "unable to find PK of ref")
						return (concat("broken FK: ", $attrib/@type), "datatype")
					else
						let $refType := xes:resolveType($xes, $profileForm, $refClass, $refPKAttrib)
						return
							if ($refType[2] eq "$ref") then 
								let $_ := pt:addProblem($xes, $attribIRI, (), $pt:ATTRIB-BROKEN-FK, "PK of ref must be primitive")
								return (concat("broken FK: ", $attrib/@type), "datatype")
							else
								$refType
			else (concat("#/definitions/", $attrib/@type), "$ref")
		else if (xes:emptyString($attrib/@type) and map:get(map:get($xes, "params"), "lax") eq true()) then ("string", "datatype")
		else 
			if (ends-with($attrib/@type, "#String")) then ("string", "datatype")
			else if (ends-with($attrib/@type, "#Boolean")) then ("boolean", "datatype")
			else if (ends-with($attrib/@type, "#Real")) then ("float", "datatype")
			else if (ends-with($attrib/@type, "#Integer")) then ("int", "datatype")
			else (string($attrib/@type), "datatype") (: whatever it is, use it. problem get rejected by ES val :)
};

declare function xes:emptyString($s) {
	not($s) or string-length($s) eq 0
};

(:
Add a fact to the extended model.
:)
declare function xes:addFact($xes as map:map,
	$subjectIRI as xs:string, $predicateIRI as xs:string, 
	$objects as xs:string+, $objectIsIRI as xs:boolean) as empty-sequence() {

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
Parse and validate extender params. Return map entry for them. Params:

genlang: xqy, sjs
format: xml, json
lax: true/false
notional:  TBD

Currently we ignore them. genlang is assumed to be xqy
:)
declare function xes:getParams($param as xs:string?) as map:map {
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
