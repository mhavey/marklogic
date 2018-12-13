(:
This module tracks problems in mapping UML model to ES model descriptor.
:)

xquery version "1.0-ml";

module namespace pt = "http://marklogic.com/xmi2es/problemTracker"; 

(: 
Problem catalog. The goal of the transform is to make a best effort to generate ES code. 
We'll generate some semblance of a model and let the ES:validate facility determine whether the model is a go.
Therefore we will "under-validate", dealing only with problems in the XMI model and its transformation to ES.
Examples:
- We consider class with no name an issue, because we can't even express that in ES.
- But is a class has multiple PKs, let that flow through to ES and have ES reject it.
:)

(: TODO - remove the ones we dont use :)

declare variable $MODEL-NO-NAME := "Model has no name";
declare variable $MODEL-INVALID:= "!!!Model fails ES validation!!!";
declare variable $MODEL-NOT-FOUND := "Model not found";
declare variable $MODEL-BASE-URI-NOT-FOUND := "Model base URI not found";
declare variable $MODEL-VERSION-NOT-FOUND := "Model version not found";
declare variable $MODEL-DUPLICATE-CLASSES := "Model has duplicate class names";
declare variable $CLASS-NO-NAME := "Class has no name";
declare variable $CLASS-MULTI-INHERIT := "Class inherits from mulitple classes; unsupported";
declare variable $CLASS-MULTIFIELD-URI := "Class has multiple URI fields";
declare variable $CLASS-MULTIFIELD-SEM-IRI := "Class has multiple SEM IRI fields";
declare variable $CLASS-MULTIFIELD-SEM-LABEL := "Class has multiple SEM label fields";
declare variable $CLASS-SEM-NO-IRI := "SEM Class has no IRI";
declare variable $ATTRIB-NO-NAME := "Attrib has no name";
declare variable $ATTRIB-COLLATION-NONSTRING := "Collation provided for non-string datatype";
declare variable $ATTRIB-CARDINALITY-ONE := "Cardinality of element should be one";
declare variable $ATTRIB-CARDINALITY-ZERO-ONE := "Cardinality of element should be zero or one";
declare variable $ATTRIB-BROKEN-FK := "Unable to resolve FK";
declare variable $ATTRIB-XCALC-CIRCULAR := "Calculated attribute has circular dependency";
declare variable $ILLEGAL-TRIPLE-PO := "Illegal triple PO in hint";
declare variable $ILLEGAL-PERM := "Illegal perm kev-value pair";
declare variable $ILLEGAL-METADATA := "Illegal metadata kev-value pair";
declare variable $ILLEGAL-XES-TRIPLE := "Illegal XES triple";
declare variable $ILLEGAL-SEM-PREFIX := "Illegal sem prefix";
declare variable $ILLEGAL-SEM-FACT := "Illegal sem fact";
declare variable $ILLEGAL-SEM-QUAL := "Illegal sem qual";
declare variable $ILLEGAL-MUSICAL := "Illegal musical expression";

(:
initialize the problem tracker
:)
declare function pt:init() as json:array {
	json:array()
};

declare function pt:addProblem($problems as json:array, 
	$subjectIRI as sem:iri?, $subjectAlt as xs:string?, 
	$problemType as xs:string, $param) {
	let $problem := map:new((
		if (exists($subjectIRI)) then map:entry("subjectIRI", $subjectIRI) else(),
		if (exists($subjectAlt)) then map:entry("subjectAlt", $subjectAlt) else(),
		map:entry("problemType", $problemType),
		if (exists($param)) then map:entry("param", $param) else ()
	))
	return json:array-push($problems, $problem)
};

declare function pt:dumpProblems($problems as json:array) as node() {
	<Problems>{
		for $problem in json:array-values($problems) return <Problem>{$problem}</Problem>
	}</Problems>
};
