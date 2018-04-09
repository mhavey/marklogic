xquery version "1.0-ml";
module namespace xmi2esMovie = "http://marklogic.com/xmi2es/movie"; 

import module namespace es = "http://marklogic.com/entity-services" at "/MarkLogic/entity-services/entity-services.xqy";
import module namespace movieModel = 'http://com.marklogic.es.uml.movie#MovieModel-0.0.1' at "/ext/entity-services/MovieModel-0.0.1.xqy";

declare function xmi2esMovie:transform(
  $content as map:map,
  $context as map:map
) as map:map* {

  let $sourceDoc := map:get($content, "value")
  let $docType := string(map:get($context, "transform_param"))
  let $canonInstance := 
  	if ($docType = "company") then movieModel:extract-instance-CompanyContributor($sourceDoc)
  	else if ($docType = "person") then movieModel:extract-instance-PersonContributor($sourceDoc)
  	else if ($docType = "movie") then movieModel:extract-instance-Movie($sourceDoc)
  	else if ($docType = "movieDoc") then movieModel:extract-instance-UserDocument($sourceDoc)
    else if ($docType = "bio") then movieModel:extract-instance-UserDocument($sourceDoc)
  	else if ($docType = "role") then 
      let $_ := map:put($context, "collections", (map:get($context, "collections"), "canbedeleted"))
      return movieModel:extract-instance-Role($sourceDoc)
  	else concat("Illegal doc type ", $docType)

  let $_ := map:put($content, "value", movieModel:instance-to-envelope($canonInstance, "xml"))
  return $content
};

