xquery version "1.0-ml";

module namespace u = "http://marklogic.com/xmi2es/util"; 

(: DHF 4.1  - From options, get the submap keyed by id. We use the submap to pass data between DHF hamronization modules :)
declare function u:getIOptions($id as xs:string,$options as map:map) as item()* {
	map:get($options, "iopt_" || $id)
};

(: DHF 4.1  - In options, createa a submap keyed by id. We use the submap to pass data between DHF hamronization modules :)
declare function u:setIOptions($id as xs:string ,$options as map:map) as map:map {
	let $ioptions := json:object()
	let $_ := map:put($options, "iopt_" || $id, $ioptions)
	return $ioptions
};

(: DHF 4.1  - Remove from options the submap keyed by id. We use the submap to pass data between DHF hamronization modules :)
declare function u:removeIOptions($id as xs:string ,$options as map:map) as empty-sequence() {
	map:delete($options, "iopt_" || $id)
};
