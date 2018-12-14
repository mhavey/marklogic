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
	let $_ := map:put($xes, "prefixes", $fullPrefixes)
	let $_ := map:put($xes, "rdfBuilder", sem:rdf-builder($fullPrefixes))

	for $p in map:keys($prefixes) return
	    xes:addQualifiedFact($xes, $modelIRI, $PRED-SEM-PREFIXES, map:new((
	   		map:entry($PRED-SEM-PREFIX, $p),
	    	map:entry($PRED-SEM-REFERENCE,map:get($prefixes, $p)))))
};

(: Take fully-qualified or curie IRI and convert to sem:iri :)
declare function xes:resolveIRI($xes as map:map, $vals as xs:string*, 
	$subjectOfProblem as sem:iri, $contextOfProblem) as sem:iri* {

	for $val in $vals return
		try {
		  sem:curie-expand($val, map:get($xes, "prefixes"))
		}
		catch($e) {
		  sem:iri($val)
		}
};

(: Take string that is fully-qualified or curie IRI and or string literal convert to either sem:iri or string literal quotes removed :)
declare function xes:resolveIString($xes as map:map, $vals as xs:string*,
	$subjectOfProblem as sem:iri, $contextOfProblem) as xs:anyAtomicType* {

	for $val in $vals return
		if (fn:starts-with($val, '"') and fn:ends-with($val, '"')) then fn:substring($val, 2, string-length($val) - 2)
		else xes:resolveIRI($xes, $val, $subjectOfProblem, $contextOfProblem)
};

(:
Add a fact to the extended model.
:)
declare function xes:addFact($xes as map:map,
	$subjectIRI as sem:iri, $predicateIRI as sem:iri, 
	$objects as xs:anyAtomicType*) as empty-sequence() {

	let $triples := map:get($xes, "triples")
	let $problems := map:get($xes,  "problems")
	return 
		if (not($subjectIRI)) then
			pt:addProblem($problems, $subjectIRI, (), $pt:ILLEGAL-XES-TRIPLE, "no subject") 
		else if (not($predicateIRI)) then
			pt:addProblem($problems, $subjectIRI, (), $pt:ILLEGAL-XES-TRIPLE, "no predicate") 
		else
			if (count($objects) eq 1 and string(xdmp:type($objects)) eq "array") then
				let $list := sem:bnode()
				let $_ := json:array-push($triples, map:get($xes, "rdfBuilder")($subjectIRI, $predicateIRI, $list))
				let $json-values := json:array-values($objects)
				for $object at $pos in $json-values return
					(
						json:array-push($triples, map:get($xes, "rdfBuilder")($list, "rdf:first", $object)),
						if ($pos lt count($json-values)) then 
							let $newList := sem:bnode()
							let $_ := json:array-push($triples, map:get($xes, "rdfBuilder")($list, "rdf:rest", $newList))
							let $list := xdmp:set($list, $newList)
							return ()
						else 
							json:array-push($triples, map:get($xes, "rdfBuilder")($list, "rdf:rest", sem:curie-expand("rdf:nil")))

					)
			else 
				for $object in $objects return
					json:array-push($triples, map:get($xes, "rdfBuilder")($subjectIRI, $predicateIRI, $object))
};

(:
Add qualified fact to the extended model.
:)
declare function xes:addQualifiedFact($xes as map:map,
	$subjectIRI as sem:iri, $predicateIRI as sem:iri, $qualifiedMap as map:map) 
	as empty-sequence() {

	let $qobj := sem:bnode()
	let $_ := xes:addFact($xes, $subjectIRI, $predicateIRI, $qobj)
	for $pred in map:keys($qualifiedMap) return 
		xes:addFact($xes, $qobj, sem:iri($pred), map:get($qualifiedMap, $pred))
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
	let $_  := (
		xes:appendSourceLine($codeMap, $LIB-SJS, concat('const sem = require("/MarkLogic/semantics.xqy");', $NEWLINE)),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat('xquery version "1.0-ml";', $NEWLINE)),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'module namespace ', $NS-PREFIX, ' = "', $ns, '";')),
		xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 
			'import module namespace sem = "http://marklogic.com/semantics" at "/MarkLogic/semantics.xqy";', 
			$NEWLINE))
	)

	return  map:put($xes, $LIB-SJS, json:array()) (: here is where we keep list of exported sjs functions :)
};

declare function xes:generateModuleTrailer($xes as map:map, $codeMap as map:map) as empty-sequence() {
	let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'module.exports = {'))
	let $functions := if (map:contains($xes, $LIB-SJS)) then json:array-values(map:get($xes, $LIB-SJS)) else ()
	let $_ :=  for $f at $pos in $functions return
		xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, $f, ":", $f, 
			if ($pos lt count($functions)) then "," else ""))
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
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, content, options, lang) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ":", $sjsFunction, 
			'($id as xs:string, $content as item()?, $options as map:map, $lang as xs:string) as node()* {'))

		(: Determine population of header fields from UML model :)
		let $jBody := ""
		let $xxBody := ""
		let $xjBody := ""
		let $headersInClass:= $triples/sem:triple[sem:predicate eq string($PRED-HEADER) and starts-with(sem:subject, $classIRIx)]
		let $_ := for $triple at $pos in $headersInClass return
			let $moreToCome := $pos lt count($headersInClass)
			let $attribIRI := $triple/sem:subject/text()
			let $attribName := fn:tokenize($attribIRI, "/")[last()]
			let $val := xes:getAttribForModule($triples, $attribIRI)
			let $field := 
				let $p := xes:parseXString($xes, $attribIRI, string($triple/sem:object))
				return
					if ($p[1] eq "attribute") then xes:getAttribForModule($triples, $p[2])
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
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, envelope, options) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ":", $sjsFunction, 
			'($id as xs:string, $envelope as item(), $options as map:map) as empty-sequence() {'))

		(: URI :)
		let $tXURI := $triples/sem:triple[sem:predicate eq string($PRED-IS-URI) and contains(sem:subject/text(), $classIRI)]
		let $xuriVal :=
			if (count($tXURI) ne 1) then ("id", "$id")
			else 
				let $attribName := fn:tokenize($tXURI/sem:subject/text(), "/")[last()]
				return xes:getAttribForModule($triples, $tXURI/sem:subject/text())
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
						if ($field[1] eq "attribute") then xes:getAttribForModule($triples, $field[2])
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
				xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'dioptions.collections = options.entity;')),
				xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $_ := map:put($dioptions, "collections", map:get($options, "entity"))'))
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
					let $k := $triples/sem:triple[sem:subject/text() eq $mds and sem:predicate/text() eq string($PRED-KEY)]/sem:object/text()
					let $v := $triples/sem:triple[sem:subject/text() eq $mds  and sem:predicate/text() eq string($PRED-VALUE)]/sem:object/text()
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

(: TODO - check dynamic IRI is really IRI; i.e., don't allow boolean-valued attribute for IRI. 
This one is not a gimme; only RESOLVED type is the true type. Even then, no telling if actual value at runtime is an IRI. :)

	let $triples:= <triples>{json:array-values(map:get($xes, "triples"))}</triples>
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
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, content, headers, options) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ":", $sjsFunction, 
			'($id as xs:string, $content as item()?, $headers as item()*, $options as map:map) as sem:triple* {'))

		(: IRI :)
		let $tSemIRI := $triples/sem:triple[sem:predicate eq string($PRED-IS-SEM-IRI) and starts-with(sem:subject, $classIRIx)]
		let $iriVal :=
			if (count($tSemIRI) ne 1) then ('"unknown"', '"unknown"')
			else xes:getAttribForModule($triples, $tSemIRI/sem:subject/text())
		let $_ := (
			(: TODO - this iriVal might need to be curie-expanded at runtime:)
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
				let $label :=xes:getAttribForModule($triples, $tSemLabel/sem:subject/text())
				return (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
						'ret.push(sem.triple(sem.iri(iri), sem.iri("http://www.w3.org/2000/01/rdf-schema#label"), ', $label[1], '));')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
						'json:array-push($ret, sem:triple(sem:iri($iri), sem:iri("http://www.w3.org/2000/01/rdf-schema#label"), ', $label[2], '))'))
				)

		(: Types :)
		let $tSemTypes:= $triples/sem:triple[sem:predicate eq string($PRED-SEM-TYPE) and sem:subject eq $classIRI]
		let $_ := for $tt in $tSemTypes return (
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
				'ret.push(sem.triple(sem.iri(iri), sem.iri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), sem.iri("', 
				$tt/sem:object/text(), '")));')),
			xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
				'json:array-push($ret, sem:triple(sem:iri($iri), sem:iri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), sem:iri("', 
				$tt/sem:object/text(), '")))'))
			)

		(: Facts :)
		let $tSemFacts:= $triples/sem:triple[sem:predicate eq string($PRED-SEM-FACT) and sem:subject eq $classIRI]/sem:object
		let $_ := for $tf in $tSemFacts 
			let $fs := $triples/sem:triple[sem:subject eq string($tf) and sem:predicate eq string($PRED-SEM-S)]/sem:object
			let $fp := $triples/sem:triple[sem:subject eq string($tf) and sem:predicate eq string($PRED-SEM-P)]/sem:object
			let $fo := $triples/sem:triple[sem:subject eq string($tf) and sem:predicate eq string($PRED-SEM-O)]/sem:object

			let $fsVal := 
				if (count($fs) ne 1) then ("sem.iri(iri)", "sem:iri($iri)") 
				else 
					let $parsedFS := xes:parseXiany($xes, $classIRI, $fs/text(), string($fs/@dataType/@datatype))
					return xes:buildSemTripleParameter($xes, $triples, $classIRI, (), $parsedFS, true())
			let $fpVal := 
				if (count($fp) ne 1) then ("bug", "bug") 
				else 
					let $parsedFP := xes:parseXiany($xes, $classIRI, $fp/text(), string($fp/@dataType/@datatype))
					return xes:buildSemTripleParameter($xes, $triples, $classIRI, (), $parsedFP, true())
			let $foVal := 
				if (count($fo) ne 1) then ("bug", "bug") 
				else 
					let $parsedFO := xes:parseXiany($xes, $classIRI, $fo/text(), string($fo/@dataType/@datatype))
					return xes:buildSemTripleParameter($xes, $triples, $classIRI, (), $parsedFO, false())
			return  (					
				xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
					'ret.push(sem.triple(', $fsVal[1], ',', $fpVal[1], ',', $foVal[1], '));')),
				xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
					'json:array-push($ret, sem:triple(', $fsVal[1], ',', $fpVal[1], ',', $foVal[1], '))'))
			)

		(: Properties :)
		let $tSemPreds:= $triples/sem:triple[sem:predicate eq string($PRED-SEM-PREDICATE) and starts-with(sem:subject, $classIRI)]
		let $_ := for $pp in $tSemPreds return
			let $attribIRI := $pp/sem:subject/text()
			let $pred := $pp/sem:object/text()
			let $qualifiedObj := $triples/sem:triple[sem:predicate eq string($PRED-SEM-QUAL) and sem:subject eq $pp/sem:subject]/sem:object

			let $profileForm := map:get($xes, "profileForm")
			let $attribInProfileForm := $profileForm//Class[iri eq $classIRI]/Attribute[iri eq $attribIRI]
			let $isExplicitIRI :=
				if (count($qualifiedObj) eq 0) then string($attribInProfileForm/esProperty/@mlType) eq "iri" (: it's typed as IRI :) 
				else if ($attribIRI eq $tSemIRI/sem:subject/text()) then true() (: this is the class IRI :)
				else if ($attribInProfileForm/typeIsReference/text() eq true()) then true()
				else false()

			(: 
			Rules for object:
			1. If qualified is defined, it's a new blank node. The qualification triples reference that blank node as subject.
			2. Otherwise, it's the value of this attribute. If the attribute's type is IRI or object reference, it is an IRI. 
			If the attribute's type is a primitive, it's a literal.
			:)

			let $objName := "semProperty" || "_" || fn:tokenize($attribIRI, "/")[last()]
			let $_ := 
				if (count($qualifiedObj) gt 0) then (
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var ', $objName, ' = sem.bnode();')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $', $objName, ' := sem:bnode();'))
				)
				else 
					let $attribVal := xes:getAttribForModule($triples, $attribIRI)
					return 
						if ($isExplicitIRI) then (
							xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var ', $objName, ' = sem.iri(', $attribVal[1], ');')),
							xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $', $objName, ' := sem:iri(', $attribVal[2], ')'))
						)
						else (
							xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var ', $objName, ' = ', $attribVal[1], ';')),
							xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $', $objName, ' :=  ', $attribVal[2]))
						)
			let $_ := (						
				xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
					'ret.push(sem.triple(sem.iri(iri), sem.iri("', $pred, '"),', $objName, '));')),
				xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
					'json:array-push($ret, sem:triple(sem:iri($iri), sem:iri("', $pred, '"), $', $objName, '))'))
			)

			(: Qualification for that property :)
			for $q in $qualifiedObj return 
				let $qs := $triples/sem:triple[sem:subject eq string($q) and sem:predicate eq string($PRED-SEM-S)]/sem:object
				let $qp := $triples/sem:triple[sem:subject eq string($q) and sem:predicate eq string($PRED-SEM-P)]/sem:object
				let $qo := $triples/sem:triple[sem:subject eq string($q) and sem:predicate eq string($PRED-SEM-O)]/sem:object

				let $qsVal := 
					if (count($qs) ne 1) then ("sem.iri(iri)", "sem:iri($iri)") 
					else 
						let $parsedQS := xes:parseXipany($xes, $attribIRI, $qs/text(), string($qs/@dataType/@datatype))
						return xes:buildSemTripleParameter($xes, $triples, $attribIRI, $classIRI, $parsedQS, true())
				let $qpVal := 
					if (count($qp) ne 1) then ("bug", "bug") 
					else 
						let $parsedQP := xes:parseXipany($xes, $attribIRI, $qp/text(), string($qp/@dataType/@datatype))
						return xes:buildSemTripleParameter($xes, $triples, $attribIRI, $classIRI, $parsedQP, true())
				let $qoVal := 
					if (count($qo) ne 1) then ("bug", "bug") 
					else 
						let $parsedQO := xes:parseXipany($xes, $attribIRI, $qo/text(), string($qo/@dataType/@datatype))
						return xes:buildSemTripleParameter($xes, $triples, $attribIRI, $classIRI, $parsedQO, false())
				return  (					
					xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 
						'ret.push(sem.triple(', $qsVal[1], ',', $qpVal[1], ',', $qoVal[1], '));')),
					xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 
						'json:array-push($ret, sem:triple(', $qsVal[1], ',', $qpVal[1], ',', $qoVal[1], '))'))
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
		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, 'function ', $sjsFunction, '(id, content, options) {'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, 'declare function ', $NS-PREFIX, ':', $sjsFunction, 
			'($id as xs:string, $content as item()?, $options as map:map) as empty-sequence() {'))

		let $_ := xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, 'var c = "";'))
		let $_ := xes:appendSourceLine($codeMap, $LIB-XQY, concat($NEWLINE, $INDENT, 'let $c :=  ""'))

		(: get the concat parts in order :)
		let $concats := json:array()
		let $_ := xes:retrieveList($concats, $triples, $attrib/sem:object/text())
		let $_ := for $concat in json:array-values($concats)
			let $cval := xes:parseXString($xes, $attribIRI, $concat)
			return 
				if ($cval[1] eq "attribute") then 
					let $attribVal := xes:getAttribForModule($triples, $cval[2])
					return (
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
			xes:appendSourceLine($codeMap, $LIB-SJS, concat($NEWLINE, $INDENT, $target[1])),
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
declare function xes:getAttribForModule($triples, $attribIRI)  as xs:string+ {
	let $attribName := fn:tokenize($attribIRI, "/")[last()]
	return 
		if (exists($triples/sem:triple[sem:object/text() eq $attribIRI and 
			sem:predicate/text() eq string($PRED-EXCLUDES)])) then
			( concat('options.', $attribName), concat('map:get($options, "', $attribName, '")') )
		else ( concat('content.', $attribName) , concat('map:get($content, "', $attribName, '")') )
};

declare function xes:assignAttribInModule($triples, $attribIRI as xs:string, $val as xs:string+)  as xs:string+ {
	let $attribName := fn:tokenize($attribIRI, "/")[last()]
	return 
		if (exists($triples/sem:triple[sem:object/text() eq $attribIRI and 
			sem:predicate/text() eq string($PRED-EXCLUDES)])) then
			( concat('options.', $attribName, ' = ', $val[1]), concat('map:put($options, "', $attribName, '",', $val[2], ')'))
		else ( concat('content.', $attribName, ' = ', $val[1]) , concat('map:put($content, "', $attribName, '",', $val[2], ')'))
};

declare function xes:addSJSFunction($xes, $function as xs:string) as empty-sequence() {
	let $currList := map:get($xes, $LIB-SJS)
	let $_ := json:array-push($currList, $function)
	return map:put($xes, $LIB-SJS, $currList)
};

declare function xes:buildSemTripleParameter($xes, $triples, $sourceIRI as xs:string, $parentIRI as xs:string?,
	$parsed as xs:string+, $iriNeeded as xs:boolean) {
	try {
		if ($parsed[1] eq "iri") then
			if (count($parsed) eq 1) then ("sem.iri(iri)", "sem:iri($iri)") 
			else ('sem.iri("' || $parsed[2], '")', 'sem:iri("' || $parsed[2], '")')
		else if ($parsed[1] eq "sattribute" or $parsed[1] eq "attribute") then 
			let $sattrib := xes:getAttribForModule($triples, concat($parentIRI, "/", $parsed[2]))
			return 
				if ($iriNeeded) then ('sem.iri(' || $sattrib, ')', 'sem:iri(' || $sattrib, ')')
				else $sattrib
		else if ($parsed[1] eq "tattribute") then 
			let $replacer := "TODO - provide value of target attribute *" || $parsed[2] || "*"
			return 
				if ($iriNeeded) then ('sem.iri("' || $replacer || '")', 'sem:iri("' || $replacer, '")')
				else '"' || $replacer || '"'
		else if ($parsed[1] eq "value") then 
			let $val := xes:getAttribForModule($triples, $sourceIRI)
			return
				if ($iriNeeded) then ('sem.iri(' || $val, ')', 'sem:iri(' || $val, ')')
				else $val
		else if ($parsed[1] eq "integer" or $parsed[1] eq "decimal") then
			if ($iriNeeded) then fn:error(xs:QName("ERROR"), "IRI required, *" || $parsed[1] || "* found *" || $parsed[2] || "*")
			else ($parsed[2], $parsed[2])
		else if ($parsed[1] eq "boolean") then
			if ($iriNeeded) then fn:error(xs:QName("ERROR"), "IRI required, boolean found *" || $parsed[2] || "*")
			else ($parsed[2], $parsed[2] || "()")
		else if ($parsed[1] eq "string") then
			if ($iriNeeded) then fn:error(xs:QName("ERROR"), "IRI required, string found *" || $parsed[2] || "*")
			else ('"' || $parsed[2] || '"', '"' || $parsed[2] || '"')
		else fn:error(xs:QName("cannot deal with " || $parsed))
	} catch($e) {
		let $problems := map:get($xes,  "problems")	
		let $err := string($e//error:code)
		let $_ := pt:addProblem($problems, sem:iri($sourceIRI), (), $pt:ILLEGAL-MUSICAL, $err) 
		let $ret := '"error ' || $err || '"'
		return ($ret, $ret)
	}
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
		let $_ := pt:addProblem($problems, sem:iri($sourceIRI), (), $pt:ILLEGAL-MUSICAL, string($e//error:code)) 
		return ("junk", $s)
	}
};

declare function xes:parseXiany($xes, $sourceIRI as xs:string?, $s as xs:string, $tripleDataType as xs:string?) as xs:string* {
	xes:parseXianyImpl($xes, $sourceIRI, $s, $tripleDataType, false())
};

declare function xes:parseXipany($xes, $sourceIRI as xs:string?, $s as xs:string, $tripleDataType as xs:string?) as xs:string* {
	xes:parseXianyImpl($xes, $sourceIRI, $s, $tripleDataType, true())
};

declare function xes:parseXianyImpl($xes, $sourceIRI as xs:string?, $s as xs:string, $tripleDataType as xs:string?, $pMode as xs:boolean) as xs:string* {
	try {
		if (string-length($tripleDataType) eq 0) then ("iri", $s)
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
					else if (starts-with($s, "$iri")) then 
						let $irid := xes:parseDollar($xes, "$iri", $s)
						let $iricast := xes:castIRI($xes, $irid)
						return 
							if (count($iricast) eq 1) then ("iri", $iricast)
							else fn:error(xs:QName("ERROR"), "bad iri *" || $s || "*") 
					else if ((starts-with($s, "'") and ends-with($s, "'")) or (starts-with($s, '"') and ends-with($s, '"'))) then 
						let $len := string-length($s)
						return substring($s, 2, $len - 2)
					else
						let $si := xes:castInteger($xes, $s) 
						let $sd := xes:castDecimal($xes, $s)
						let $sb := xes:castBoolean($xes, $s)
						let $siri := xes:castIRI($xes, $s)
						return 
							if (count($si) eq 1) then ("integer", $si)
							else if (count($sd) eq 1) then ("decimal", $sd)
							else if (count($sb) eq 1) then ("boolean", $sb)
							else if (count($siri) eq 1) then ("iri", $siri)
							else fn:error(xs:QName("ERROR"), "bad unquoted string *" || $s || "*")
				else fn:error(xs:QName("ERROR"), "bad input *" || $s || "* of type *" || $tripleDataType || "*")
	}
	catch($e) {
		let $problems := map:get($xes,  "problems")	
		let $_ := pt:addProblem($problems, sem:iri($sourceIRI), (), $pt:ILLEGAL-MUSICAL, string($e//error:code)) 
		return ("junk", $s)
	}
};

declare function xes:parseDollar($xes, $function, $dollar as xs:string?) as xs:string? {
	let $attempt := normalize-space(fn:tokenize(fn:tokenize(fn:substring-after($dollar, $function), "\(")[2], "\)")[1])
	return 
		if (string-length($attempt) eq 0) then fn:error(xs:QName("Unparseable *" || $dollar || "* on *" || $function || "*"))
		else $attempt 
};

declare function xes:castIRI($xes, $s as xs:string?) as xs:string {
	try {
		let $testTriple := map:get($xes, "rdfBuilder")($s, "a", "dontcare")
		return string(sem:triple-subject($testTriple))
	}
	catch($e) {
		($s, $e)
	}
};

declare function xes:castInteger($xes, $s as xs:string) as xs:string+ {
	try {
		xs:integer($s)
	}
	catch($e) {
		($s, $e)
	}
};

declare function xes:castDecimal($xes, $s as xs:string?) as xs:string {
	try {
		xs:decimal($s)
	}
	catch($e) {
		($s, $e)
	}
};

declare function xes:castBoolean($xes, $s as xs:string?) as xs:string {
	try {
		xs:boolean($s)
	}
	catch($e) {
		($s, $e)
	}
};
