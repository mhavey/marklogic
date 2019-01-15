(:
This module converts an Excel (based on our template) to XMI form. 
We make the Excel just like UML.
:)

xquery version "1.0-ml";

module namespace xlsxm = "http://marklogic.com/xmi2es/xlsx/mapper"; 
import module namespace pt = "http://marklogic.com/xmi2es/problemTracker" at "/xmi2es/problemTracker.xqy";
import module namespace xlsx = "http://marklogic.com/xmi2es/xlsx" at "/xmi2es/excel2uml.xqy";

declare variable $FIRST-PROP-ROW := 13;

(:
Convert the excel to JSON. Put errors in $pt
:)
declare function xlsxm:convert($excel, $pt) as json:object {
  let $json := json:object()

  (: Get the stuff we need from the xlsx file :)
  let $stringTable := xdmp:zip-get($excel, "xl/sharedStrings.xml")/node()
  let $contents := xdmp:zip-get($excel, "[Content_Types].xml")/node()
  let $mappingSheet := 
    if (exists($contents/*:Override[@PartName eq "/xl/worksheets/sheet2.xml"])) then xdmp:zip-get($excel, "xl/worksheets/sheet2.xml")/node()
    else pt:addProblem($pt, (), "excel", "No mapping sheet found", ())
  let $entitySheets := 
    for $sheet in $contents/*:Override[
      @ContentType eq "application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"
        and @PartName ne "/xl/worksheets/sheet1.xml" 
        and @PartName ne "/xl/worksheets/sheet2.xml"]/@PartName 
      return xdmp:zip-get($excel, fn:substring($sheet, 2))/node()
  let $mapping := json:object()
  let $entities := json:object()
  let $_ := (
    map:put($json, "mapping", $mapping),
    map:put($mapping, "source", xlsx:excelCell($mappingSheet, "mapping", $stringTable, "B1", $pt, ())),
    map:put($mapping, "notes", xlsx:excelCell($mappingSheet, "mapping", $stringTable, "B2", $pt, ())),
    map:put($json, "entities", $entities)
  )
  let $_ := for $entitySheet at $pos in $entitySheets return
    let $entityName := xlsx:excelCell($entitySheet, concat("Sheet at ", ($pos + 2)), $stringTable, "B1", $xlsx:VAL-MANDATORY, ())
    return 
      if (string-length($entityName) eq 0) then ()
      else if (map:contains($entities, $entityName)) then pt:addProblem($pt, (), $entityName, "Ignoring duplicate entity", ($pos + 2))
      else
        let $thisEntity := json:object() 
        let $thisAttributes := json:object()
        let $_ := map:put($entities, $entityName, $thisEntity)
        let $_ := map:put($thisEntity, "source", xlsx:excelCell($entitySheet, $entityName, $stringTable, "B2", $pt, ()))
        let $_ := map:put($thisEntity, "notes", xlsx:excelCell($entitySheet, $entityName, $stringTable, "B3", $pt, ()))
        let $_ := map:put($thisEntity, "discoveryCollections", xlsx:excelCell($entitySheet, $entityName, $stringTable, "B4", $pt, (), $xlsx:DELIM-COMMA-LINE))
        let $_ := map:put($thisEntity, "discoveryURIPatterns", xlsx:excelCell($entitySheet, $entityName, $stringTable, "B5", $pt, ()))
        let $_ := map:put($thisEntity, "discoverySampleData", xlsx:excelCell($entitySheet, $entityName, $stringTable, "B6", $pt, ()))
        let $_ := map:put($thisEntity, "attributes", $thisAttributes)
        for $row in $FIRST-PROP-ROW to xlsx:excelLastRow($entitySheet, $entityName, $stringTable, $FIRST-PROP-ROW, $pt) return
          let $attribName := xlsx:excelCell($entitySheet, $entityName, $stringTable, "A"||$row, $pt, $xlsx:VAL-MANDATORY)
          return
              if (string-length($attribName) eq 0) then ()
              else if (map:contains($thisAttributes, $attribName)) then pt:addProblem($pt, (), $attribName, "Ignoring duplicate attribute", $row)
              else 
                let $thisAttrib := json:object()
                return (
                  map:put($thisAttributes, $attribName, $thisAttrib),
                  map:put($thisAttrib, "mapping", xlsx:excelCell($entitySheet, $entityName, $stringTable, "B" || $row, $pt, ())),
                  map:put($thisAttrib, "notes", xlsx:excelCell($entitySheet, $entityName, $stringTable, "C" || $row, $pt, ())),
                  map:put($thisAttrib, "discoverySampleData", xlsx:excelCell($entitySheet, $entityName, $stringTable, "D" || $row, $pt, ())),
                  map:put($thisAttrib, "discoveryAKA", xlsx:excelCell($entitySheet, $entityName, $stringTable, "E" || $row, $pt, (), $xlsx:DELIM-COMMA-LINE))
                )

    return $json
};

(:
We ingest the spreadsheet and convert it to a JSON.
Expected 
:)
declare function xlsxm:transform(
  $content as map:map,
  $context as map:map
) as map:map* {
  let $excelURI := map:get($content, "uri")
  let $excelDoc := map:get($content, "value")
  let $docName := substring-before(substring-after($excelURI,"/xmi2es/excel-mapper/"), ".xlsx")
  let $jsonURI := concat("/xmi2es/excel-mapper/", $docName, ".json")

  (: convert Excel to XMI :)
  let $problems := pt:init()
  let $jsonDoc := xlsxm:convert($excelDoc, $problems)

  (: Return original content, transformed content, problems during conversion:)
  return ($content, 
      map:new((
        map:entry("uri", concat("/xmi2es/excel-mapper/findings/", $docName, ".xml")),
        map:entry("value", pt:dumpProblems($problems)))),
      map:new((
        map:entry("uri", $jsonURI),
        map:entry("value",xdmp:to-json($jsonDoc)))))
};
