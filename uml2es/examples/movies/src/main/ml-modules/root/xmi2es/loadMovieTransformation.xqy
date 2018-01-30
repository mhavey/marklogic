xquery version "1.0-ml";
module namespace xmi2esMovie = "http://marklogic.com/xmi2es/movie"; 

import module namespace es = "http://marklogic.com/entity-services" at "/MarkLogic/entity-services/entity-services.xqy";
import module namespace movieModelPhysical = 'http://com.marklogic.es.uml.movie#MovieModelPhysical-0.0.1' at "/ext/entity-services/MovieModelPhysical-0.0.1.xqy";

declare function xmi2esMovie:transform(
  $content as map:map,
  $context as map:map
) as map:map* {

  let $sourceDoc := map:get($content, "value")
  let $docType := string(map:get($context, "transform_param"))
  let $canonInstance := 
  	if ($docType = "company") then movieModelPhysical:extract-instance-CompanyContributor($sourceDoc)
  	else if ($docType = "person") then movieModelPhysical:extract-instance-PersonContributor($sourceDoc)
  	else if ($docType = "movie") then movieModelPhysical:extract-instance-Movie($sourceDoc)
  	else if ($docType = "doc") then movieModelPhysical:extract-instance-UserDocument($sourceDoc)
  	else if ($docType = "role") then movieModelPhysical:extract-instance-Role($sourceDoc)
  	else concat("Illegal doc type ", $docType)
  let $envDoc := movieModelPhysical:instance-to-envelope($canonInstance, "xml")
  let $updatedDoc := map:put($content, "value", $envDoc)
  let $_ := xdmp:log(concat("MovieTransform output is ", $content), "info")
  return $content
};

