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

<http://www.w3.org/ns/org#Sales> <http://www.w3.org/1999/02/22-rdf-syntax-ns#type> <http://www.w3.org/ns/org#OrganizationalUnit> .
<http://www.w3.org/ns/org#Sales> <http://www.w3.org/ns/org#subOrganizationOf> <http://www.w3.org/ns/org#Global> .
<http://www.w3.org/ns/org#Sales> <http://www.w3.org/2000/01/rdf-schema#label> "Sales" .
:)

	let $org := "http://www.w3.org/ns/org"
	let $rdf := "http://www.w3.org/1999/02/22-rdf-syntax-ns"
	let $rdfs := "http://www.w3.org/2000/01/rdf-schema"
	let $dept-id := $headers//entityId
	let $dept-irilet := concat("d", $dept-id)
	let $dept-name := string($headers//entityName)

	return (
		sem:triple(sem:iri(concat($org, "#", $dept-irilet)), sem:iri(concat($rdf, "#type")), sem:iri(concat($org, "#OrganizationalUnit"))),
		sem:triple(sem:iri(concat($org, "#", $dept-irilet)), sem:iri(concat($org, "#subOrganizationOf")), sem:iri(concat($org, "#Global"))),
		sem:triple(sem:iri(concat($org, "#", $dept-irilet)), sem:iri(concat($rdfs, "#label")), $dept-name)
	)
};
