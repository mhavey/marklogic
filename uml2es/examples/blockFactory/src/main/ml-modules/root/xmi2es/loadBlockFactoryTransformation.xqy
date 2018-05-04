xquery version "1.0-ml";
module namespace xmi2esBlockFactory = "http://marklogic.com/xmi2es/blockFactory"; 

import module namespace es = "http://marklogic.com/entity-services" at "/MarkLogic/entity-services/entity-services.xqy";
import module namespace blockFactoryModel = 'http://com.marlogic.es.umldemo.blockfactory#BlockFactory-0.0.1' at "/ext/entity-services/BlockFactory-0.0.1.xqy";

declare function xmi2esBlockFactory:transform(
  $content as map:map,
  $context as map:map
) as map:map* {

  (: 
  Notice we pass content and context to the converter. I added that to allow control over doc-level stuff. 
  The "extended ES model" allows doc-level stuff like collections, perms, etc.
  :)
  let $sourceDoc := map:get($content, "value")
  let $docType := string(map:get($context, "transform_param"))
  let $canonInstance := 
  	if ($docType eq "client") then blockFactoryModel:extract-instance-Client($sourceDoc, $content, $context)
  	else if ($docType = "block") then blockFactoryModel:extract-instance-Block($sourceDoc, $content, $context)
    else if ($docType = "material") then blockFactoryModel:extract-instance-Material($sourceDoc, $content, $context)
    else if ($docType = "color") then blockFactoryModel:extract-instance-BlockColor($sourceDoc, $content, $context)
    else if ($docType = "model") then blockFactoryModel:extract-instance-BlockModel($sourceDoc, $content, $context)
    else if ($docType = "custom") then blockFactoryModel:extract-instance-CustomBlockModel($sourceDoc, $content, $context)
  	else concat("Illegal doc type ", $docType)
  let $envDoc := blockFactoryModel:instance-to-envelope($canonInstance, "json")
  let $updatedDoc := map:put($content, "value", $envDoc)

  return $content
};
