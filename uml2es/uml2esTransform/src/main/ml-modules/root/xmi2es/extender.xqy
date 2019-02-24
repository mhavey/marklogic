(:
This module builds an "Extended" ES model, which consists of:
- Descriptor (JSON)
- Semantic triples describing additional aspects of the model, which are NOT captured in the descriptor. 
:)

xquery version "1.0-ml";

module namespace xes = "http://marklogic.com/xmi2es/extender"; 

import module namespace sem = "http://marklogic.com/semantics" at "/MarkLogic/semantics.xqy";
import module namespace pt = "http://marklogic.com/xmi2es/problemTracker" at "/xmi2es/problemTracker.xqy";

declare namespace error = "http://marklogic.com/xdmp/error";

declare variable $DEFAULT-NAMESPACE := "http://example.org/Example-1.0.0";
declare variable $DEFAULT-MODEL := "zzz";
declare variable $DEFAULT-VERSION := "0.0.1";

declare variable $IRI-PREFIX := "http://marklogic.com/xmi2es/xes#";

declare variable $OBJ-BLANK := sem:iri($IRI-PREFIX || "blank"); 
declare variable $OBJ-BAD := sem:iri($IRI-PREFIX || "badIRI"); 

declare variable $PRED-FUNCTION := sem:iri($IRI-PREFIX || "hasFunction");
declare variable $PRED-BASED-ON-ATTRIBUTE := sem:iri($IRI-PREFIX || "basedOnAttribute");

declare variable $PRED-REMINDER := sem:iri($IRI-PREFIX || "reminder"); 
 
declare variable $PRED-COLLECTIONS := sem:iri($IRI-PREFIX || "collections");
declare variable $PRED-PERM := sem:iri($IRI-PREFIX || "perm");
declare variable $PRED-CAPABILITY := sem:iri($IRI-PREFIX || "capability");
declare variable $PRED-ROLE := sem:iri($IRI-PREFIX || "role");
declare variable $PRED-QUALITY := sem:iri($IRI-PREFIX || "quality");
declare variable $PRED-METADATA := sem:iri($IRI-PREFIX || "metadata");
declare variable $PRED-KEY := sem:iri($IRI-PREFIX || "key");
declare variable $PRED-VALUE := sem:iri($IRI-PREFIX || "value");

declare variable $PRED-EXCLUDES := sem:iri($IRI-PREFIX || "excludes");
declare variable $PRED-RESOLVED-TYPE := sem:iri($IRI-PREFIX || "resolvedType");
declare variable $PRED-RELATIONSHIP := sem:iri($IRI-PREFIX || "relationship");
declare variable $PRED-TYPE-IS-REFERENCE := sem:iri($IRI-PREFIX || "typeIsReference");
declare variable $PRED-TYPE-REFERENCE := sem:iri($IRI-PREFIX || "reference");
declare variable $PRED-ASSOCIATION-CLASS := sem:iri($IRI-PREFIX || "associationClass");
declare variable $PRED-IS-ASSOCIATION-CLASS := sem:iri($IRI-PREFIX || "isAssociationClass");
declare variable $PRED-IS-FK := sem:iri($IRI-PREFIX || "isFK");
declare variable $PRED-HAS-ASSOC-CLASS-END := sem:iri($IRI-PREFIX || "hasAssociationClassEnd");
declare variable $PRED-ASSOC-CLASS-END-ATTRIB := sem:iri($IRI-PREFIX || "associationClassEndAttribute");
declare variable $PRED-ASSOC-CLASS-END-CLASS := sem:iri($IRI-PREFIX || "associationClassEndClass");
declare variable $PRED-ASSOC-CLASS-END-FK := sem:iri($IRI-PREFIX || "associationClassEndFK");

declare variable $PRED-IS-BIZ-KEY := sem:iri($IRI-PREFIX || "isBizKey");
declare variable $PRED-IS-URI := sem:iri($IRI-PREFIX || "isURI");
declare variable $PRED-CALCULATION := sem:iri($IRI-PREFIX || "calculation");
declare variable $PRED-HEADER := sem:iri($IRI-PREFIX || "header");
declare variable $PRED-BASE-CLASS := sem:iri($IRI-PREFIX || "baseClass");

declare variable $PRED-IS-SEM-LABEL := sem:iri($IRI-PREFIX || "isSemLabel");
declare variable $PRED-SEM-PREFIXES := sem:iri($IRI-PREFIX || "semPrefixes");
declare variable $PRED-SEM-PREFIX := sem:iri($IRI-PREFIX || "semPrefix");
declare variable $PRED-SEM-REFERENCE := sem:iri($IRI-PREFIX || "semReference");
declare variable $PRED-IS-SEM-IRI := sem:iri($IRI-PREFIX || "isSemIRI");
declare variable $PRED-SEM-TYPE:= sem:iri($IRI-PREFIX || "semType");
declare variable $PRED-SEM-FACT := sem:iri($IRI-PREFIX || "semFact");
declare variable $PRED-SEM-S:= sem:iri($IRI-PREFIX || "semS");
declare variable $PRED-SEM-P := sem:iri($IRI-PREFIX || "semP");
declare variable $PRED-SEM-O := sem:iri($IRI-PREFIX || "semO");
declare variable $PRED-SEM-PREDICATE := sem:iri($IRI-PREFIX || "semPredicate");
declare variable $PRED-SEM-QUAL := sem:iri($IRI-PREFIX || "semPredicateQualifiedObject");

declare variable $LIB-SJS := "lib.sjs";
declare variable $LIB-XQY := "lib.xqy";

declare variable $NEWLINE := "&#10;";
declare variable $INDENT := "  ";

declare variable $NS-PREFIX := "umles";
declare variable $FUNCTION-HEADER := "setHeaders";
declare variable $FUNCTION-WRITER := "runWriter";
declare variable $FUNCTION-TRIPLES := "setTriples";
declare variable $FUNCTION-CALC := "doCalculation";

declare variable $MUSICAL-ANY := "any";
declare variable $MUSICAL-INT := "int";
declare variable $MUSICAL-IRI := "iri";
declare variable $MUSICAL-ISTRING := "istring";
declare variable $MUSICAL-XSTRING := "xstring";
declare variable $MUSICAL-STRING := "string";
declare variable $MUSICAL-XIANY := "xiany";
declare variable $MUSICAL-XIPANY := "xipany";

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

declare function xes:generateCode($xes as map:map) as map:map {

	let $codeMap := map:new((
		map:entry($LIB-XQY, ""),
		map:entry($LIB-SJS, "")
	))

	let $_ := (
		xes:generateModuleHeader($xes, $codeMap),
		xes:generateWriter($xes, $codeMap),
		xes:generateHeaders($xes, $codeMap), 
		xes:generateTriples($xes, $codeMap),
		xes:generateCalcs($xes, $codeMap),	
		xes:generateModuleTrailer($xes, $codeMap))

	return $codeMap
};

declare function xes:getDescriptor($xes as map:map) as json:object {
	map:get($xes, "descriptor")
};

declare function xes:setPrefixes($xes as map:map, $modelIRI as sem:iri, $prefixes as map:map) as empty-sequence() {
	let $fullPrefixes := map:new((sem:prefixes(), $prefixes))
	let $_ := map:put($xes, "specifiedPrefixes", $prefixes)
	let $_ := map:put($xes, "prefixes", $fullPrefixes)

	for $p in map:keys($prefixes) return
	    xes:addQualifiedFact($xes, $modelIRI, $PRED-SEM-PREFIXES, (), map:new((
	   		map:entry($PRED-SEM-PREFIX, $p),
	    	map:entry($PRED-SEM-REFERENCE,map:get($prefixes, $p)))))
};

(: Take fully-qualified or curie IRI and convert to sem:iri :)
declare function xes:resolveIRI($xes as map:map, $val as xs:string, $subjectOfProblem as sem:iri) as sem:iri {

	let $prefixes := map:get($xes, "prefixes")
	return
		if (starts-with($val, "_:")) then sem:bnode() (: what we return doesn't matter; we just need to know it's blank :)
		else
			try {
			  sem:curie-expand($val, $prefixes)
			}
			catch($e) {
				try {
		            sem:curie-expand(sem:curie-shorten(sem:iri($val), $prefixes), $prefixes)
				}
				catch($e2) {
					let $_ := pt:addProblem(map:get($xes,  "problems"), $subjectOfProblem, (), $pt:ILLEGAL-MUSICAL, 
						concat($MUSICAL-IRI, "*", $val, "*", string($e2//error:code)))
					return sem:iri($OBJ-BAD)
				}
			}
};

(:
Add a fact to the extended model.
:)
declare function xes:addFact($xes as map:map,
	$subjectIRI as sem:iri, $predicateIRI as sem:iri, $objectMusicalType as xs:string?,
	$object as xs:anyAtomicType) as empty-sequence() {

	let $triples := map:get($xes, "triples")
	let $problems := map:get($xes,  "problems")
	return 
		if (not($subjectIRI)) then
			pt:addProblem($problems, $subjectIRI, (), $pt:ILLEGAL-XES-TRIPLE, "no subject") 
		else if (not($predicateIRI)) then
			pt:addProblem($problems, $subjectIRI, (), $pt:ILLEGAL-XES-TRIPLE, "no predicate") 
		else
			if (string(xdmp:type($object)) eq "array") then
				let $list := sem:bnode()
				let $_ := json:array-push($triples, sem:triple($subjectIRI, $predicateIRI, $list))
				let $json-values := json:array-values($object)
				for $obj at $pos in $json-values return
					(
						json:array-push($triples, sem:triple($list, sem:curie-expand("rdf:first"), 
							xes:resolveFactObject($xes, $subjectIRI, $predicateIRI, $objectMusicalType, $obj))),
						if ($pos lt count($json-values)) then 
							let $newList := sem:bnode()
							let $_ := json:array-push($triples, sem:triple($list, sem:curie-expand("rdf:rest"), $newList))
							let $list := xdmp:set($list, $newList)
							return ()
						else 
							json:array-push($triples, sem:triple($list, sem:curie-expand("rdf:rest"), sem:curie-expand("rdf:nil")))

					)
			else 
				json:array-push($triples, sem:triple($subjectIRI, $predicateIRI, 
					xes:resolveFactObject($xes, $subjectIRI, $predicateIRI, $objectMusicalType, $object)))
};

(:
Add qualified fact to the extended model.
:)
declare function xes:addQualifiedFact($xes as map:map,
	$subjectIRI as sem:iri, $predicateIRI as sem:iri, $objectMusicalTypes as map:map?, $qualifiedMap as map:map) 
	as empty-sequence() {

	let $qobj := sem:bnode()
	let $_ := xes:addFact($xes, $subjectIRI, $predicateIRI, $MUSICAL-ANY, $qobj)
	for $pred in map:keys($qualifiedMap) return 
		xes:addFact($xes, $qobj, sem:iri($pred), 
			(map:get($objectMusicalTypes, $pred), xes:musicalType($predicateIRI))[1], map:get($qualifiedMap, $pred))
};

(:
Parse and validate extender params. Return map entry for them. Params:
lax: true/false
:)
declare function xes:getParams($param as xs:string?) as map:map {
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

declare function xes:resolveBaseURI($xes, $baseURI as xs:string?) as xs:string {
	let $problems := map:get($xes, "problems")
	return 
		if (xes:emptyString($baseURI)) then 
			let $_ := pt:addProblem($problems, (), (), $pt:MODEL-BASE-URI-NOT-FOUND, ())
			return $DEFAULT-NAMESPACE
		else $baseURI
};

declare function xes:resolveVersion($xes, $version as xs:string?) as xs:string {
	let $problems := map:get($xes, "problems")
	return 
		if (xes:emptyString($version)) then 
			let $_ := pt:addProblem($problems, (), (), $pt:MODEL-VERSION-NOT-FOUND, ())
			return $DEFAULT-VERSION
		else $version
};

(:
TODO - hash vs slash on just modelIRI.
<http://com.marklogic.es.uml.hr#HR-0.0.1>
<http://com.marklogic.es.uml.hr/HR-0.0.1/Address>
:)

declare function xes:modelIRI($xes, $modelName as xs:string, $baseURI as xs:string?, $version as xs:string?) as sem:iri {
    sem:iri(concat($baseURI, "/", $modelName, "-", $version))
};

declare function xes:classIRI($xes, $modelIRI as xs:string, $className as xs:string) as sem:iri {
	sem:iri(concat($modelIRI, "/", $className))
};

declare function xes:attribIRI($xes, $classIRI as xs:string, $attribName as xs:string) as sem:iri {
	sem:iri(concat($classIRI, "/", $attribName))
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

	let $_ := map:put($xes, "profileForm", $profileForm) (: keep for later :)

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
	return ()
};

(:
Private Interface
:)

declare function xes:musicalType($predicateIRI as sem:iri) as xs:string {
	if ($predicateIRI eq $PRED-COLLECTIONS) then $MUSICAL-XSTRING
	else if ($predicateIRI eq $PRED-CALCULATION) then $MUSICAL-XSTRING
	else if ($predicateIRI eq $PRED-HEADER) then $MUSICAL-XSTRING
	else if ($predicateIRI eq $PRED-SEM-TYPE) then $MUSICAL-IRI
	else if ($predicateIRI eq $PRED-SEM-PREDICATE) then $MUSICAL-IRI
	else if ($predicateIRI eq $PRED-SEM-FACT) then $MUSICAL-XIANY
	else if ($predicateIRI eq $PRED-SEM-QUAL) then $MUSICAL-XIPANY
	else if ($predicateIRI eq $PRED-QUALITY) then $MUSICAL-INT
	else $MUSICAL-ANY
};

declare function xes:resolveFactObject($xes, $subjectIRI as sem:iri, $predicateIRI as sem:iri, 
	$objectMusicalType as xs:string?, $object as xs:anyAtomicType) {

	let $musicalType := ($objectMusicalType, xes:musicalType($predicateIRI))[1]
let $_:= xdmp:log("ADDFACT *" || $predicateIRI || "*" || $musicalType || "*" || $object || "*")
	return 
		if ($musicalType eq $MUSICAL-IRI) then 
			let $iri := xes:resolveIRI($xes, $object, $subjectIRI)
			return 
				if (sem:isBlank($iri)) then sem:iri($OBJ-BLANK || "_" || $object)
				else $iri
		else if ($musicalType eq $MUSICAL-ISTRING) then 
			if (fn:starts-with($object, '"') and fn:ends-with($object, '"') or 
				fn:starts-with($object, "'") and fn:ends-with($object, "'")) 
			then fn:substring($object, 2, string-length($object) - 2)
			else xes:resolveFactObject($xes, $subjectIRI, $predicateIRI, $MUSICAL-IRI, $object)
		else if ($musicalType eq $MUSICAL-XSTRING or $musicalType eq $MUSICAL-XIANY or $musicalType eq $MUSICAL-XIPANY) then
			if (starts-with($object, '$')) then
				if (starts-with($object, "$iri") and $object ne "$iri") then 
					try {
						let $iriVal := xes:parseDollar($xes, "iri", $object)
						return xes:resolveFactObject($xes, $subjectIRI, $predicateIRI, $MUSICAL-IRI, $iriVal)
					} catch($e) {
						$object
					}
				else $object
			else if ($musicalType eq $MUSICAL-XSTRING) then $object
			else if	(fn:starts-with($object, '"') and fn:ends-with($object, '"') or 
				fn:starts-with($object, "'") and fn:ends-with($object, "'")) then $object
			else 
				let $si := xes:castInteger($xes, $object) 
				let $sd := xes:castDecimal($xes, $object)
				let $sb := xes:castBoolean($xes, $object)
				return 
					if (count($si) eq 1) then $si
					else if (count($sd) eq 1) then $sd
					else if (count($sb) eq 1) then $sb
					else xes:resolveFactObject($xes, $subjectIRI, $predicateIRI, $MUSICAL-IRI, $object)
		else if ($musicalType eq $MUSICAL-INT) then 
			let $si := xes:castInteger($xes, $object) 
			return 
				if (count($si) eq 1) then $si 
				else 
					let $_ := pt:addProblem(map:get($xes,  "problems"), $subjectIRI, (), $pt:ILLEGAL-MUSICAL, 
						concat($MUSICAL-IRI, " illegal int *", $object, "*"))
					return 0
		else $object
};

declare function xes:transformModel($xes as map:map, $profileForm as node()) as empty-sequence() {
	let $problems := map:get($xes, "problems")
	let $descriptor := map:get($xes, "descriptor")

    let $modelJson := json:object()
    let $classesJson := json:object()
    let $_ := map:put($descriptor, "info", $modelJson)
	return (
		map:put($xes, "ns", string($profileForm/IRI)),
		map:put($modelJson, "title", string($profileForm/name)),
    	map:put($modelJson, "version", string($profileForm/version)), 
    	map:put($modelJson, "baseUri", string($profileForm/baseURI)), 
    	map:put($modelJson, "description", string($profileForm/description)),
    	map:put($descriptor, "definitions", $classesJson))
};

declare function xes:transformClass($xes as map:map, $profileForm as node(),  
	$class as node()) as empty-sequence() {

	let $problems := map:get($xes, "problems")
	let $classesJson := map:get(map:get($xes, "descriptor"), "definitions")
	let $classIRI := $class/IRI

	(: Gather the info about the class :)
	let $attribsJson := json:object()
	let $classJson := json:object()
	let $allAttribs := $class/attributes/Attribute
	let $includes := $allAttribs[exclude/text() eq false()]
	let $pks := $includes[PK/text() eq true()]/name/text()
	let $requireds := $includes[required/text() eq true()]/name/text()
	let $paths := $includes[pathRangeIndex/text() eq true()]/name/text()
	let $elements :=$includes[elementRangeIndex/text() eq true()]/name/text()
	let $lexicons := $includes[wordLexicon/text() eq true()]/name/text()
	let $piis := $includes[pii/text() eq true()]/name/text()

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
	let $attribIRI := $attrib/IRI
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
	let $_ := xes:addFact($xes, $attribIRI, $PRED-RESOLVED-TYPE, (), $type[1])
	
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
			map:put($attribsJson, $attrib/name/text(), $attribJson),
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

	let $problems := map:get($xes,  "problems")

	let $attribIRI := $attrib/IRI
	let $type := string($attrib/type)
	return 
		if (string-length($attrib/esProperty/@mlType) gt 0) then ($attrib/esProperty/@mlType, "datatype")
		else if (string-length($attrib/esProperty/@externalRef) gt 0) then ($attrib/esProperty/@externalRef, "$ref")
		else if ($attrib/typeIsReference/text() eq true()) then
			if (string-length(string($attrib/associationClass)) gt 0) then (concat("#/definitions/", string($attrib/associationClass)), "$ref")
			else if ($attrib/FK/text() eq true()) then
				let $refClass :=  $profileForm/classes/Class[name eq string($attrib/type)]
				let $refPKAttrib := $refClass/attributes/Attribute[PK/text() eq true()]
				return 
					if (count($refPKAttrib) ne 1) then 
						let $_ := pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-BROKEN-FK, "unable to find PK of ref")
						return (concat("broken FK: ", $type), "datatype")
					else
						let $refType := xes:resolveType($xes, $profileForm, $refClass, $refPKAttrib)
						return
							if ($refType[2] eq "$ref") then 
								let $_ := pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-BROKEN-FK, "PK of ref must be primitive")
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

(:
HERE IS THE CODEGEN PART.
This part is based on extended model, so it's all triples.
Should use SPARQL, but we are missing a portion of the model, namely the part ES generates automatically.
We don't get that part until we actually deploy the model. So we're too early. 
Unfortunately that extra part includes the crucial predicate that says a class contains an attribute 
(the "http://marklogic.com/entity-services#property" predicate). We need that to figure out class/attrib
relationships during codegen. 

Solution: Just wrap the triples we do have in an XML root and do XPath to find what we need.
For class/attrib rel, cheat and use starts-with. An attribute's IRI starts with the class's IRI.
:)
declare function xes:generateModuleHeader($xes as map:map, $codeMap as map:map) as empty-sequence() {
	let $ns := 	map:get($xes, "ns")

	let $prefixMap := map:get($xes, "prefixes")
	let $prefixRDFAMap := map:get($xes, "specifiedPrefixes")
	let $prefixesRDFa := for $pkey in map:keys($prefixRDFAMap) return concat($pkey, ": ", map:get($prefixRDFAMap, $pkey))
	let $prefixesRDFA_SJS := string-join($prefixesRDFa, '\n')
	let $prefixesRDFA_XQY := string-join($prefixesRDFa, $NEWLINE)
	let $prefixList := for $p in map:keys($prefixMap) return concat('"', $p, '"')
	let $allPrefixesSJS := concat('[', string-join($prefixList, ',') ,']')
	let $allPrefixesXQY := concat('(', string-join($prefixList, ',') ,')')

	let $_  := (
		xes:appendSourceLine($codeMap, $LIB-SJS, concat('const sem = require("/MarkLogic/semantics.xqy");', $NEWLINE)),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat('xquery version "1.0-ml";', $NEWLINE)),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'module namespace ', $NS-PREFIX, ' = "', $ns, '";')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 
			'import module namespace sem = "http://marklogic.com/semantics" at "/MarkLogic/semantics.xqy";', 
			$NEWLINE)),
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'const PREFIX_RDFA = "', $prefixesRDFA_SJS, '";')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare variable $PREFIX-RDFA := "', $prefixesRDFA_XQY, '";')),
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'const PREFIX_MAP = sem.prefixes(PREFIX_RDFA);')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare variable $PREFIX-MAP := sem:prefixes($PREFIX-RDFA);')),
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'const PREFIXES = ', $allPrefixesSJS, ';')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare variable $PREFIXES := ', $allPrefixesXQY, ';')),
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'const IRI_TYPE = sem.curieExpand("rdf:type");')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare variable $IRI-TYPE := sem:curie-expand("rdf:type");')),
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'const IRI_LABEL = sem.curieExpand("rdfs:label");')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare variable $IRI-LABEL := sem:curie-expand("rdfs:label");')),
		xes:appendSourceLine($codeMap, $LIB-SJS, $NEWLINE),
		xes:appendSourceLine($codeMap, $LIB-XQY, $NEWLINE),
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, '
function dynIRI(expr) {
   if (!expr || expr == null) return null;
   var type = xdmp.type(expr)
   if (type == "array") {
    var arr = [];
    for (var i = 0; i < expr.length; i++) {
      var expri = dynIRI(expr[i]);
      if (expri &amp;&amp; expri != null) arr.push(expri);
    }
    return arr;
   }
   if (type == "iri" || type == "blank") return expr;
   if (type == "string") {
	   for (var i = 0; i < PREFIXES.length; i++) {
	      if (expr.startsWith(PREFIXES[i] + ":")) return sem.curieExpand(expr, PREFIX_MAP);	
	   }
	   return sem.iri(expr);
   }
   throw expr + " " + type;
}

function addTriple(ret, s, p, o) {
  if (!s || s== null || !p || p == null || !o || o == null) return;
  if (xdmp.type(o) == "array") {
    for (var i = 0; i < o.length; i++) addTriple(ret, s, p, o[i]);
  }
  else ret.push(sem.triple(s,p,o));    
}
')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, '
declare function ', $NS-PREFIX, ':dynIRI($expr) as sem:iri* {
   if (not(exists($expr))) then ()
   else if (count($expr) gt 1) then for $t in $expr return ', $NS-PREFIX, ':dynIRI($t)
   else
      let $type := string(xdmp:type($expr))
      return
        if ($type eq "iri" or $type eq "blank") then $expr
        else if ($type eq "string") then 
           let $iri := sem:iri($expr)
           let $_ := for $p in $PREFIXES return 
              if (starts-with($expr, concat($p, ":"))) then xdmp:set($iri, sem:curie-expand($expr, $PREFIX-MAP))
              else ()
           return $iri
        else fn:error(xs:QName("ERROR"), $expr || " " || $type)
};

declare function ', $NS-PREFIX, ':addTriple($ret as json:array, $s, $p, $o) as empty-sequence() {
  if (not(exists($s)) or not(exists($p)) or not(exists($o))) then ()
  else for $oi in $o return json:array-push($ret, sem:triple($s, $p, $oi))   
};
'))
	)
	return  map:put($xes, $LIB-SJS, json:array()) (: here is where we keep list of exported sjs functions :)
};

declare function xes:generateModuleTrailer($xes as map:map, $codeMap as map:map) as empty-sequence() {
	let $profileForm := map:get($xes, "profileForm")
	let $modelIRI := $profileForm/IRI/text()
	let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'module.exports = {'))
	let $functions := if (map:contains($xes, $LIB-SJS)) then json:array-values(map:get($xes, $LIB-SJS)) else ()
	let $_ :=  for $f at $pos in $functions return (
		xes:addFact($xes, $modelIRI, $PRED-FUNCTION, "string", $f),
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, $f, ":", $f, 
			if ($pos lt count($functions)) then "," else ""))
	)
	return xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, '};'))
};

declare function xes:generateHeaders($xes as map:map, $codeMap as map:map) as empty-sequence() {

(: 
Sub-document approach.
This code generator doesn't know if you also need to grab headers from subobjects.
It could try to guess by looking at model relationships, but that's a gamble. 
Example: Employee refers to Department, but Employee and Department are separate envelopes. 
Employee envelope should NOT contain Department headers.
If you want to build an envelope that contains headers for both A and B, you can piece it together from 
this generated code as follows:

var aHeaders = setHeaders_A(id, content, headers, options); // calling generated function
var bContent = content.b;
var bOptions = options.b;
aHeaders.b = setHeaders_B(A, bContent, headers, bOptions); // calling generated function
return aHeaders;
:)


	let $triples := <triples>{json:array-values(map:get($xes, "triples"))}</triples>
	let $attribTriples := $triples/sem:triple[sem:predicate eq string($PRED-HEADER)]
	let $headerClasses := fn:distinct-values(for $t in $attribTriples/sem:subject/text() return string-join(fn:tokenize($t, "/")[1 to last() - 1], "/"))
	for $classIRI in $headerClasses
		let $className := fn:tokenize($classIRI, "/")[last()]
		let $classIRIx := concat($classIRI, "/")
		let $sjsFunction := concat($FUNCTION-HEADER, "_", $className)
		let $_ := xes:addSJSFunction($xes, $sjsFunction)
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, content, ioptions, lang) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ":", $sjsFunction, 
			'($id as xs:string, $content as item()?, $ioptions as map:map, $lang as xs:string) as node()* {'))

		(: Determine population of header fields from UML model :)
		let $jBody := ""
		let $xxBody := ""
		let $xjBody := ""
		let $headersInClass:= $triples/sem:triple[sem:predicate eq string($PRED-HEADER) and starts-with(sem:subject, $classIRIx)]
		let $_ := for $triple at $pos in $headersInClass return
			let $moreToCome := $pos lt count($headersInClass)
			let $attribIRI := $triple/sem:subject/text()
			let $attribName := fn:tokenize($attribIRI, "/")[last()]
			let $val := xes:getAttribForModule($xes, $triples, $attribIRI)
			let $field := 
				let $p := xes:parseXString($xes, $attribIRI, string($triple/sem:object))
				return
					if ($p[1] eq "attribute") then xes:getAttribForModule($xes, $triples, $p[2])
					else (concat('"', $p[2], '"'), concat('"', $p[2], '"'))
			let $_ := xdmp:set($jBody, concat($jBody, $NEWLINE, $INDENT, 'ret[', $field[1], '] = ', $val[1], ';'))
			let $_ := xdmp:set($xxBody, concat($xxBody, $NEWLINE, $INDENT, $INDENT, 'element {', $field[2], '} {', $val[2], '}',
				if ($moreToCome) then ',' else ""))
			let $_ := xdmp:set($xjBody, concat($xjBody, $NEWLINE, $INDENT, $INDENT, 'object-node {', $field[2], ' : ', $val[2], '}', 
				if ($moreToCome) then " , " else ""))
			return ()

		return (
			(: SJS headers :)
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, "var ret = {};")),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'ret.lastHarmonizeTS = new Date();')),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'ret.entityType = "', $className, '";')),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'ret.sourceDocument= id;')),
			xes:appendSourceLine($codeMap, $LIB-SJS, $jBody),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'return ret;')),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, '}')),

			(: XQY headers - XML, JSON:)
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'if ($lang eq "xml") then (')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, $INDENT, 'element {"lastHarmonizeTS"} {fn:current-dateTime()},')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, $INDENT, 'element {"entityType"} {"', $className, '"},')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, $INDENT, 'element {"sourceDocument"} {$id},')),
			xes:appendSourceLine($codeMap, $LIB-XQY, $xxBody),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, ")")),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'else if ($lang eq "json") then (')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, $INDENT, 'object-node {"lastHarmonizeTS" : fn:current-dateTime()},')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, $INDENT, 'object-node {"entityType" : "', $className, '"} ,')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, $INDENT, 'object-node {"sourceDocument": $id },')),
			xes:appendSourceLine($codeMap, $LIB-XQY, $xjBody),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, ")")),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'else fn:error(xs:QName("ERROR"), "illegal lang *" || $lang || "*")')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, '};'))
		)
};

declare function xes:generateWriter($xes as map:map, $codeMap as map:map) as empty-sequence() {
	let $triples:= <triples>{json:array-values(map:get($xes, "triples"))}</triples>

	let $classTriples := $triples/sem:triple[
		sem:predicate eq string($PRED-COLLECTIONS) or sem:predicate eq string($PRED-PERM) or 
		sem:predicate eq string($PRED-QUALITY) or sem:predicate eq string($PRED-METADATA)]
	let $attribTriples := $triples/sem:triple[sem:predicate eq string($PRED-IS-URI)]
	let $writerClasses := fn:distinct-values((
		for $t in $classTriples/sem:subject/text() return $t,
		for $t in $attribTriples/sem:subject/text() return string-join(fn:tokenize($t, "/")[1 to last() - 1], "/")))
	for $classIRI in $writerClasses
		let $className := fn:tokenize($classIRI, "/")[last()]
		let $classIRIx := concat($classIRI, "/")
		let $sjsFunction := concat($FUNCTION-WRITER, "_", $className)
		let $_ := xes:addSJSFunction($xes, $sjsFunction)
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, envelope, ioptions) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ":", $sjsFunction, 
			'($id as xs:string, $envelope as item(), $ioptions as map:map) as empty-sequence() {'))

		(: get content portion, in case we need it :)
		(: TODO does this work????? :)
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var content = envelope.instance;'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $content := $envelope/instance'))

		(: URI :)
		let $tXURI := $triples/sem:triple[sem:predicate eq string($PRED-IS-URI) and contains(sem:subject/text(), $classIRI)]
		let $xuriVal :=
			if (count($tXURI) ne 1) then ("id", "$id")
			else 
				let $attribName := fn:tokenize($tXURI/sem:subject/text(), "/")[last()]
				return xes:getAttribForModule($xes, $triples, $tXURI/sem:subject/text())
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var uri = ', $xuriVal[1], ';'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $uri := ', $xuriVal[2]))

		(: options :)
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var dioptions = {};'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $dioptions := map:map()'))

		(: collections :)
		let $colls := $triples/sem:triple[sem:predicate eq string($PRED-COLLECTIONS) and sem:subject/text() eq $classIRI]
		let $_ := 
			if (count($colls) gt 0) then
				let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var collections = [];'))
				let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $collections := json:array()'))
				let $_ := for $coll in $colls/sem:object/text()
					let $field := xes:parseXString($xes, $classIRI, $coll)
					let $val := 
						if ($field[1] eq "attribute") then xes:getAttribForModule($xes, $triples, $field[2])
						else (concat('"', $field[2], '"'), concat('"', $field[2], '"'))
					return (
						xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'collections.push(', $val[1], ');')),
						xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := json:array-push($collections, ', $val[2], ')'))
					)
				return (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'dioptions.collections = collections;')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($dioptions, "collections", json:array-values($collections))'))
				)
			else (
				xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'dioptions.collections = "', $className, '"')),
				xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($dioptions, "collections", "', $className, '")'))
			)

		(: perms :)
		let $perms := $triples/sem:triple[sem:predicate eq string($PRED-PERM) and sem:subject/text() eq $classIRI]
		let $_ := 
			if (count($perms) gt 0) then
				let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var perms = [];'))
				let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $perms := json:array()'))
				let $_ := for $perm in $perms/sem:object/text()
					let $role := $triples/sem:triple[sem:subject/text() eq $perm and sem:predicate/text() eq string($PRED-ROLE)]/sem:object/text()
					let $capability := $triples/sem:triple[sem:subject/text() eq $perm  and sem:predicate/text() eq string($PRED-CAPABILITY)]/sem:object/text()
					return (
						xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'perms.push(xdmp.permission("', $role, '","', $capability, '"));')),
						xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := json:array-push($perms, xdmp:permission("', $role, '","', $capability, '"))'))
					)
				return (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'dioptions.permissions = perms;')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($dioptions, "permissions", json:array-values($perms))'))
				)
			else (
				xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'dioptions.permissions = xdmp.defaultPermissions();')),
				xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($dioptions, "permissions", xdmp:default-permissions())'))
			)

		(: metadata :)
		let $mds := $triples/sem:triple[sem:predicate eq string($PRED-METADATA) and sem:subject/text() eq $classIRI]
		let $_ := 
			if (count($mds) gt 0) then
				let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var mds = {};'))
				let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $perms := map:map()'))
				let $_ := for $md in $mds/sem:object/text()
					let $k := $triples/sem:triple[sem:subject/text() eq $md and sem:predicate/text() eq string($PRED-KEY)]/sem:object/text()
					let $v := $triples/sem:triple[sem:subject/text() eq $md  and sem:predicate/text() eq string($PRED-VALUE)]/sem:object/text()
					return (
						xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'mds["', $k, '"] = "', $v, '";')),
						xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($mds, "', $k, '", "', $v, '")'))
					)
				return (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'dioptions.metadata = mds;')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($dioptions, "metadata", $mds)'))
				)
			else ()

		(:quality:)
		let $qual := $triples/sem:triple[sem:predicate eq string($PRED-QUALITY) and sem:subject/text() eq $classIRI]
		let $_ := 
			if (count($qual) eq 1) then
				let $val := $qual/sem:object/text()
				return (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'dioptions.quality = ', $val, ';')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($dioptions, "quality", ', $val, ')'))
				)
			else ()

		(: insert and close :)
		return (
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'xdmp.documentInsert(uri, envelope, dioptions);')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'return xdmp:document-insert($uri, $envelope, $dioptions)')),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, '}')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, '};'))
		)
};

declare function xes:generateTriples($xes as map:map, $codeMap as map:map) as empty-sequence() {

(: 
Sub-document approach.
This code generator doesn't know if you also need to grab triples from subobjects.
It could try to guess by looking at model relationships, but that's a gamble. 
Example: Employee refers to Department, but Employee and Department are separate envelopes. 
Employee envelope should NOT contain Department triples.
If you want to build an envelope that contains triples for both A and B, you can piece it together from 
this generated code as follows:

var aTriples = setTriples_A(id, content, headers, options); // calling generated function
var bContent = content.b;
var bOptions = options.b;
var bTriples = setTriples_B(A, bContent, headers, bOptions); // calling generated function
return aTriples.concat(bTriples);
:)

	let $triples:= <triples>{json:array-values(map:get($xes, "triples"))}</triples>

	(: RDF Builder is needed because there are lots of dynamic IRIs, some fully qualified, others in curie notation.
	   The builder takes care of all that.
	:)
	let $classTriples := $triples/sem:triple[
		sem:predicate eq string($PRED-SEM-TYPE) or sem:predicate eq string($PRED-SEM-FACT)]
	let $attribTriples := $triples/sem:triple[
		sem:predicate eq string($PRED-IS-SEM-IRI) or sem:predicate eq string($PRED-IS-SEM-LABEL) or
		sem:predicate eq string($PRED-SEM-PREDICATE) or sem:predicate eq string($PRED-SEM-QUAL)]
	let $semClasses := fn:distinct-values((
		for $t in $classTriples/sem:subject/text() return $t,
		for $t in $attribTriples/sem:subject/text() return string-join(fn:tokenize($t, "/")[1 to last() - 1], "/")))
	for $classIRI in $semClasses
		let $className := fn:tokenize($classIRI, "/")[last()]
		let $classIRIx := concat($classIRI, "/")
		let $sjsFunction := concat($FUNCTION-TRIPLES, "_", $className)
		let $_ := xes:addSJSFunction($xes, $sjsFunction)
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, content, headers, ioptions) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ":", $sjsFunction, 
			'($id as xs:string, $content as item()?, $headers as item()*, $ioptions as map:map) as sem:triple* {'))

		let $placeholders:= map:map()

		(: IRI :)
		let $tSemIRI := $triples/sem:triple[sem:predicate eq string($PRED-IS-SEM-IRI) and starts-with(sem:subject, $classIRIx)]
		let $iriVal :=
			if (count($tSemIRI) ne 1) then ('"unknown"', '"unknown"')
			else xes:getAttribForModule($xes, $triples, $tSemIRI/sem:subject/text(), true(), true(), ())
		let $_ := (
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var iri = ', $iriVal[1], ';')),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var ret = [];')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $iri := ', $iriVal[2])),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $ret := json:array()'))
		)

		(: Label :)
		let $tSemLabel:= $triples/sem:triple[sem:predicate eq string($PRED-IS-SEM-LABEL) and starts-with(sem:subject, $classIRIx)]
		let $_ := 
			if (count($tSemLabel) ne 1) then ()
			else 
				let $label :=xes:getAttribForModule($xes, $triples, $tSemLabel/sem:subject/text())
				return (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
						'addTriple(ret,iri, IRI_LABEL,', $label[1], ');')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
						'let $_ := ', $NS-PREFIX, ':addTriple($ret, $iri, $IRI-LABEL,', $label[2], ')'))
				)

		(: Types :)
		let $tSemTypes:= $triples/sem:triple[sem:predicate eq string($PRED-SEM-TYPE) and sem:subject eq $classIRI]
		let $_ := for $tt in $tSemTypes return (
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
				'addTriple(ret, iri, IRI_TYPE, sem.iri("', $tt/sem:object/text(), '"));')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
				'let $_ := ', $NS-PREFIX, ':addTriple($ret, $iri, $IRI-TYPE, sem:iri("', $tt/sem:object/text(), '"))'))
			)

		(: Facts :)
		let $tSemFacts:= $triples/sem:triple[sem:predicate eq string($PRED-SEM-FACT) and sem:subject eq $classIRI]/sem:object
		let $_ := for $tf in $tSemFacts 
			let $fs := $triples/sem:triple[sem:subject eq string($tf) and sem:predicate eq string($PRED-SEM-S)]/sem:object
			let $fp := $triples/sem:triple[sem:subject eq string($tf) and sem:predicate eq string($PRED-SEM-P)]/sem:object
			let $fo := $triples/sem:triple[sem:subject eq string($tf) and sem:predicate eq string($PRED-SEM-O)]/sem:object

			let $fsVal := xes:buildSemSPParameter($xes, $codeMap, $triples, $classIRI, $classIRI, ("iri", "$iri"), $fs,  false(), $placeholders)
			let $fpVal := xes:buildSemSPParameter($xes, $codeMap, $triples, $classIRI, $classIRI, ("bug", "bug"), $fp,  false(), $placeholders)
			let $foVal := xes:buildSemOParameter($xes, $codeMap, $triples, $classIRI, $classIRI, ("bug", "bug"), $fo,  false(), $placeholders)
			return  (					
				xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
					'addTriple(ret, ', $fsVal[1], ',', $fpVal[1], ',', $foVal[1], ');')),
				xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
					'let $_ := ', $NS-PREFIX, ':addTriple($ret, ', $fsVal[2], ',', $fpVal[2], ',', $foVal[2], ')'))
			)

		(: Properties :)
		let $tSemPreds:= $triples/sem:triple[sem:predicate eq string($PRED-SEM-PREDICATE) and starts-with(sem:subject, $classIRIx)]
		let $_ := for $pp in $tSemPreds return
			let $attribIRI := $pp/sem:subject/text()
			let $pred := $pp/sem:object/text()
			let $qualifiedObj := $triples/sem:triple[sem:predicate eq string($PRED-SEM-QUAL) and sem:subject eq $pp/sem:subject]/sem:object

			(: 
			Rules for object:
			1. If qualified is defined, it's a new blank node. The qualification triples reference that blank node as subject.
			2. Otherwise, it's the value of this attribute. If the attribute's type is IRI or object reference, it is an IRI. 
			If the attribute's type is a primitive, it's a literal.
			:)

			let $objName := concat("semProperty_", fn:tokenize($attribIRI, "/")[last()])

			let $_ := 
				if (count($qualifiedObj) gt 0) then (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var ', $objName, ' = sem.bnode();')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $', $objName, ' := sem:bnode()'))
				)
				else 
					let $attribVal := xes:getAttribForModule($xes, $triples, $attribIRI, true(), false(), ()) 
					return (
						xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var ', $objName, ' = ', $attribVal[1], ';')),
						xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $', $objName, ' := ', $attribVal[2]))
					)
			let $_ := (						
				xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
					'addTriple(ret, iri, sem.iri("', $pred, '"),', $objName, ');')),
				xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
					'let $_ := ', $NS-PREFIX, ':addTriple($ret, $iri, sem:iri("', $pred, '"), $', $objName, ')'))
			)

			(: Qualification for that property :)
			for $q in $qualifiedObj return 
				let $qs := $triples/sem:triple[sem:subject eq string($q) and sem:predicate eq string($PRED-SEM-S)]/sem:object
				let $qp := $triples/sem:triple[sem:subject eq string($q) and sem:predicate eq string($PRED-SEM-P)]/sem:object
				let $qo := $triples/sem:triple[sem:subject eq string($q) and sem:predicate eq string($PRED-SEM-O)]/sem:object

				let $qsVal := xes:buildSemSPParameter($xes, $codeMap, $triples, $attribIRI, $classIRI, ($objName, "$" || $objName), $qs, true(), $placeholders)
				let $qpVal := xes:buildSemSPParameter($xes, $codeMap, $triples, $attribIRI, $classIRI, ("bug", "bug"), $qp, true(), $placeholders)
				let $qoVal := xes:buildSemOParameter($xes, $codeMap, $triples, $attribIRI, $classIRI, ("bug", "bug"), $qo, true(), $placeholders)

				return  (					
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
						'addTriple(ret, ', $qsVal[1], ',', $qpVal[1], ',', $qoVal[1], ');')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
						'let $_ := ', $NS-PREFIX, ':addTriple($ret, ', $qsVal[2], ',', $qpVal[2], ',', $qoVal[2], ')'))
				)

		(: close :)
		return (
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'return ret;')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'return json:array-values($ret)')),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, '}')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, '};'))
		)
};

declare function xes:generateCalcs($xes as map:map, $codeMap as map:map) as empty-sequence() {
	let $triples:= <triples>{json:array-values(map:get($xes, "triples"))}</triples>
	let $attribsWithCalc := $triples/sem:triple[sem:predicate eq string($PRED-CALCULATION)]
	for $attrib in $attribsWithCalc
		let $attribIRI := $attrib/sem:subject/text()
		let $toks := fn:tokenize($attribIRI, "/")
		let $className := $toks[last() - 1]
		let $attribName := $toks[last()]
		let $sjsFunction := concat($FUNCTION-CALC, "_", $className, '_', $attribName)
		let $_ := xes:addSJSFunction($xes, $sjsFunction)
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, content, ioptions) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ':', $sjsFunction, 
			'($id as xs:string, $content as item()?, $ioptions as map:map) as empty-sequence() {'))

		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var c = "";'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $c :=  ""'))

		(: get the concat parts in order :)
		let $concats := json:array()
		let $_ := xes:retrieveList($concats, $triples, $attrib/sem:object/text())
		let $_ := for $concat in json:array-values($concats)
			let $cval := xes:parseXString($xes, $attribIRI, $concat)
			return 
				if ($cval[1] eq "attribute") then 
					let $attribVal := xes:getAttribForModule($xes, $triples, string-join($toks[1 to last() - 1], "/") || "/" || $cval[2])
					return (
						xes:addFact($xes, $attribIRI, $PRED-BASED-ON-ATTRIBUTE, "string", $cval[2]),
						xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'c += ', $attribVal[1], ';')),
						xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $c := concat($c, ', $attribVal[2], ')'))
					)
				else (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'c += ', $cval[2], ';')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $c := concat($c, ', $cval[2], ')'))
				)

		(: close out :)
		let $target := xes:assignAttribInModule($triples, $attribIRI, ("c", '$c'))
		return (
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, $target[1], ';')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'return ', $target[2])),
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, '}')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, '};'))
		)
};

declare function xes:retrieveList($concats as json:array, $triples, $listPointer as xs:string) as empty-sequence() {
	let $first := $triples/sem:triple[sem:subject eq $listPointer and 
		sem:predicate eq "http://www.w3.org/1999/02/22-rdf-syntax-ns#first"]/sem:object
	let $rest := $triples/sem:triple[sem:subject eq $listPointer and 
		sem:predicate eq "http://www.w3.org/1999/02/22-rdf-syntax-ns#rest"]/sem:object
	return
		if (exists($first)) then 
			let $_ := json:array-push($concats, string($first))
			return xes:retrieveList($concats, $triples, string($rest))
		else ()
};

declare function xes:emptyString($s) {
	not($s) or string-length($s) eq 0
};

declare function xes:appendSourceLine($codeMap, $key, $line) as empty-sequence() {
	let $code := map:get($codeMap, $key)
	return map:put($codeMap, $key, concat($code, $line))
};

(:
We want an attribute from either content or options. If the attribute it excluded it comes from options,
otherwise it's from content. Return both sjs and xqy expression.
:)
declare function xes:getAttribForModule($xes, $triples, $attribIRI as xs:string)  as xs:string+ {
	xes:getAttribForModule($xes, $triples, $attribIRI, false(), false(), ())
};

declare function xes:getAttribForModule($xes, $triples, $attribIRI, 
	$tryForIRI as xs:boolean, 
	$mustBeIRI as xs:boolean, 
	$expectedCardinality as xs:string?)  as xs:string+ {

	let $attribName := fn:tokenize($attribIRI, "/")[last()]
	let $profileForm := map:get($xes, "profileForm")
	let $attribInProfileForm := $profileForm//Class//Attribute[IRI eq $attribIRI]

	return 
		(: not even found - it's ok, we'll assume they'll provide an option for it :)
		if (string-length($attribInProfileForm/name/text()) eq 0) then 
			(concat('ioptions.', $attribName), concat('map:get($ioptions, "', $attribName, '")')) 

		(: found :)
		else 
			let $cardinality := 
				if ($attribInProfileForm/array/text() eq true()) then
					if ($attribInProfileForm/required/text() eq true()) then "+" 
					else "*"
				else
					if ($attribInProfileForm/required/text() eq true()) then "1"
					else "0" 
			let $isSemIRI := count($triples/sem:triple[sem:predicate eq string($PRED-IS-SEM-IRI) and sem:subject eq $attribIRI]) eq 1
			let $resolvedType:= $triples/sem:triple[sem:predicate eq string($PRED-RESOLVED-TYPE) and sem:subject eq $attribIRI]/sem:object/text()

			let $expr := 
				if (exists($triples/sem:triple[sem:object/text() eq $attribIRI and 
					sem:predicate/text() eq string($PRED-EXCLUDES)])) then
					( concat('ioptions.', $attribName), concat('map:get($ioptions, "', $attribName, '")') )
				else ( concat('content.', $attribName) , concat('map:get($content, "', $attribName, '")') )

			let $_ := 
				if (exists($expectedCardinality)) then
					if ($expectedCardinality eq $cardinality or 
						$expectedCardinality eq "*" or
						$expectedCardinality eq "+" or
						$cardinality eq "1" or $cardinality eq "0") then ()
					else 
						pt:addProblem(map:get($xes,  "problems"), sem:iri($attribIRI), (), $pt:ILLEGAL-CARDINALITY, 
						"actual *" || $cardinality || "* expected *" || $expectedCardinality || "*") 
				else ()

			(: special IRI handling, if requested :)
			return 
				if ($tryForIRI eq true()) then 
					if ($resolvedType eq "iri" or starts-with($resolvedType, "#/definitions/")) then xes:dynIRI($expr)
					else if ($resolvedType eq "string" and $isSemIRI eq true()) then xes:dynIRI($expr)
					else if ($mustBeIRI eq false()) then $expr
					else 
						let $_ := pt:addProblem(map:get($xes, "problems"), sem:iri($attribIRI), (), $pt:ILLEGAL-IRI-TYPE, $resolvedType)
						return $expr
				else $expr
	};

declare function xes:assignAttribInModule($triples, $attribIRI as xs:string, $val as xs:string+)  as xs:string+ {
	let $attribName := fn:tokenize($attribIRI, "/")[last()]
	return 
		if (exists($triples/sem:triple[sem:object/text() eq $attribIRI and 
			sem:predicate/text() eq string($PRED-EXCLUDES)])) then
			( concat('ioptions.', $attribName, ' = ', $val[1]), concat('map:put($ioptions, "', $attribName, '",', $val[2], ')'))
		else ( concat('content.', $attribName, ' = ', $val[1]) , concat('map:put($content, "', $attribName, '",', $val[2], ')'))
};

declare function xes:addSJSFunction($xes, $function as xs:string) as empty-sequence() {
	let $currList := map:get($xes, $LIB-SJS)
	let $_ := json:array-push($currList, $function)
	return map:put($xes, $LIB-SJS, $currList)
};

declare function xes:dynIRI($expression as xs:string+) as xs:string+ {
	(
		concat('dynIRI(', $expression[1], ')'),
		concat($NS-PREFIX, ':dynIRI(', $expression[2], ')')
	)
};

declare function xes:buildSemSPParameter($xes, $codeMap, $triples, $sourceIRI as xs:string, $parentIRI as xs:string?,
	$defaults as xs:string+, $spoFact, 
	$pMode as xs:boolean, $placeholders as map:map) {

	let $isO := false()
	return buildSemSPOParameter($xes, $codeMap, $triples, $sourceIRI, $parentIRI, $defaults, $spoFact, $pMode, $placeholders, $isO)
};

declare function xes:buildSemOParameter($xes, $codeMap, $triples, $sourceIRI as xs:string, $parentIRI as xs:string?,
	$defaults as xs:string+, $spoFact, 
	$pMode as xs:boolean, $placeholders as map:map) {

	let $isO := true()
	return buildSemSPOParameter($xes, $codeMap, $triples, $sourceIRI, $parentIRI, $defaults, $spoFact, $pMode, $placeholders, $isO)
};

declare function xes:buildSemSPOParameter($xes, $codeMap, $triples, $sourceIRI as xs:string, $parentIRI as xs:string?,
	$defaults as xs:string+, $spoFact, 
	$pMode as xs:boolean, $placeholders as map:map, $isO as xs:boolean) {

	let $attribMaxCardinality := if ($isO eq true()) then "*" else "1"
	let $attribMustBeIRI := if ($isO eq true()) then false() else true()
	let $attribTryIRI := true()

	return
		if (count($spoFact) ne 1) then $defaults
		else 
			let $parsed := xes:parseXiany($xes, $sourceIRI, $spoFact/text(), string($spoFact/@datatype), $pMode)
			let $tripleParam := 
				try {
					if ($parsed[1] eq "iri") then
						if (count($parsed) eq 1) then ("iri", "$iri") 
						else ('sem.iri("' || $parsed[2] || '")', 'sem:iri("' || $parsed[2] || '")')
					else if ($parsed[1] eq "blank") then 
						let $blank := concat("semPlaceholder_", $parsed[2])
						let $_ :=
							if (map:contains($placeholders, $blank)) then ()
							else (
								map:put($placeholders, $blank, $blank),
								xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, "var ", $blank, ' = sem.bnode();')),
								xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, "let $", $blank, ' := sem:bnode()'))
							)
						return ($blank, '$' || $blank)
					else if ($parsed[1] eq "sattribute" or $parsed[1] eq "attribute") then 
						xes:getAttribForModule($xes, $triples, concat($parentIRI, "/", $parsed[2]), 
							$attribTryIRI, $attribMustBeIRI, $attribMaxCardinality)
					else if ($parsed[1] eq "tattribute") then 
						let $replacer := "TODO - provide value of target attribute *" || $parsed[2] || "*"
						return '"' || $replacer || '"'
					else if ($parsed[1] eq "value") then 
						xes:getAttribForModule($xes, $triples, $sourceIRI,  
							$attribTryIRI, $attribMustBeIRI, $attribMaxCardinality)
					else if ($parsed[1] eq "integer" or $parsed[1] eq "decimal") then
						if ($isO eq false()) then fn:error(xs:QName("ERROR"), "IRI required, *" || $parsed[1] || "* found *" || $parsed[2] || "*")
						else ($parsed[2], $parsed[2])
					else if ($parsed[1] eq "boolean") then
						if ($isO eq false()) then fn:error(xs:QName("ERROR"), "IRI required, boolean found *" || $parsed[2] || "*")
						else ($parsed[2], $parsed[2] || "()")
					else if ($parsed[1] eq "string") then
						if ($isO eq false()) then fn:error(xs:QName("ERROR"), "IRI required, string found *" || $parsed[2] || "*")
						else ('"' || $parsed[2] || '"', '"' || $parsed[2] || '"')
					else fn:error(xs:QName("ERROR"), "cannot deal with " || $parsed)
				} catch($e) {
					let $problems := map:get($xes,  "problems")	
					let $err := string($e//error:code)
					let $_ := pt:addProblem($problems, sem:iri($sourceIRI), (), $pt:ILLEGAL-MUSICAL, "spo " || $err) 
					let $ret := '"error ' || $err || '"'
					return ($ret, $ret)
				}		

			return $tripleParam
};

declare function xes:parseXString($xes, $sourceIRI as xs:string?, $s as xs:string) as xs:string* {
	xes:parseXStringImpl($xes, $sourceIRI , $s, false())
};

declare function xes:parseXStringImpl($xes, $sourceIRI as xs:string?, $s as xs:string, $more as xs:boolean) as xs:string* {
	try {
		if (starts-with($s, "$attribute")) then ("attribute", xes:parseDollar($xes, "$attribute", $s))
		else if (starts-with($s, "$xqy") or starts-with($s, "$sjs")) then fn:error(xs:QName("ERROR"), "dynamic sjs/xqy not supported") 
 		else if (starts-with($s, "$") and not($more)) then fn:error(xs:QName("ERROR"), "illegal pattern *" || $s || "*") 
		else ("literal", $s)
	} catch($e) {
		let $problems := map:get($xes,  "problems")	
		let $_ := pt:addProblem($problems, sem:iri($sourceIRI), (), $pt:ILLEGAL-MUSICAL, "xstring *" || $s || "* " || string($e//error:code)) 
		return ("junk", $s)
	}
};

declare function xes:parseXiany($xes, $sourceIRI as xs:string?, $s as xs:string, $tripleDataType as xs:string?, $pMode as xs:boolean) as xs:string* {
	try {
		if (string-length($tripleDataType) eq 0) then 
			if (starts-with($s, string($OBJ-BLANK))) then ("blank", substring-after($s, concat(string($OBJ-BLANK), '__:')))
			else ("iri", $s)
		else
			let $xi := parseXStringImpl($xes, $sourceIRI, $s, true())
			return 
				if ($xi[1] eq "junk" or $xi[1] eq "attribute") then $xi
				else if (ends-with($tripleDataType, "#integer")) then ("integer", xs:integer($s))
				else if (ends-with($tripleDataType, "#decimal")) then ("decimal", xs:decimal($s))
				else if (ends-with($tripleDataType, "#boolean")) then ("boolean", xs:boolean($s))
				else if (ends-with($tripleDataType, "#string")) then 
					if (starts-with($s, "$sattribute")) then 
						if ($pMode) then ("sattribute", xes:parseDollar($xes, "$sattribute", $s))
						else fn:error(xs:QName("ERROR"), "sattribute allowed only for xipany") 
					else if (starts-with($s, "$tattribute")) then 
						if ($pMode) then ("tattribute", xes:parseDollar($xes, "$tattribute", $s))
						else fn:error(xs:QName("ERROR"), "tattribute allowed only for xipany") 
					else if ($s eq "$value") then 
						if ($pMode) then ("value")
						else fn:error(xs:QName("ERROR"), "value allowed only for xipany") 
					else if ($s eq "$iri") then ("iri")
					else if (starts-with($s, "$iri")) then fn:error(xs:QName("ERROR"), "unexpected dynamic IRI *" || $s || "*")
					else if ((starts-with($s, "'") and ends-with($s, "'")) or (starts-with($s, '"') and ends-with($s, '"'))) then 
						let $len := string-length($s)
						return ("string", substring($s, 2, $len - 2))
					else fn:error(xs:QName("ERROR"), "unexpected string *" || $s || "*")
				else fn:error(xs:QName("ERROR"), "bad input *" || $s || "* of type *" || $tripleDataType || "*")
	}
	catch($e) {
		let $problems := map:get($xes,  "problems")	
		let $_ := pt:addProblem($problems, sem:iri($sourceIRI), (), $pt:ILLEGAL-MUSICAL, "xiany *" || $s || "* " || string($e//error:code)) 
		return ("junk", $s)
	}
};

declare function xes:parseDollar($xes, $function, $dollar as xs:string?) as xs:string? {
	let $attempt := normalize-space(fn:tokenize(fn:tokenize(fn:substring-after($dollar, $function), "\(")[2], "\)")[1])
	return 
		if (string-length($attempt) eq 0) then fn:error(xs:QName("Unparseable *" || $dollar || "* on *" || $function || "*"))
		else $attempt 
};


declare function xes:castInteger($xes, $s as xs:string) {
	try {
		xs:integer($s)
	}
	catch($e) {
		($s, $e)
	}
};

declare function xes:castDecimal($xes, $s as xs:string?) {
	try {
		xs:decimal($s)
	}
	catch($e) {
		($s, $e)
	}
};

declare function xes:castBoolean($xes, $s as xs:string?) {
	try {
		xs:boolean($s)
	}
	catch($e) {
		($s, $e)
	}
};
