(:
This module converts an Excel (based on our template) to XMI form. 
We make the Excel just like UML.
:)

xquery version "1.0-ml";

module namespace xlsx = "http://marklogic.com/xmi2es/xlsx"; 
import module namespace pt = "http://marklogic.com/xmi2es/problemTracker" at "/xmi2es/problemTracker.xqy";
import module namespace xmi2es = "http://marklogic.com/xmi2es" at "/xmi2es/xmi2esTransform.xqy";

declare namespace ml ="http:///MarkLogicEntityServicesProfile/es.ecore";
declare namespace xmi = "http://www.omg.org/spec/XMI/20131001";
declare namespace uml = "http://www.eclipse.org/uml2/5.0.0/UML";

declare variable $VAL-MANDATORY := "m";
declare variable $VAL-YN := "y";
declare variable $VAL-INT := "i";
declare variable $VAL-CARDINALITY := "c";

declare variable $FIRST_PROP_ROW := 21;

(:
Convert attributes in the excel to XMI
:)
declare function xlsx:convertAttributes($entitySheet as node(), $classSheet as xs:string, $stringTable as node(), 
	$classAttribStereotypes as json:array, $classDetailsPerClassName as map:map, $pt) as node()* {

	let $attribNames := json:array()

	(: the attributes :)
	let $lastPropertyRow := xlsx:excelLastRow($entitySheet, $classSheet, $stringTable, $pt)

let $_ := xdmp:log(concat($classSheet, " last row ", $lastPropertyRow), "info")

	let $_ := if (not(exists($lastPropertyRow))) then 
		fn:error(xs:QName("ERROR"), concat("programming error, unable to find last row in ", $classSheet)) else ()

	for $row in $FIRST_PROP_ROW to $lastPropertyRow return
		let $attribName := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "A"||$row, $pt, $VAL-MANDATORY)
		let $attribLoc := concat($classSheet, ".", $attribName, " at ", $row)
		return
			if ($attribName eq json:array-values($attribNames)) then 
				pt:addProblem($pt, $attribLoc, "", "Ignoring duplicate attrib name", $row)
			else 
				let $_ := json:array-push($attribNames, $attribName)
				let $attribID := sem:uuid-string()
				let $attribDesc :=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B"||$row, $pt, ())
				let $attribType :=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "C"||$row, $pt, $VAL-MANDATORY)
				let $attribCardinality:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "D"||$row, $pt, $VAL-CARDINALITY)
				let $attribPK:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "E"||$row, $pt, $VAL-YN)
				let $attribFK:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "F"||$row, $pt, $VAL-YN)
				let $attribPII:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "G"||$row, $pt, $VAL-YN)
				let $attribExclude:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "H"||$row, $pt, $VAL-YN)
				let $attribElemRangeIndex:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "I"||$row, $pt, $VAL-YN)
				let $attribPathRangeIndex:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "J"||$row, $pt, $VAL-YN)
				let $attribWordLex:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "K"||$row, $pt, $VAL-YN)
				let $attribBizKey :=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "L"||$row, $pt, $VAL-YN)
				let $attribURI :=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "M"||$row, $pt, $VAL-YN)
				let $attribSemIRI:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "N"||$row, $pt, $VAL-YN)
				let $attribSemLabel:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "O"||$row, $pt, $VAL-YN)
				let $attribSemProperty:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "P"||$row, $pt, ())
				let $attribSemQual:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "Q"||$row, $pt, ())
				let $attribCollation:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "R"||$row, $pt, ())
				let $attribExternalRef:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "S"||$row, $pt, ())
				let $attribHeader:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "T"||$row, $pt, ())
				let $attribCalculated:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "U"||$row, $pt, ())
				let $attribImpl:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "V"||$row, $pt, ())
				let $attribPO:=  xlsx:excelCell($entitySheet, $classSheet, $stringTable, "W"||$row, $pt, ())

				(: attrib-level stereotypes :)
				let $attribTypeRef := map:get(map:get($classDetailsPerClassName, $attribType), "classID")
				let $attribMLType :=
					if (string-length($attribTypeRef) gt 0) then ""
					else $attribType
				let $_ := (
					if (string-length($attribMLType) gt 0 or string-length($attribCollation) eq 0 or string-length($attribExternalRef) gt 0) then
						json:array-push($classAttribStereotypes,
							<ml:esProperty xmi:id="{sem:uuid-string()}" mlType="{$attribMLType}" 
								collation="{$attribCollation}" externalRef="{$attribExternalRef}" 
								base_Property="{$attribID}"/>)
					else (),

					if (count($attribImpl) gt 0 or count($attribPO) gt 0) then
						json:array-push($classAttribStereotypes, 
							<ml:xImplHints xmi:id="{sem:uuid-string()}" base_Property="{$attribID}">{
								for $impl in $attribImpl return <reminders>{$impl}</reminders>,
								for $po in $attribPO return <triplesPO>{$po}</triplesPO>
							}</ml:xImplHints>)
					else (),
					if ($attribExclude eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:exclude xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribPII eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:PII xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribPK eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:PK xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribFK eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:FK xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribURI eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:xURI xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribBizKey eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:xBizKey xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribSemIRI eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:semIRI xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribElemRangeIndex eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:elememtRangeIndex xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribPathRangeIndex eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:pathRangeIndex xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if ($attribWordLex eq "Y") then
						json:array-push($classAttribStereotypes, 
							<ml:wordLex xmi:id="{sem:uuid-string()}" base_Property="{$attribID}"/>)
					else (),
					if (string-length($attribSemProperty) gt 0) then
						json:array-push($classAttribStereotypes, 
							<ml:semProperty xmi:id="{sem:uuid-string()}" base_Property="{$attribID}" predicate="{$attribSemProperty}">{
								for $q in $attribSemQual return 
									<qualifiedObject_sPO>{$q}</qualifiedObject_sPO>
							}
							</ml:semProperty>)
					else (),
					if (string-length($attribHeader) gt 0) then
						json:array-push($classAttribStereotypes, 
							<ml:xHeader xmi:id="{sem:uuid-string()}" base_Property="{$attribID}" field="{$attribHeader}"/>)
					else (),
					if (count($attribCalculated) gt 0) then
						json:array-push($classAttribStereotypes, 
							<ml:xCalculated xmi:id="{sem:uuid-string()}" base_Property="{$attribID}">{
								for $calc in $attribCalculated return 
									<concat>{$calc}</concat>
							}</ml:xCalculated>)
					else ()
				)

				(: Define the attribute model. We need this be more dynamic because of the conditional type attribute :)
				return element ownedAttribute {(
					attribute xmi:type {"uml:Property"},
					attribute xmi:id {$attribID},
					attribute name {$attribName},
					if (string-length($attribTypeRef) gt 0) then attribute type {$attribTypeRef} else (),
					if ($attribCardinality eq "0" or $attribCardinality eq "*") then
						element lowerValue {(
							attribute xmi:type {"uml:LiteralInteger"}, attribute xmi:id {sem:uuid-string()})}
						else (),
					if ($attribCardinality eq "0") then
						element upperValue {(
							attribute xmi:type {"uml:LiteralInteger"}, attribute xmi:id {sem:uuid-string()}, attribute value {"1"})}
					else if ($attribCardinality eq "*" or $attribCardinality eq "+") then
						element upperValue {(
							attribute xmi:type {"uml:LiteralInteger"}, attribute xmi:id {sem:uuid-string()}, attribute value {"*"})}
						else (),
	  				if (string-length($attribDesc) gt 0) then
		    			element ownedComment {(
		    				attribute xmi:type {"uml:Comment"}, attribute xmi:id {sem:uuid-string()}, element body {$attribDesc} )}
		    			else () 					
			)}
};

(:
Convert classes in the excel to XMI.
:)
declare function xlsx:convertClasses($entitySheets as node()*, $stringTable as node(), 
	$classAttribStereotypes as json:array, $pt) as node()* {
	(: 
		Find all the classes. Ignore duplicates.
	:)
	let $classNames := json:array()
	let $classDetailsPerClassName := map:map()
	let $_ := for $entitySheet at $pos in $entitySheets return
		let $classID := sem:uuid-string()
		let $className := xlsx:excelCell($entitySheet, concat("Sheet at ", ($pos + 2)), $stringTable, "B1", $VAL-MANDATORY, ())
		return
			if ($className eq json:array-values($classNames)) then 
				pt:addProblem($pt, $className, "", "Ignoring duplicate class name", ($pos + 2))
			else (
				json:array-push($classNames, $className),
				map:put($classDetailsPerClassName, $className, 
					map:new((
						map:entry("classID", $classID), 
						map:entry("entitySheet", $entitySheet), 
						map:entry("pos", $pos))))
			)

	(: loop through all the classes and build model/stereotypes :)
	for $className in map:keys($classDetailsPerClassName) return
		let $mapValue := map:get($classDetailsPerClassName, $className)
		let $classID := map:get($mapValue, "classID")
		let $entitySheet := map:get($mapValue, "entitySheet")
		let $pos := map:get($mapValue, "pos") + 2
		let $classSheet := concat($className, $pos)
		let $classDesc := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B2", $pt, ())
		let $classExclude := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B3", $pt, $VAL-YN)
	  	let $classXMLPrefix:= xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B4", $pt, ())
	  	let $classXMLURL := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B5", $pt, ())
		let $classSEMTypes := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B6", $pt, ())
		let $classSEMFacts := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B7", $pt, ())
		let $classQuality := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B8", $pt, $VAL-INT)
		let $classCollections:= xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B9", $pt, ())
		let $classPerms := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B10", $pt, ())
		let $classMetadataKV := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B11", $pt, ())
		let $classImpl := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B12", $pt, ())
		let $classPO := xlsx:excelCell($entitySheet, $classSheet, $stringTable, "B13", $pt, ())
					
		(: class-level stereotypes :)
		let $_ := (
			if (string-length($classXMLPrefix) gt 0 or string-length($classXMLURL) gt 0) then
				json:array-push($classAttribStereotypes, 
					<ml:xmlNamespace xmi:id="{sem:uuid-string()}" prefix="{$classXMLPrefix}" url="{$classXMLURL}" base_Class="{$classID}"/>)
			else (),
			if (count($classImpl) gt 0 or count($classPO) gt 0) then
				json:array-push($classAttribStereotypes, 
					<ml:xImplHints xmi:id="{sem:uuid-string()}" base_Class="{$classID}">{
					for $impl in $classImpl return <reminders>{$impl}</reminders>,
					for $po in $classPO return <triplesPO>{$po}</triplesPO>
					}</ml:xImplHints>)
			else (),
			if ($classExclude eq "Y") then
				json:array-push($classAttribStereotypes, 
					<ml:exclude xmi:id="{sem:uuid-string()}" base_Class="{$classID}"/>)
			else (),
			if (count($classSEMTypes) gt 0) then
				json:array-push($classAttribStereotypes, 
					<ml:semType xmi:id="{sem:uuid-string()}" base_Class="{$classID}">
					{
						for $type in $classSEMTypes return <types>{$type}</types>
					}
					</ml:semType>)
			else (),
			if (count($classSEMFacts) gt 0) then
				json:array-push($classAttribStereotypes, 
					<ml:semFacts xmi:id="{sem:uuid-string()}" base_Class="{$classID}">
					{
						for $f in $classSEMFacts return <facts_sPO>{$f}</facts_sPO>
					}
					</ml:semFacts>)
			else (),
			if (count($classCollections) gt 0 or count($classPerms) gt 0 or count ($classMetadataKV) gt 0 or string-length($classQuality) gt 0) then
				json:array-push($classAttribStereotypes, 
					<ml:xDocument xmi:id="{sem:uuid-string()}" base_Class="{$classID}">
					{
						for $item in $classCollections return <collections>{$item}</collections>,
						for $item in $classPerms return <permsCR>{$item}</permsCR>,
						if (string-length($classQuality) gt 0) then <quality>{$classQuality}</quality> else (),
						for $item in $classMetadataKV return <metadataKV>{$item}</metadataKV>
					}
					</ml:xDocument>)							
			else ()
		)

	  	let $attributeModel := xlsx:convertAttributes($entitySheet, $classSheet, $stringTable, $classAttribStereotypes, $classDetailsPerClassName, $pt)

		(: data model at class level :)
		return
			<packagedElement xmi:type="uml:Class" xmi:id="{$classID}" name="{$className}">
				{(
  				if (string-length($classDesc) gt 0) then
	    			<ownedComment xmi:type="uml:Comment" xmi:id="{sem:uuid-string()}">
		  				<body>{$classDesc}</body>
					</ownedComment> 
				else (),
				$attributeModel
			)}
			</packagedElement>
};

(:
Convert the excel to XMI. Put errors in $pt
:)
declare function xlsx:convert($excel, $pt) as node() {
	(: Get the stuff we need from the xlsx file :)
	let $stringTable := xdmp:zip-get($excel, "xl/sharedStrings.xml")/node()
	let $contents := xdmp:zip-get($excel, "[Content_Types].xml")/node()
	let $modelSheet := 
		if (exists($contents/*:Override[@PartName eq "/xl/worksheets/sheet2.xml"])) then xdmp:zip-get($excel, "xl/worksheets/sheet2.xml")/node()
		else pt:addProblem($pt, "excel", "", "No model sheet found", ())
	let $entitySheets := 
		for $sheet in $contents/*:Override[
			@ContentType eq "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
  			and @PartName ne "/xl/worksheets/sheet1.xml" 
  			and @PartName ne "/xl/worksheets/sheet2.xml"]/@PartName 
  		return xdmp:zip-get($excel, fn:substring($sheet, 2))/node()

  	let $modelID := sem:uuid-string()
  	let $modelName := xlsx:excelCell($modelSheet, "model", $stringTable, "B1", $pt, $VAL-MANDATORY)
  	let $modelDesc := xlsx:excelCell($modelSheet, "model", $stringTable, "B2", $pt, ())
  	let $modelVersion := xlsx:excelCell($modelSheet, "model", $stringTable, "B3", $pt, ())
  	let $modelBaseURI:= xlsx:excelCell($modelSheet, "model", $stringTable, "B4", $pt, ())
  	let $modelXMLPrefix:= xlsx:excelCell($modelSheet, "model", $stringTable, "B5", $pt, ())
  	let $modelXMLURL := xlsx:excelCell($modelSheet, "model", $stringTable, "B6", $pt, ())
  	let $modelImpl:= xlsx:excelCell($modelSheet, "model", $stringTable, "B7", $pt, ()) 
  	let $modelPO:= xlsx:excelCell($modelSheet, "model", $stringTable, "B8", $pt, ()) 
  	let $modelSemPrefixes:= xlsx:excelCell($modelSheet, "model", $stringTable, "B9", $pt, ()) 

  	let $classAttribStereotypes := json:array()
  	let $classModel := xlsx:convertClasses($entitySheets, $stringTable, $classAttribStereotypes, $pt)

	return 
		<xmi:XMI xmi:version="20131001">
  			<uml:Model xmi:id="{$modelID}" name="{$modelName}">{
  				if (string-length($modelDesc) gt 0) then
	    			<ownedComment xmi:type="uml:Comment" xmi:id="{sem:uuid-string()}">
    	  				<body>{$modelDesc}</body>
    				</ownedComment> 
    			else ()
    			}
    			<packagedElement xmi:type="uml:Package" xmi:id="{sem:uuid-string()}" name="{$modelName}"/>
    			{
    				$classModel
    			}
			</uml:Model>
			{(
				if (string-length($modelVersion) gt 0 or string-length($modelBaseURI) gt 0) then
					<ml:esModel xmi:id="{sem:uuid-string()}" version="{$modelVersion}" baseUri="{$modelBaseURI}" base_Package="{$modelID}"/>
				else (),
				if (string-length($modelXMLPrefix) gt 0 or string-length($modelXMLURL) gt 0) then
					<ml:xmlNamespace xmi:id="{sem:uuid-string()}" prefix="{$modelXMLPrefix}" url="{$modelXMLURL}" base_Package="{$modelID}"/>
				else (),
				if (count($modelImpl) gt 0 or count($modelPO) gt 0) then
					<ml:xImplHints xmi:id="{sem:uuid-string()}" base_Package="{$modelID}">{
						for $impl in $modelImpl return <reminders>{$impl}</reminders>,
						for $po in $modelPO return <triplesPO>{$po}</triplesPO>
					}</ml:xImplHints>
				else (),
				if (count($modelSemPrefixes) gt 0) then
					<ml:semPrefixes xmi:id="{sem:uuid-string()}" base_Package="{$modelID}">{
						for $p in $modelSemPrefixes return <prefixesPU>{$p}</prefixesPU>
					}</ml:semPrefixes>
				else (),
				for $stereotype in json:array-values($classAttribStereotypes) return $stereotype
			)}
		</xmi:XMI>
};

(:
Return the value of the desired cell in the sheet specified. Validate it too.
If there are multiple values (delimited by newline), return the sequence of them
:)
declare function xlsx:excelCell($sheet as node(), $sheetName as xs:string, 
	$stringTable as node(), $cellCoord as xs:string, $pt, $validation as xs:string*) as xs:string* {

	let $errorSource := concat($sheetName, ".", $cellCoord)

	let $cell := $sheet//*:row/*:c[@*:r eq $cellCoord]
	let $cellValWS := 
		if (not(exists($cell))) then ""
		else 
			let $cellType := $cell/@*:t
			return 
				if ($cellType eq "n") then $cell/*:v/text()
				else if ($cellType eq "inlineStr") then $cell/*:is/*:t/text()
				else if ($cellType eq "s") then 
					let $stringTableIndex := $cell/*:v/text()
					return ($stringTable//*:si)[xs:integer($stringTableIndex) + 1]/*:t/text()
				else if (string-length($cellType) eq 0) then string($cell/*:v)
				else
					let $_ := pt:addProblem($pt, $errorSource, "", "Ignoring unknown cell type", "*" || $cellType || "*")
					return ""

	let $cellVals := for $tok in fn:tokenize($cellValWS, "[\n\r]") return
		let $n := fn:normalize-space($tok)
		return 
			if (string-length($n) gt 0) then $n
			else ()

	let $cellVal := fn:normalize-space($cellValWS)
	let $_ := 
		for $val in $validation return
			if ($val eq $VAL-MANDATORY) then
				if (string-length($cellVal) gt 0) then ()
				else pt:addProblem($pt, $errorSource, "", "Cell is mandatory", $cellVal)
			else if ($val eq $VAL-YN) then
				if ($cellVal eq "" or $cellVal eq "Y" or $cellVal eq "N") then ()
				else pt:addProblem($pt, $errorSource, "", "Illegal YN value", $cellVal)
			else if ($val eq $VAL-INT) then
				try { 
					if (string-length($cellVal) gt 0) then xs:integer($cellVal)
					else ()
  				} catch($e) {
					pt:addProblem($pt, $errorSource, "", "value is not an integer", $cellVal)
				}
			else if ($val eq $VAL-CARDINALITY) then
				if ($cellVal eq "0" or $cellVal eq "1" or $cellVal eq "*" or $cellVal eq "+") then ()
				else pt:addProblem($pt, $errorSource, "", "Illegal cardinality value", $cellVal)
			else 
				pt:addProblem($pt, $errorSource, "", "Unknown validation type", $val)

	return $cellVals
};

(:
Return the last row that in an entity sheet has a property
:)
declare function xlsx:excelLastRow($sheet as node(), $sheetName as xs:string, 
	$stringTable as node(), $pt) as xs:integer? {

	(: find last A cell at or beyond the last prop row :)
	let $lastARowAttrib := $sheet//*:row[
		xs:integer(@*:r) ge $FIRST_PROP_ROW and 
		exists(*:c[fn:starts-with(@*:r, "A")])][last()]/@*:r
	return 
		if (not(exists($lastARowAttrib))) then 0
		else
			let $lastARow := xs:integer($lastARowAttrib)
			let $firstEmptyRow := 0
			let $lastPopRow := 0
			let $_ := for $row in $FIRST_PROP_ROW to $lastARow return
				let $cellVal := xlsx:excelCell($sheet, $sheetName, $stringTable, "A"||$row, $pt, ())

				return 
					if ($firstEmptyRow eq 0 and (count($cellVal) eq 0 or $cellVal eq "")) then (
						if ($row eq $FIRST_PROP_ROW) then () else xdmp:set($lastPopRow, $row - 1),
						xdmp:set($firstEmptyRow, $row)
					)
					else ()

let $_ := xdmp:log(concat($sheetName, " loop result ", $lastARow, " and ", $firstEmptyRow, " and ", $lastPopRow), "info")
			
			return 
				if ($firstEmptyRow eq 0) then $lastARow
				else $lastPopRow

(:
Case 1:
20 - e

Case 2:
20 - p
21 - p (last)

Case 3:
20 - p
21 - e (last)

Case 4:
20 - p
21 - p
22 - e (last)

Case 5:
20 - p
21 - p
22 - e
23 - e 
23 - e (last)
:)					
};

(:
On ingest of Excel, transform to XMI and ingest that too.
:)
declare function xlsx:transform(
  $content as map:map,
  $context as map:map
) as map:map* {
  let $excelURI := map:get($content, "uri")
  let $excelDoc := map:get($content, "value")
  let $docName := substring-before(substring-after($excelURI,"/xmi2es/excel/"), ".xlsx")
  let $xmiURI := concat("/xmi2es/xmi/", $docName, ".xml")

  (: convert Excel to XMI :)
  let $problems := pt:init()
  let $xmiDoc := xlsx:convert($excelDoc, $problems)

  (: Run the regular XMI2ES transform :)
  let $xmi2ESDocs := xmi2es:transform(
  	map:new((
  		map:entry("uri", $xmiURI), 
  		map:entry("value", xdmp:unquote(xdmp:quote($xmiDoc))))), 
  	$context)

  (: Return everything: original content, problems during conversion, normal stuff after conversion :)
  return ($content, 
  		map:new((
  			map:entry("uri", concat("/xmi2es/excel/findings/", $docName, ".xml")),
        	map:entry("value", pt:dumpProblems($problems)))),
  		$xmi2ESDocs)
};
