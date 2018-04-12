xquery version '1.0-ml';

(:
 This module was generated by MarkLogic Entity Services.
 The source model was MovieModel-0.0.1

 For usage and extension points, see the Entity Services Developer's Guide

 https://docs.marklogic.com/guide/entity-services

 After modifying this file, put it in your project for deployment to the modules
 database of your application, and check it into your source control system.

 Generated at timestamp: 2018-04-06T06:07:25.315587-04:00
 :)

(:
Your model has the following extended facts. These facts are also saved as triples in your content DB:
@prefix p2: <http://com.marklogic.es.uml.movie/MovieModel-0.0.1/CompanyContributor/> .
@prefix p5: <http://com.marklogic.es.uml.movie/MovieModel-0.0.1/PersonContributor/> .
@prefix p0: <http://com.marklogic.es.uml.movie/MovieModel-0.0.1/> .
@prefix p1: <http://marklogic.com/xmi2es/xes/> .
@prefix p6: <http://com.marklogic.es.uml.movie/MovieModel-0.0.1/Role/> .
@prefix p4: <http://com.marklogic.es.uml.movie/MovieModel-0.0.1/Movie/> .
@prefix p3: <http://com.marklogic.es.uml.movie/MovieModel-0.0.1/UserDocument/> .

p3:movieDoc     p1:FK           "self" ;
                p1:relationship "association" .

p5:filmography  p1:FK           "self" ;
                p1:relationship "association" .

p0:UserDocument p1:reminder     "if docText is larger than 1MB, store in a separate text document.>" .

p5:docs         p1:exclude      "self" ;
                p1:relationship "composite" .

p6:refMovie     p1:FK           "self" .

p4:cast         p1:FK           "self" ;
                p1:relationship "association" .

p4:parentalCerts
                p1:relationship "composite" .

p4:docs         p1:exclude      "self" ;
                p1:relationship "composite" .

p6:refMovieContributor
                p1:FK           "self" .

p0:MovieContributor
                p1:exclude      "self" .

p3:contribDoc   p1:FK           "self" ;
                p1:relationship "association" .

p2:filmography  p1:FK           "self" ;
                p1:relationship "association" .

:)


module namespace movieModel
    = 'http://com.marklogic.es.uml.movie#MovieModel-0.0.1';

import module namespace es = 'http://marklogic.com/entity-services'
    at '/MarkLogic/entity-services/entity-services.xqy';

import module namespace json = "http://marklogic.com/xdmp/json"
    at "/MarkLogic/json/json.xqy";

import module namespace sem = "http://marklogic.com/semantics"
       at "/MarkLogic/semantics.xqy";


declare option xdmp:mapping 'false';


(:~
 : Extracts instance data, as a map:map, from some source document.
 : @param $source-node  A document or node that contains
 :   data for populating a CompanyContributor
 : @return A map:map instance with extracted data and
 :   metadata about the instance.
 :)
declare function movieModel:extract-instance-CompanyContributor(
    $source as item()?
) as map:map
{
    (: IMPL: source mapping changes :)

    let $source-node := es:init-source($source, 'CompanyContributor')
    let $contribId  :=             $source-node/name ! xs:string(.)
    let $aliases  :=             es:extract-array($source-node/aliases, xs:string#1)
    let $corporateStuff  :=               $source-node/corporate_stuff ! xs:string(.) 

    let $roleDocs := cts:search(fn:doc(), cts:and-query((
            cts:collection-query(("role")),
            cts:element-value-query(xs:QName("refMovieContributor"), $contribId)
        )))//Role
    let $roles := es:extract-array($roleDocs, movieModel:extract-instance-Role#1) 


    let $instance := es:init-instance($source-node, 'CompanyContributor')
    (: Comment or remove the following line to suppress attachments :)
        =>es:add-attachments($source)

    return
    if (empty($source-node/*))
    then $instance
    else $instance
        =>   map:with('contribId', $contribId)
        =>es:optional('aliases', $aliases)
        =>   map:with('corporateStuff', $corporateStuff)
        =>es:optional('filmography', $roles)
};

(:~
 : Extracts instance data, as a map:map, from some source document.
 : @param $source-node  A document or node that contains
 :   data for populating a UserDocument
 : @return A map:map instance with extracted data and
 :   metadata about the instance.
 :)
declare function movieModel:extract-instance-UserDocument(
    $source as item()?
) as map:map
{
    (: IMPL: source mapping changes :)

    let $source-node := es:init-source($source, 'UserDocument')
    let $authorId  :=             $source-node/author ! xs:string(.)
    let $docText  :=             $source-node/text ! xs:string(.)
    let $docType  :=  
        if (string-length($source-node/type) gt 0) then 
            $source-node/type ! xs:string(.) 
        else "bio"
    let $docSubType  :=             $source-node/subtype ! xs:string(.)
    let $contribDoc  :=             $source-node/contrib ! xs:string(.)
    let $movieDoc  :=             $source-node/movie ! xs:string(.) 
    let $instance := es:init-instance($source-node, 'UserDocument')
    (: Comment or remove the following line to suppress attachments :)
        =>es:add-attachments($source)

    return
    if (empty($source-node/*))
    then $instance
    else $instance
        =>   map:with('docId', sem:uuid-string())
        =>   map:with('authorId', $authorId)
        =>   map:with('authorId', $authorId)
        =>   map:with('docText', $docText)
        =>   map:with('docType', $docType)
        =>es:optional('docSubType', $docSubType)
        =>es:optional('contribDoc', $contribDoc)
        =>es:optional('movieDoc', $movieDoc)
};

(:~
 : Extracts instance data, as a map:map, from some source document.
 : @param $source-node  A document or node that contains
 :   data for populating a Movie
 : @return A map:map instance with extracted data and
 :   metadata about the instance.
 :)
declare function movieModel:extract-instance-Movie(
    $source as item()?
) as map:map
{
    (: IMPL: source mapping changes :)
    let $source-node := es:init-source($source, 'Movie')
    let $movieId  :=             $source-node/movieId ! xs:string(.)
    let $seriesId  :=             $source-node/series ! xs:string(.)
    let $seriesType  :=             $source-node/seriestype ! xs:string(.)
    let $releaseYear  :=             $source-node/releaseyear ! xs:int(.)
    let $seriesEndYear  :=              $source-node/seriesEndYear ! xs:int(.)
    let $countries  :=             es:extract-array($source-node/countries, xs:string#1)
    let $genres  :=             es:extract-array($source-node/genres, xs:string#1)
    let $runningTime  :=             $source-node/runningtime ! xs:int(.)
    let $imdbUserRating  :=               $source-node/rating ! xs:float(.)

    let $roleDocs := cts:search(fn:doc(), cts:and-query((
            cts:collection-query(("role")),
            cts:element-value-query(xs:QName("refMovie"), $movieId)
        )))//Role
    let $roles := es:extract-array($roleDocs, movieModel:extract-instance-Role#1) 

    (: The following property is a local reference.  :)
    let $parentalCerts  :=              es:extract-array($source-node/parentalCerts, movieModel:extract-instance-ParentalCertificate#1)
    let $instance := es:init-instance($source-node, 'Movie')
    (: Comment or remove the following line to suppress attachments :)
        =>es:add-attachments($source)

    return
    if (empty($source-node/*))
    then $instance
    else $instance
        =>   map:with('movieId', $movieId)
        =>es:optional('seriesId', $seriesId)
        =>   map:with('seriesType', $seriesType)
        =>   map:with('releaseYear', $releaseYear)
        =>es:optional('seriesEndYear', $seriesEndYear)
        =>es:optional('countries', $countries)
        =>es:optional('genres', $genres)
        =>   map:with('runningTime', $runningTime)
        =>   map:with('imdbUserRating', $imdbUserRating)
        =>es:optional('parentalCerts', $parentalCerts)
        =>es:optional('cast', $roles)
};

(:~
 : Extracts instance data, as a map:map, from some source document.
 : @param $source-node  A document or node that contains
 :   data for populating a PersonContributor
 : @return A map:map instance with extracted data and
 :   metadata about the instance.
 :)
declare function movieModel:extract-instance-PersonContributor(
    $source as item()?
) as map:map
{
    (: IMPL: source mapping changes :)

    let $source-node := es:init-source($source, 'PersonContributor')
    let $contribId  :=             $source-node/name ! xs:string(.)
    let $aliases  :=             es:extract-array($source-node/aliases, xs:string#1)
    let $dateOfBirth  := if (string-length($source-node/dob) gt 0) then $source-node/dob ! xs:date(.) else ()
    let $dateOfDeath  := if (string-length($source-node/dod) gt 0) then $source-node/dod ! xs:date(.) else ()
    let $nicknames  :=             es:extract-array($source-node/nicknames, xs:string#1)
    let $placeOfBirth  :=             $source-node/birthplace ! xs:string(.)
    let $placeOfDeath  :=             $source-node/deathplace ! xs:string(.)
    let $causeOfDeath  :=             $source-node/cause_of_death ! xs:string(.)
    let $realName  :=             $source-node/realname ! xs:string(.)
    let $spouses  :=             $source-node/spouses ! xs:string(.) 

    let $roleDocs := cts:search(fn:doc(), cts:and-query((
            cts:collection-query(("role")),
            cts:element-value-query(xs:QName("refMovieContributor"), $contribId)
        )))//Role
    let $roles := es:extract-array($roleDocs, movieModel:extract-instance-Role#1) 

    let $instance := es:init-instance($source-node, 'PersonContributor')
    (: Comment or remove the following line to suppress attachments :)
        =>es:add-attachments($source)

    return
    if (empty($source-node/*))
    then $instance
    else $instance
        =>   map:with('contribId', $contribId)
        =>es:optional('aliases', $aliases)
        =>es:optional('dateOfBirth', $dateOfBirth)
        =>es:optional('dateOfDeath', $dateOfDeath)
        =>es:optional('nicknames', $nicknames)
        =>es:optional('placeOfBirth', $placeOfBirth)
        =>es:optional('placeOfDeath', $placeOfDeath)
        =>es:optional('causeOfDeath', $causeOfDeath)
        =>es:optional('realName', $realName)
        =>es:optional('spouses', $spouses)
        =>es:optional('filmography', $roles)
};

(:~
 : Extracts instance data, as a map:map, from some source document.
 : @param $source-node  A document or node that contains
 :   data for populating a ParentalCertificate
 : @return A map:map instance with extracted data and
 :   metadata about the instance.
 :)
declare function movieModel:extract-instance-ParentalCertificate(
    $source as item()?
) as map:map
{
    let $source-node := es:init-source($source, 'ParentalCertificate')
    let $country  :=             $source-node/country ! xs:string(.)
    let $currentCertificate  :=                   $source-node/currentCertificate ! xs:string(.) 
    let $instance := es:init-instance($source-node, 'ParentalCertificate')
    (: Comment or remove the following line to suppress attachments :)
        =>es:add-attachments($source)

    return
    if (empty($source-node/*))
    then $instance
    else $instance
        =>   map:with('country', $country)
        =>   map:with('currentCertificate', $currentCertificate)
};

(:~
 : Extracts instance data, as a map:map, from some source document.
 : @param $source-node  A document or node that contains
 :   data for populating a Role
 : @return A map:map instance with extracted data and
 :   metadata about the instance.
 :)
declare function movieModel:extract-instance-Role(
    $source as item()?
) as map:map
{
    (: IMPL: source mappings; support two modes: build role from source; include ingested role into movie/contrib :)

    let $source-node := es:init-source($source, 'Role')
    let $roleType  :=  ($source-node/role,$source-node/roleType)[1] ! xs:string(.)
    let $roleNames  :=   
        if (exists($source-node/names)) then es:extract-array($source-node/names, xs:string#1)
        else es:extract-array($source-node/roleNames, xs:string#1)
    let $contribClass  :=  ($source-node/class, $source-node/contribClass)[1] ! xs:string(.)
    let $refMovieContributor  := ($source-node/contrib, $source-node/refMovieContributor)[1] ! xs:string(.)
    let $refMovie  := ($source-node/movie, $source-node/refMovie)[1] ! xs:string(.) 
    let $instance := es:init-instance($source-node, 'Role')
    (: Comment or remove the following line to suppress attachments :)
        =>es:add-attachments($source)

    return
    if (empty($source-node/*))
    then $instance
    else $instance
        =>   map:with('roleType', $roleType)
        =>es:optional('roleNames', $roleNames)
        =>   map:with('contribClass', $contribClass)
        =>es:optional('refMovieContributor', $refMovieContributor)
        =>es:optional('refMovie', $refMovie)
};





(:~
 : Turns an entity instance into a canonical document structure.
 : Results in either a JSON document, or an XML document that conforms
 : to the entity-services schema.
 : Using this function as-is should be sufficient for most use
 : cases, and will play well with other generated artifacts.
 : @param $entity-instance A map:map instance returned from one of the extract-instance
 :    functions.
 : @param $format Either "json" or "xml". Determines output format of function
 : @return An XML element that encodes the instance.
 :)
declare function movieModel:instance-to-canonical(

    $entity-instance as map:map,
    $instance-format as xs:string
) as node()
{

        if ($instance-format eq "json")
        then xdmp:to-json( movieModel:canonicalize($entity-instance) )/node()
        else movieModel:instance-to-canonical-xml($entity-instance)
};


(:~
 : helper function to turn map structure of an instance, which uses specialized
 : keys to encode metadata, into a document tree, which uses the node structure
 : to encode all type and property information.
 :)
declare private function movieModel:canonicalize(
    $entity-instance as map:map
) as map:map
{
    json:object()
    =>map:with( map:get($entity-instance,'$type'),
                if ( map:contains($entity-instance, '$ref') )
                then fn:head( (map:get($entity-instance, '$ref'), json:object()) )
                else
                let $m := json:object()
                let $_ :=
                    for $key in map:keys($entity-instance)
                    let $instance-property := map:get($entity-instance, $key)
                    where ($key castable as xs:NCName)
                    return
                        typeswitch ($instance-property)
                        (: This branch handles embedded objects.  You can choose to prune
                           an entity's representation of extend it with lookups here. :)
                        case json:object
                            return
                                if (empty(map:keys($instance-property)))
                                then map:put($m, $key, json:object())
                                else map:put($m, $key, movieModel:canonicalize($instance-property))
                        (: An array can also treated as multiple elements :)
                        case json:array
                            return
                                (
                                for $val at $i in json:array-values($instance-property)
                                return
                                    if ($val instance of json:object)
                                    then json:set-item-at($instance-property, $i, movieModel:canonicalize($val))
                                    else (),
                                map:put($m, $key, $instance-property)
                                )

                        (: A sequence of values should be simply treated as multiple elements :)
                        (: TODO is this lossy? :)
                        case item()+
                            return
                                for $val in $instance-property
                                return map:put($m, $key, $val)
                        default return map:put($m, $key, $instance-property)
                return $m)
};





(:~
 : Turns an entity instance into an XML structure.
 : This out-of-the box implementation traverses a map structure
 : and turns it deterministically into an XML tree.
 : Using this function as-is should be sufficient for most use
 : cases, and will play well with other generated artifacts.
 : @param $entity-instance A map:map instance returned from one of the extract-instance
 :    functions.
 : @return An XML element that encodes the instance.
 :)
declare private function movieModel:instance-to-canonical-xml(
    $entity-instance as map:map
) as element()
{
    (: Construct an element that is named the same as the Entity Type :)
    let $namespace := map:get($entity-instance, "$namespace")
    let $namespace-prefix := map:get($entity-instance, "$namespacePrefix")
    let $nsdecl :=
        if ($namespace) then
        namespace { $namespace-prefix } { $namespace }
        else ()
    let $type-name := map:get($entity-instance, '$type')
    let $type-qname :=
        if ($namespace)
        then fn:QName( $namespace, $namespace-prefix || ":" || $type-name)
        else $type-name
    return
        element { $type-qname }  {
            $nsdecl,
            if ( map:contains($entity-instance, '$ref') )
            then map:get($entity-instance, '$ref')
            else
                for $key in map:keys($entity-instance)
                let $instance-property := map:get($entity-instance, $key)
                let $ns-key :=
                    if ($namespace and $key castable as xs:NCName)
                    then fn:QName( $namespace, $namespace-prefix || ":" || $key)
                    else $key
                where ($key castable as xs:NCName)
                return
                    typeswitch ($instance-property)
                    (: This branch handles embedded objects.  You can choose to prune
                       an entity's representation of extend it with lookups here. :)
                    case json:object+
                        return
                            for $prop in $instance-property
                            return element { $ns-key } { movieModel:instance-to-canonical-xml($prop) }
                    (: An array can also treated as multiple elements :)
                    case json:array
                        return
                            for $val in json:array-values($instance-property)
                            return
                                if ($val instance of json:object)
                                then element { $ns-key } {
                                    attribute datatype { 'array' },
                                    movieModel:instance-to-canonical-xml($val)
                                }
                                else element { $ns-key } {
                                    attribute datatype { 'array' },
                                    $val }
                    (: A sequence of values should be simply treated as multiple elements :)
                    case item()+
                        return
                            for $val in $instance-property
                            return element { $ns-key } { $val }
                    default return element { $ns-key } { $instance-property }
        }
};


(:
 : Wraps a canonical instance (returned by instance-to-canonical())
 : within an envelope patterned document, along with the source
 : document, which is stored in an attachments section.
 : @param $entity-instance an instance, as returned by an extract-instance
 : function
 : @param $entity-format Either "json" or "xml", selects the output format
 : for the envelope
 : @return A document which wraps both the canonical instance and source docs.
 :)
declare function movieModel:instance-to-envelope(
    $entity-instance as map:map,
    $envelope-format as xs:string
) as document-node()
{
    let $canonical := movieModel:instance-to-canonical($entity-instance, $envelope-format)
    let $attachments := es:serialize-attachments($entity-instance, $envelope-format)
    return
    if ($envelope-format eq "xml")
    then
        document {
            element es:envelope {
                element es:instance {
                    element es:info {
                        element es:title { map:get($entity-instance,'$type') },
                        element es:version { '0.0.1' }
                    },
                    $canonical
                },
                $attachments
            }
        }
    else
    document {
        object-node { 'envelope' :
            object-node { 'instance' :
                object-node { 'info' :
                    object-node {
                        'title' : map:get($entity-instance,'$type'),
                        'version' : '0.0.1'
                    }
                }
                +
                $canonical
            }
            +
            $attachments
        }
    }
};


(:
 : @param $entity-instance an instance, as returned by an extract-instance
 : function
 : @return A document which wraps both the canonical instance and source docs.
 :)
declare function movieModel:instance-to-envelope(
    $entity-instance as map:map
) as document-node()
{
    movieModel:instance-to-envelope($entity-instance, "xml")
};


