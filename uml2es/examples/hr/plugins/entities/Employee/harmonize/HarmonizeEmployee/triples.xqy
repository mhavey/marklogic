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
(:
Uses organization ontology at http://www.w3.org/ns/org

<http://www.w3.org/ns/org#Mork> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://xmlns.com/foaf/0.1/Agent> .
<http://www.w3.org/ns/org#Mork> <http://www.w3.org/ns/org#memberOf> <http://www.w3.org/ns/org#Sales> .
<http://www.w3.org/ns/org#Mork> <http://www.w3.org/ns/org#reportsTo> <http://www.w3.org/ns/org#Mike> .
<http://www.w3.org/ns/org#Mork> <http://www.w3.org/2000/01/rdf-schema#label> "Mork" .
:)

	let $org := "http://www.w3.org/ns/org"
	let $rdf := "http://www.w3.org/1999/02/22-rdf-syntax-ns"
	let $rdfs := "http://www.w3.org/2000/01/rdf-schema"
	let $foaf := "http://xmlns.com/foaf/0.1"

	let $emp-irilet :=concat("e", $headers//entityId) 
	let $emp-name := string($headers//entityName)
	let $dept-id := map:get($options, "deptNum")
	let $reports-to := map:get($options, "reportsTo")

	return (
		sem:triple(sem:iri(concat($org, "#", $emp-irilet)), sem:iri(concat($rdf, "#type")), sem:iri(concat($foaf, "/Agent"))),
		sem:triple(sem:iri(concat($org, "#", $emp-irilet)), sem:iri(concat($rdfs, "#label")), $emp-name),
		if (exists($dept-id)) then
			sem:triple(sem:iri(concat($org, "#", $emp-irilet)), sem:iri(concat($org, "#memberOf")), sem:iri(concat($org, "#", concat("d", $dept-id))))
		else (),
		if (exists($reports-to)) then
			sem:triple(sem:iri(concat($org, "#", $emp-irilet)), sem:iri(concat($org, "#reportsTo")), sem:iri(concat($org, "#", concat("e", $reports-to))))
		else ()
	)
};
