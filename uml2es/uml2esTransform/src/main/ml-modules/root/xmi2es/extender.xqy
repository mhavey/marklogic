(:
This module builds an "Extended" ES model, which consists of:
- Descriptor (JSON)
- Semantic triples describing additional aspects of the model, which are NOT captured in the descriptor. 
Here we leverage the ES extension mechanism - define your own triples
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
declare variable $IRI-FK := $IRI-PREFIX || "FK";
declare variable $IRI-RELATIONSHIP := $IRI-PREFIX || "relationship";

declare variable $IRI-SEM := $IRI-PREFIX || "semIRI";
declare variable $IRI-SEM-LABEL := $IRI-PREFIX || "semLabel";
declare variable $IRI-SEM-PROPERTY := $IRI-PREFIX || "semProperty";
declare variable $IRI-SEM-TYPE := $IRI-PREFIX || "semType";

(:
PUBLIC Interface
:)

declare function xes:init($problems) as map:map {
	map:new((
		map:entry("descriptor", json:object()),
		map:entry("problems", $problems),
		map:entry("triples", json:array()),
		map:entry("sems", map:map())
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
Generate xqy triple creation code. You must have sem stereotypes in your model for this to work.
Tested with DHF triples module. Meant for that sort of use...
:)
declare function xes:generateSEMCode($xes as map:map) as xs:string? {

	let $sems := map:get($xes, "sems")
	let $classes := map:keys($sems)
	let $nl := "&#10;"
	return 
		if (count($classes) eq 0) then ()
		else
			let $lines := for $class in $classes return 
				let $classLines := json:array-values(map:get($sems, $class))
				return (
					concat("(: SEM Triple Generated Code For Class ", $class, " :)"),
					for $line in $classLines return string($line),
					$nl
				)
			return string-join($lines, $nl)
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

declare function xes:transformModel($xes as map:map, $profileForm as node()) as empty-sequence() {
	let $problems := map:get($xes, "problems")
	let $descriptor := map:get($xes, "descriptor")

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
		for $r in $profileForm/xImplHints/reminders/item return xes:addFact($xes, $modelIRI, $IRI-REMINDER, $r, false()),
		for $t in $profileForm/xImplHints/triplesPO/item return xes:addFact($xes, $modelIRI, $t/@predicate, $t/@object, false())
	)
	return ()
};

declare function xes:transformClass($xes as map:map, $profileForm as node(),  
	$class as node()) as empty-sequence() {

	let $sems := map:get($xes, "sems")
	let $problems := map:get($xes, "problems")
	let $classesJson := map:get(map:get($xes, "descriptor"), "definitions")
	let $classIRI := concat(map:get($xes, "modelIRI"), "/", $class/@name)

	(: Gather the info about the class :)
	let $associationClass := $class/@isAssociationClass eq true()
	let $attribsJson := json:object()
	let $classJson := json:object()
	let $allAttribs := $class/attributes/Attribute
	let $assocClassAttribs := 
		for $end in $class/associationClass/end return 
			$profileForm/classes/Class[@name eq $end/@class]/attributes/Attribute[@name eq $end/@attribute] 
	let $childAttribs := ($allAttribs, $assocClassAttribs)
	let $excludes := $allAttribs[exclude/text() eq true()]
	let $includes := $allAttribs[exclude/text() eq false()]
	let $xBizKeys := $class/xBizKeys/item/text()
	let $xURIs := $class/xBizKeys/item/text()
	let $semTypes := $class/semTypes/item
	let $semIRIs := $class/semIRIs/item/text()
	let $semLabels := $class/semLabels/item/text()
	let $semProperties := $allAttribs[string-length(semProperty) gt 0]
	let $pks := $class/pks/item/text()[. eq $includes/@name]
	let $requireds := $includes[@required eq true()]/@name
	let $paths := $includes[string(rangeIndex) eq "path"]/@name
	let $elements :=$includes[string(rangeIndex) eq "element"]/@name
	let $lexicons := $includes[string(rangeIndex) eq "lexicon"]/@name
	let $invalidRangeIndexes := $allAttribs[string-length(rangeIndex/text()) gt 0 
  		and not(rangeIndex/text() eq ("element", "path", "lexicon"))]

	(: facts and problems :)
	let $_ := (
		for $i in $invalidRangeIndexes return 
			pt:addProblem($problems, concat($classIRI, "/", $i/@name), (), $pt:ATTRIB-ILLEGAL-INDEX, $i/@rangeIndex),
		for $a in $xBizKeys return xes:addFact($xes, $classIRI, $IRI-BIZ-KEY, concat($classIRI, "/", $a), true()),
		for $a in $xURIs return xes:addFact($xes, $classIRI, $IRI-URI, concat($classIRI, "/", $a), true()),
		if (count($xURIs) gt 1) then 
			pt:addProblem($problems, $classIRI, (), $pt:CLASS-MULTIFIELD-URI, string-join($xURIs, ","))
		else (),
		for $r in $class/xImplHints/reminders/item return xes:addFact($xes, $classIRI, $IRI-REMINDER, $r, false()),
		for $t in $class/xImplHints/triplesPO/item return xes:addFact($xes, $classIRI, $t/@predicate, $t/@object, false()),
		for $t in $class/xDocument/collections/item return xes:addFact($xes, $classIRI, $IRI-DOC-COLLECTION, $t, false()),
		for $t in $class/xDocument/permsCR/item return xes:addFact($xes, $classIRI, $IRI-DOC-PERM, $t, false()),
		if (exists($class/xDocument/quality/text())) then 
			xes:addFact($xes, $classIRI, $IRI-DOC-QUALITY, $class/xDocument/quality/text(), false()) 
			else (),
		for $t in $class/xDocument/metadataKV/item return xes:addFact($xes, $classIRI, $IRI-DOC-METADATA, $t, false())
	)

	(: SEM :)
	let $semLines := json:array()
	let $_ := (
		if (count($semIRIs) eq 0 and count($semLabels) + count($semProperties) + count($semTypes) gt 0) 
			then pt:addProblem($problems, $classIRI, (), $pt:CLASS-SEM-NO-IRI, "")
		else (),

		if (count($semIRIs) eq 1) then 
			let $fieldSource := 
				if ($semIRIs[1] eq $excludes/@name) then concat('map:get($options, "', $semIRIs[1], '")')
				else concat('$content/', $semIRIs[1])
			return (
				json:array-push($semLines, concat("let $semIRI := ", $fieldSource)),
				json:array-push($semLines, "return (")
			)
		else if (count($semIRIs) gt 1) then
			pt:addProblem($problems, $classIRI, (), $pt:CLASS-MULTIFIELD-SEM-IRI, string-join($semIRIs, ","))
		else (),
		for $a in $semIRIs return xes:addFact($xes, $classIRI, $IRI-SEM, $a, false()),

		if (count($semLabels) eq 1) then
			let $fieldSource := 
				if ($semLabels[1] eq $excludes/@name) then concat('map:get($options, "', $semLabels[1], '")')
				else concat('$content/', $semLabels[1])
			return (
				json:array-push($semLines, concat('sem:triple(sem:iri($semIRI), sem:iri("http://www.w3.org/2000/01/rdf-schema#label"), ', $fieldSource, ')')),
				json:array-push($semLines, ",")
			)
		else if (count($semLabels) gt 1) then
			pt:addProblem($problems, $classIRI, (), $pt:CLASS-MULTIFIELD-SEM-LABEL, string-join($semLabels, ","))
		else (),
		for $a in $semLabels return xes:addFact($xes, $classIRI, $IRI-SEM-LABEL, $a, false()),

		for $a in $semTypes return (
			xes:addFact($xes, $classIRI, $IRI-SEM-TYPE, $a, false()),
			json:array-push($semLines, concat('sem:triple(sem:iri($semIRI), sem:iri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), sem:iri("', $a, '"))')),
			json:array-push($semLines, ",")
		),

		(:TODO - if excluded, use option; determine if property is IRI or not :)
		for $a in $semProperties return (
			let $isIRI := $a/@typeIsReference eq true()
			let $fieldSource := 
				if ($a/excludes/text() eq true()) then concat('map:get($options, "', $a/@name, '")')
				else concat('$content/', $a/@name)
			return (
				xes:addFact($xes, concat($classIRI, "/", $a/@name), $IRI-SEM-PROPERTY, $a/semProperty/text(), $isIRI),
				json:array-push($semLines, concat('sem:triple(sem:iri($semIRI), sem:iri("', $a/semProperty/text(), '"),',
					if ($isIRI) then concat('sem:iri(', $fieldSource, '))')
					else concat($fieldSource, ")"))),
				json:array-push($semLines, ",")
			)
		),

		if (json:array-size($semLines) gt 0) then (
			json:array-push($semLines, "() (: add more if you need to :)"),
			json:array-push($semLines, ")"),
			map:put($sems, $class/@name, $semLines)
		) 
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
			if (count($pks) gt 0) then map:put($classJson, "primaryKey", $pks) else (),
			if (count($class/xmlNamespace/@prefix)) then (
				map:put($classJson, "namespace", $class/xmlNamespace/@url),
				map:put($classJson, "namespacePrefix", $class/xmlNamespace/@prefix)						
				)
			else (),
			if (count($paths) gt 0) then map:put($classJson, "pathRangeIndex", json:to-array($paths)) else (),
			if (count($elements) gt 0) then map:put($classJson, "elementRangeIndex", json:to-array($elements)) else (),
			if (count($lexicons) gt 0) then map:put($classJson, "wordLexicon", json:to-array($lexicons)) else (),
			for $attrib in $childAttribs return 
				xes:transformAttribute($xes, $profileForm, $class, $attrib, $attribsJson)
		)
};

declare function xes:transformAttribute($xes as map:map, $profileForm as node(), 
	$class as node(), $attrib as node(), $attribsJson as json:object) as empty-sequence() {
let $_ := xdmp:log(concat("in transformAttribute *", $attrib/@id, "*", $attrib/@name, "*"), "info") 

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
	let $semLabel := $attrib/@name eq $class/semLabels/item
	let $semIRI := $attrib/@name eq $class/semIRIs/item
	let $xURI := $attrib/@name eq $class/xURIs/item
	let $collation := $attrib/esProperty/@collation

	(: OK, let's figure out the type... :)
	let $resolveTypeResult := xes:resolveType($xes, $profileForm, $class, $attrib)
	let $type := $resolveTypeResult[1]
	let $typeKey := $resolveTypeResult[2]
	
	(: facts and problems :)
	let $_ := (
		for $r in $attrib/xImplHints/reminders/item return xes:addFact($xes, $attribIRI, $IRI-REMINDER, $r, false()),
		for $t in $attrib/xImplHints/triplesPO/item return xes:addFact($xes, $attribIRI, $t/@predicate, $t/@object, false()),
		for $t in $attrib/xCalculated/item return xes:addFact($xes, $attribIRI, $IRI-CALCULATED, $t, false()),
		if ($FK eq true()) then xes:addFact($xes, $attribIRI, $IRI-FK, "self", false()) else (),
		if (string-length($relationship) gt 0) then xes:addFact($xes, $attribIRI, $IRI-RELATIONSHIP, $relationship, false()) else (),
		if (string-length($collation) gt 0 and $type ne "string") then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-COLLATION-NONSTRING, "") 
		else (),
		if ($PK eq true() and ($required eq false() or $array eq true())) then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ONE, "PK") 
		else (),
		if ($semIRI eq true() and ($required eq false() or $array eq true())) then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ONE, "semIRI") 
		else (),
		if ($semLabel eq true() and ($required eq false() or $array eq true())) then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ZERO-ONE, "semIRI") 
		else (),
		if ($xURI eq true() and ($required eq false() or $array eq true())) then
			pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ZERO-ONE, "xURI") 
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
			let $assocClass := $profileForm/classes/Class[associationClass/end/@class eq $class/@name and associationClass/end/@attribute eq $attrib/@name]
			return 
				if (exists($assocClass)) then (concat("#/definitions/", $assocClass/@name), "$ref")
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
