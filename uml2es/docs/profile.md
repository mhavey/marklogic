# The MarkLogic Entity Services Profile For UML

## Intro
The MarkLogic Entity Services profile contains stereotypes that you apply to your UML model to affect how this toolkit's transform maps your UML model to MarkLLogic Entity Services format. 

When defining your UML model in your UML tool of choice, import this profile into the tool to allow you to stereotype your model with ES-specific stereotypes. The [tutorials](../tutorials) show how to do this with [MagicDraw](../tutorials/magicdraw_model_edit.md) and [Papyrus](../tutorials/papyrus_model_edit.md).

Here is a visual representation of the profile:

![Profile](../umlProfile/magicdraw/profile.png)

## Reference
Stereotypes are organized into three sections: 
- **Core model**: These stereotypes (the pale yellow ones above) enhance your UML model with configuration to be included in the Entity Services model descriptor. An example is to designate a **rangeIndex** on a class attribute. If you include that stereotype in your UML model, the transform will include the range index in the Entity Services model descriptor. See [http://docs.marklogic.com/guide/entity-services/models] for a full reference to the descriptor.
- **Extended model**: These stereotypes (the blue ones above) enhance your UML model with configuration that **extends** the core model with **additional facts**. For example, the core model does not allow you to associate with a class a set of collections and permissions. But using the **xDocument** stereotype, you can make that association in the extended model. If you include that stereotype in your UML model, the transform will add a fact (expressed as a semantic triple) to the extended model indicating your collections and permissions. See [http://docs.marklogic.com/guide/entity-services/models#id_28304] for more on how facts can extend the model.
- **Semantics** - These stereotypes (the orange ones above) allow you to add semantic information to your model. Use this feature if you plan to use a multi-model database, consisting of not only documents but also semantic triples. The [HR example](../examples/hr) from this toolkit showcases this feature. In that example, we have Employee and Department documents, but we also use semantic triples to express organizational relationships, such as employee reporting structure and employee membership in departments. The toolkit's transform module generates XQuery or Javascript code that you can use at runtime, as you ingest your source date, to express those relationships as triples. For additional discussion of how the toolkit handles semantics, refer to [semantics.md](semantics.md). 

The following table describes each stereotype:

|Section|Level|Stereotype|Tag|Mapping To Entity Services|
|---|---|---|---|---|
|core|Model|esModel|version|Entity Services model version|
|core|Model|esModel|baseURI|Entity Services model base URI|
|core|Model|xmlNamespace|prefix|Entity Services XML namespace prefix for all entities|
|core|Model|xmlNamespace|url|Entity Services XML namespace URL for all entities|
|core|Class|xmlNamespace|prefix|Entity Services XML namespace prefix for that entity. Overrides package-level.|
|core|Class|xmlNamespace|url|Entity Services XML namespace URL for that entity. Overrides package-level.|
|core|Class|exclude||Transform will not include entity corresponding to this class.|
|core|Attribute|PII||Mark this attribute as personally identifiable information.|
|core|Attribute|exclude||Transform will not include entity property corresponding to this attribute.|
|core|Attribute|PK||The property corresponding to this attribute is the one and only primary key of the entity.|
|core|Attribute|FK||The attribute refers to another class, but the corresponding property's type will be the corresponding entity's primary key type rather than an internal reference.|
|core|Attribute|rangeIndex|indexType|The property corresponding to this attribute is added to the list of indexes of the specified type for the entity.|
|core|Attribute|esProperty|mlType|The property corresponding to this attribute will have the specified type.|
|core|Attribute|esProperty|externalRef|The property corresponding to this attribute will be an external reference with the specified value.|
|core|Attribute|esProperty|collation|The string property corresponding to this attribute will have the specified collation.|
|extended|Model|xImplHints|reminders|Transform will, in the *extended model*, transform will associate the model with the specified reminders.|
|extended|Model|xImplHints|triplesPO|Transform will, in the *extended model*, associate the model with the specified predicate-object combination. This is your way to add more facts about the model to the extended model. The facts are expressed as triples. You do not specify a subject; the subject refers to the model that you are stereotyping. You specify the predicate and object as a comma-separated string: "predicate,object". You can specify many such strings, one for each fact. The predicate is an IRI without prefix or angled brackets. The object is a string literal. Example: "http://xyz.org/usesUMLTool,Payrus".|
|extended|Class|xImplHints|reminders|Transform will, in the *extended model*, associate the class with the specified reminders.|
|extended|Class|xImplHints|triplesPO|Transform will, in the *extended model*, associate the class with the specified predicate-object combination. This is your way to add more facts about the class to the ES extended model. The facts are expressed as triples. You do not specify a subject; the subject refers to the class that you are stereotyping. You specify the predicate and object as a comma-separated string: "predicate,object". You can specify many such strings, one for each fact. The predicate is an IRI without prefix or angled brackets. The object is a string literal. Example: "http://xyz.org/mainframeData,true".|
|extended|Class|xDocument|collections|Transform will, in the *extended model*, associate the class with the specified collections.|
|extended|Class|xDocument|permsCR|Transform will, in the *extended model*, associate the class with the specified permissions (expressed as capability,role).|
|extended|Class|xDocument|quality|Transform will, in the *extended model*, associate the class with the specified quality.|
|extended|Class|xDocument|metadataKV|Transform will, in the *extended model*, associate the class with the metadata properties, expressed as (key, value).|
|extended|Attribute|xImplHints|reminders|Transform will, in the *extended model*, associate the attribute with the specified reminders.|
|extended|Attribute|xImplHints|triplesPO|Transform will, in the *extended model*, associate the property with the specified predicate-object combination. This is your way to add more facts about the attribute to the extended model. The facts are expressed as triples. You do not specify a subject; the subject refers to the attribute that you are stereotyping. You specify the predicate and object as a comma-separated string: "predicate,object". You can specify many such strings, one for each fact. The predicate is an IRI without prefix or angled brackets. The object is a string literal. Example: "http://xyz.org/hasSpellingDictionary,/spelling/name.xml". |
|extended|Attribute|xCalculated|concat|Transform will, in the *extended model*, associate the attribute with the specified concatenation of values.|
|extended|Attribute|xURI||Transform will, in the *extended model*, identify the attribute as the one whose value is the entity's URI.|
|extended|Attribute|xBizKey||Transform will, in the *extended model*, identify the attribute as one of the business keys of the entity.|
|extended|Attribute|xHeader||Transform will, in the *extended model*, identify the attribute as one an envelope header field.|
|semantic|Model|semPrefixes|prefixesTtl|Here you define prefixes of IRIs that you refer to in the other semantic stereotypes. In the tag prefixesTtl, you write these prefixes as Turtle code. You don't need to define common prefixes like owl, rdf, foaf; for a complete list of pre-defined prefixes, see <http://docs.marklogic.com/sem:prefixes>. or examples, see [semantics.md](semantics.md).|
|semantic|Class|semType|types|Here you specify the RDF types that document instances of the class belong to. The types tag is a String array. For each value in the array, the transform adds a triple indicating that the document instance has as rdf:type the value specified. The document instance is identified by its IRI; you must designate one attribute of the class as semIRI. Each value in the types array is understood to be the IRI of a class. You can use a prefix to specify the IRI; you may also specify a fully-qualified IRI (with or without angled brackets). For examples, see [semantics.md](semantics.md).|
|semantic|Class|semFacts|factsTtl|Here you can specify any triples you like that pertain to document instances of the class. You write the triples as Turtle code in the factsTtl tag. For examples, see [semantics.md](semantics.md).|
|semantic|Attribute|semIRI||Here you specify the IRI of a document instance of this class. This attribute can have either a string or an IRI type. Typically the IRI is dynamic, dependent on other attributes in the class. You can use the xCalculated stereotype to build the IRI dynamically. You can use a prefix to specify the IRI; you may also specify a fully-qualified IRI (with or without angled brackets). For examples, see [semantics.md](semantics.md).|
|semantic|Attribute|semLabel||Transform will record as the English RDFS label of a document of this class the value of this attribute. If you need more flexibility in labelling (e.g, French RDFS label, SKOS labels), use semFacts. For examples, see [semantics.md](semantics.md).|
|semantic|Attribute|semProperty|predicate|Here you specify a semantic property of the document instance of your class. The subject of the property is the IRI of your document instance; you must designate one of the attributes as semIRI. As for the predicate of the property, you specify that in the predicate tag. It is an IRI that you can define using a prefix or fully-qualified (with or without angled brackets). The object of the property is the value of the attribute. It is either a literal or an IRI. The transform determines the value as literal unless its type is IRI or String. If the type is String, the transform determines the value is a String literal unless it uses a prefix or angled brackets. For examples, see [semantics.md](semantics.md).|
|semantic|Attribute|semProperty|predicateTtl|Transform includes additional Turtle triples for this semantic property. Use this when the property needs qualification. For examples, see [semantics.md](semantics.md).|

## Inheritance of Stereotypes
One issue in which we need to clearly set the rules is the inheritance of stereotypes from a superclass to a subclass. If class B refers to class A using a generalization relationship, B inherits the attributes of A. But does B also inherit the stereotypes of those attributes? And what of the class-level stereotypes? Does B inherit the class-level stereotypes of A?

Let's start with attributes. If superclass A defines attribute X, subclass B inherits attribute X with all of its stereotypes. If B does an OVERRIDE and specifies X as one of its attributes, B uses its own definition of X; B's attribute X does NOT inherit the stereotypes of A's attribute X. 

This can have significant consequences. For example, if X is stereotyped as PK in A but not in B, then X is NOT the primary key of B. Overriding the attribute has removed the primary key from B. If B wants a primary key, it needs to stereotype some other attribute as PK.  

On the other hand, suppose B leaves attribute X alone, inheriting it from A without overriding it. If B then adds a new attribute Y, which is not present in A, and stereotypes Y as PK, then B has TWO primary keys: X and Y. This is a problem; at most one primary key is permitted in a class.

Worse, suppose A has class-level stereotype semTypes and its attribute Z is stereotyped semIRI. Suppose B overrides attribute Z and, as a result, NONE OF ITS attributes is stereotyped as semIRI. This leads to a problem. B inherits the semantic types of A but has no IRI field; there is no way to specify triples indicating that instances of B have the RDF types specified by semTypes. 

Overriding inherited stereotyped attributes requires care. You usually DON'T NEED TO DO IT. When you do, don't shoot yourself in the foot.

As for class-level stereotypes, B inherits most, but not all, stereotypes from A. When B applies to itself a stereotype it inherits from A, in some cases the effect is to ADD to A's defintiion. In others the effect is to OVERRIDE/REPLACE A's definition.

The following table summarizes how the transform resolves class stereotype inheritance.

|Section|Stereotype|Inheritance Behavior|Who's Watching|
|---|---|---|---|
|core|xmlNamespace|Inherited but subclass can override it by defining the same stereotype.|UML-to-ES generator|
|core|exclude|Not inherited. The superclass is excluded, but subclasses are by default included. The [movies example](../examples/movies) shows the utility of using the superclass merely to define common attributes. In that example the superclass, Contributor, is excluded from the ES model. Its subclasses -- PersonContributor and CompanyContributor -- are included and inherit the attributes of Contributor.|UML-to-ES generator|
|extended|xImplHints|Not inherited. Hints are part of the extended model and used only in comment blocks and by code generators. Whoever's watching can apply the hints to subclasses if it deems appropriate.|Your code/code generator.|
|extended|xDocument|Inherited. If subclass also defines this stereotype it is ADDING. To have the subclass REPLACE/OVERRIDE rather than ADD, it should drop a hint.|DHF code generator. Your code generator or code.|
|sem|semTypes|Inherited. If subclass also defines this stereotype it is ADDING. To have the subclass REPLACE/OVERRIDE rather than ADD, it should drop a hint.|DHF code generator. Your code generator or code.|
|sem|facts|Inherited. If the subclass also defines this stereotype, it is ADDING. To have the subclass REPLACE/OVERRIDE rather than ADD, it should drop a hint.|DHF code generator. Your code generator or code.|
