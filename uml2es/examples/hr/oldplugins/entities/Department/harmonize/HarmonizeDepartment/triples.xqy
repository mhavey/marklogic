xquery version "1.0-ml";

module namespace plugin = "http://marklogic.com/data-hub/plugins";

declare namespace es = "http://marklogic.com/entity-services";

declare option xdmp:mapping "false";

(:~
 : Create Triples Plugin
 :
 : @param $id      - the identifier returned by the collector
 : @param $content - the output of your content plugin
 : @param $headers - the output of your headers plugin
 : @param $options - a map containing options. Options are sent from Java
 :
 : @return - zero or more triples
 :)
declare function plugin:create-triples(
  $id as xs:string,
  $content as item()?,
  $headers as item()*,
  $options as map:map) as sem:triple*
{
(: Generated Code of Type sems For Class Department :)
let $semIRI := map:get($options, "deptIRI")
return (
sem:triple(sem:iri($semIRI), sem:iri("http://www.w3.org/2000/01/rdf-schema#label"), $content/departmentName)
,
sem:triple(sem:iri($semIRI), sem:iri("http://www.w3.org/1999/02/22-rdf-syntax-ns#type"), sem:iri("http://www.w3.org/ns/org#OrganizationalUnit"))
,
() (: add more if you need to :)
)
};
