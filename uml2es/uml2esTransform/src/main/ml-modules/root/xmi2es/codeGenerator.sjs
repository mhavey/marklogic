function generateCode(inputSpec, output) {
	/*
	inputSpec - (class, subordinate classes*)*
	code lang
	doc format
    naming?
    notional data
    mapping data...
	*/
}



/*


declare variable $NEWLINE := "&#10;";

(: Generated code to generate writer, headers, triples. Also calculated fields .
   Meant for DHF harmonization type use. 

   DOES NOT CRAWL INTO EMBEDDED SUBCLASSES!!!!
   IF A CONTAINS B, CODE IS GENERATED FOR EACH SEPARTELY. IF YOU WANT TO MERGE THEM, DO IT MANUALLY.
 :)
declare function xes:generateCode($xes as map:map) as xs:string? {

	let $genTypes := ("sems", "writers", "headers", "calculateds")
	let $allLines := for $genType in $genTypes return 
		let $gen := map:get($xes, $genType)
		for $class in map:keys($gen) return 
			let $classLines := json:array-values(map:get($gen, $class))
			return concat( 
				"(: Generated Code of Type ", 
				$genType, 
				" For Class ", 
				$class, 
				" :)",
				$NEWLINE,
				string-join($classLines, $NEWLINE),
				$NEWLINE
			)
	return string-join($allLines, $NEWLINE)
};

(:
Generate header code and, in doing so, validate the header stereotypes and add to the extended model
facts about headers.

THIS CREATES A SUGGESTED HEADER STRUCTURE. IT IS MEANT TO BE TWEAKED.
:)
declare function xes:genHeaders($xes as map:map, $class as node(), $classIRI as xs:string) as empty-sequence() {

	let $problems := map:get($xes, "problems")
	let $headers := map:get($xes, "headers")

	let $headerAttribs := $class/attributes/Attribute[string-length(xHeader) gt 0]
	let $excludes := $headerAttribs[exclude/text() eq true()]

	return
		if (count($headerAttribs) eq 0) then ()
		else 
			let $headerLines := json:array()
			let $_ := json:array-push($headerLines, "<Header>")
			let $_ := json:array-push($headerLines, "  <lastHarmonizeTS>{fn:current-dateTime()}</lastHarmonizeTS>") 
			let $_ := json:array-push($headerLines, concat("  <entityType>", $class/@name, "</entityType>"))
			let $_ := json:array-push($headerLines, "  <sourceDocument>{$id}</sourceDocument>")

			let $_ := 
				for $attrib in $headerAttribs return 
					let $attribIRI := concat($classIRI, "/", $attrib/@name)
					let $_ := xes:addFact($xes, $attribIRI, $IRI-HEADER, $attrib/xHeader/text(), false()) 
					return json:array-push($headerLines, concat(
						"   <", $attrib/xHeader/text(), ">{",
						if ($attrib/@name eq $excludes/@name) then concat('map:get($options, "', $attrib/@name, '")')
						else concat('string($content/', $attrib/@name, ")"),
						"}</", $attrib/xHeader/text(), ">"
					))

			let $_ := json:array-push($headerLines, "</Header>")
			return map:put($headers, $class/@name, $headerLines)
};

(:
Generate writer code and, in doing so, validate the writer stereotypes and add to the extended model
facts about writer.
:)
declare function xes:genWriters($xes as map:map, $class as node(), $classIRI as xs:string) as empty-sequence() {

	let $problems := map:get($xes, "problems")
	let $writers := map:get($xes, "writers")

	let $allAttribs := $class/attributes/Attribute
	let $excludes := $allAttribs[exclude/text() eq true()]
	let $xURIs := $class/xURIs/item/text()

	(: validations on attribs in class that are xURI :)
	let $_ := 
		for $attrib in $allAttribs return 
			let $xURI := $attrib/@name eq $class/xURIs/item
			let $attribIRI := concat($classIRI, "/", $attrib/@name)
			let $required := $attrib/@required eq true()
			let $array := $attrib/@array eq true()
			return (
				if ($xURI eq true() and ($required eq false() or $array eq true())) then
					pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ZERO-ONE, "xURI") 
				else ()
			)

	let $writerLines := json:array()

	(: xURI :)
	let $_ := for $a in $xURIs return xes:addFact($xes, $classIRI, $IRI-URI, concat($classIRI, "/", $a), true())
	let $xCount := count($xURIs)
	let $_ := 
		if (count($xURIs) gt 1) then pt:addProblem($problems, $classIRI, (), $pt:CLASS-MULTIFIELD-URI, string-join($xURIs, ","))
		else ()

	let $_ := 
		if ($xCount gt 0) then json:array-push($writerLines, concat("let $uri := ", 
			if ($xURIs[1] eq $excludes/@name) then concat('map:get($options, "', $xURIs[1], '")')
			else concat('$envelope//', $xURIs[1])
		))
		else ()

	(: init options :)
	let $_ := json:array-push($writerLines, "let $dioptions := map:map()")

	(: collections :)
	let $_ := 
		if (count($class/xDocument/collections/item) gt 0) then 
			json:array-push($writerLines, concat(
				'let $_ := map:put($dioptions, "collections", (', 
				string-join(for $t in $class/xDocument/collections/item return 
				 	let $_ := xes:addFact($xes, $classIRI, $IRI-DOC-COLLECTION, $t, false())
				 	return concat('"', $t, '"'), 
				 	","),
				'))'
			))
		else ()

	(: perms :)
	let $_ := 
		if (count($class/xDocument/permsCR/item) gt 0) then  json:array-push($writerLines, concat(
			'let $_ := map:put($dioptions, "permissions", (', 

			string-join(
				for $t in $class/xDocument/permsCR/item return 
				 	let $_ := xes:addFact($xes, $classIRI, $IRI-DOC-PERM, concat($t/@role, " has ", $t/@capability), false())
				 	return concat('xdmp:permission("', $t/@role, '","', $t/@capability, '")')
				 , ","),
				')'))

		else ()

	(: metadata :)
	let $_ := 
		if (count($class/xDocument/metadataKV/item) gt 0) then  json:array-push($writerLines, concat(
			'let $_ := map:put($dioptions, "metadata", map:new((', 

			string-join(
				for $t in $class/xDocument/metadataKV/item return 
				 	let $_ := xes:addFact($xes, $classIRI, $IRI-DOC-METADATA, concat($t/@key, "=", $t/@value), false())
				 	return concat('map:entry("', $t/@key, '","', $t/@value, '")')
				 , ","),
				'))'))
		else ()

	(: quality :)
	let $_ := 
		if (exists($class/xDocument/quality/text())) then (
			json:array-push($writerLines, concat('let $_:= map:put($dioptions, "quality",', $class/xDocument/quality/text(), ')')),
			xes:addFact($xes, $classIRI, $IRI-DOC-QUALITY, $class/xDocument/quality/text(), false())
		) 
		else ()


	return (
		json:array-push($writerLines, "return xdmp:document-insert($uri, $envelope, $dioptions)"),
		if ($xCount gt 0) then map:put($writers, $class/@name, $writerLines) else ()
	)
};

(: 
This generates code to calculated the xCalulated fields. It puts them into the options map using field name as key.
In DHF, call you from the content module. It assumes there is already the content built in a variable called $content.
:)
declare function xes:genCalculateds($xes as map:map, $class as node(), $classIRI as xs:string) as empty-sequence() {

	let $problems := map:get($xes, "problems")
	let $calculateds := map:get($xes, "calculateds")
	
	let $xCalcAttribs := $class/attributes/Attribute[exclude/text() eq true()][count(xCalculated/item) gt 0]
	return
		if (count($xCalcAttribs) eq 0) then ()
		else 
			let $xCalcLines := json:array()
			let $visited := map:map()
			let $_ := for $attrib in $xCalcAttribs return 
				xes:genOneCalc($xes, $problems, $classIRI, $xCalcAttribs, $attrib, $xCalcLines, $visited)
			return map:put($calculateds, $class/@name, $xCalcLines)
};

(: Generate one calc line. If it depends on another calculation, recursively do that one :)
declare function xes:genOneCalc($xes as map:map, $problems, $classIRI as xs:string,
	$xCalcAttribs as node()*, $attrib as node(), 
	$xCalcLines as json:array, $visited as map:map) as empty-sequence() {

	if (map:contains($visited, $attrib/@name)) then ()
	else 
		let $_ := map:put($visited, $attrib/@name, "gray")
		let $attribIRI := concat($classIRI, "/", $attrib/@name)
		let $_ := xes:addFact($xes, $attribIRI, $IRI-CALCULATED, $attrib/xCalculated/item/text(), false()) 
		let $_ := json:array-push($xCalcLines, concat('let $', $attrib/@name, ':= concat(',  
			string-join(for $item in $attrib/xCalculated/item/text() return
				if (starts-with($item, '"')) then $item
				else if ($item eq $attrib/@name) then 
					let $_ := pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-XCALC-CIRCULAR, "self-ref")
					return concat('$', $item)
				else if ($item eq $xCalcAttribs/@name) then
					let $successorState := map:get($visited, $item)
					let $_ := 
						if (count($successorState) eq 0) then xes:genOneCalc($xes, $problems, $classIRI, $xCalcAttribs, $xCalcAttribs[@name eq $item], $xCalcLines, $visited)
						else if ($successorState eq "black") then ()
						else pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-XCALC-CIRCULAR, concat($item, " ", $successorState))
					return concat('$', $item)
				else concat('string($content//', $item, ")")
			, ','), ')'))
		let $_ := map:put($visited, $attrib/@name, "black")
		return json:array-push($xCalcLines, concat('let $_ := map:put($options, "', $attrib/@name, '", $', $attrib/@name, ')' ))
};

(:
Generate SEM code and, in doing so, validate the sem stereotypes and add to the extended model
facts about sem.
:)
declare function xes:genSems($xes as map:map, $class as node(), $classIRI as xs:string) as empty-sequence() {

	let $problems := map:get($xes, "problems")
	let $sems := map:get($xes, "sems")

	let $allAttribs := $class/attributes/Attribute
	let $excludes := $allAttribs[exclude/text() eq true()]

	let $semIRIs := $class/semIRIs/item/text()
	let $semLabels := $class/semLabels/item/text()
	let $semTypes := $class/semTypes/item
	let $semProperties := $allAttribs[string-length(semProperty) gt 0]

	(: validations on attribs in class that are semIRI or semLabes :)
	let $_ := 
		for $attrib in $allAttribs return 
			let $semLabel := $attrib/@name eq $class/semLabels/item
			let $semIRI := $attrib/@name eq $class/semIRIs/item
			let $required := $attrib/@required eq true()
			let $array := $attrib/@array eq true()
			let $attribIRI := concat($classIRI, "/", $attrib/@name)
			return (
				if ($semIRI eq true() and ($required eq false() or $array eq true())) then
					pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ONE, "semIRI") 
				else (),
				if ($semLabel eq true() and ($required eq false() or $array eq true())) then
					pt:addProblem($problems, $attribIRI, (), $pt:ATTRIB-CARDINALITY-ZERO-ONE, "semLabel") 
				else ()
			)

	let $semLines := json:array()
	return  (
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

		if (json:array-size($semLines) gt 0) then (
			json:array-push($semLines, "() (: add more if you need to :)"),
			json:array-push($semLines, ")"),
			map:put($sems, $class/@name, $semLines)
		) 
		else ()
	)
};


THIS PART OF THE CODE WAS IN TRANSFORM_MODEL
	(: build gen :)
	let $_ := (
		xes:genSems($xes, $class, $classIRI),
		xes:genHeaders($xes, $class, $classIRI),
		xes:genWriters($xes, $class, $classIRI), 
		xes:genCalculateds($xes, $class, $classIRI)	
	)




*/