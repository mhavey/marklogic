# UML Profile for MarkLogic Entity Services

## Intro
This folder contains the UML profile for MarkLogic Entity Services. The profile contains stereotypes. You apply stereotypes to your model, class, or attribute to affect how this toolkit's transform maps your UML model to MarkLLogic Entity Services format. 

When defining your UML model in your UML tool of choice, import this profile into the tool to allow you to stereotype your model with ES-specific stereotypes.

How to do this depends on which tool you choose. In MagicDraw, for example, with your model open, from File menu select Use Project. 

Here is a visual representation of the profile:

![Profile](magicdraw/profile.png)

## Reference
Stereotypes are organized into three sections: 
- **Core model**: These stereotypes (the pale yellow ones above) enhance your UML model with configuration to be included in the Entity Services model descriptor. An example is to designate a **rangeIndex** on a class attribute. If you include that stereotype in your UML model, the transform will include the range index in the Entity Services model descriptor. See [http://docs.marklogic.com/guide/entity-services/models] for a full reference to the descriptor.
- **Extended model**: These stereotypes (the blue ones above) enhance your UML model with configuration that **extends** the core model with **additional facts**. For example, the core model does not allow you to associate with a class a set of collections and permissions. But using the **xDocument** stereotype, you can make that association in the extended model. If you include that stereotype in your UML model, the transform will add a fact (expressed as a semantic triple) to the extended model indicating your collections and permissions. See [http://docs.marklogic.com/guide/entity-services/models#id_28304] for more on how facts can extend the model.
- **Semantics** - These stereotypes (the orange ones above) allow you to add semantic information to your model. Use this feature if you plan to use a multi-model database, consisting of not only documents but also semantic triples. The HR example from this toolkit showcases this feature. In that example, we have Employee and Department documents, but we also use semantic triples to express organizational relationships, such as employee reporting structure and employee membership in departments. The toolkit's transform module generates XQuery that you can use at runtime, as you ingest your source date, to express those relationships as triples. 

The following table describes each stereotype:

|Section|Level|Stereotype|Tag|Mapping To Entity Services|
|---|---|---|---|---|
|core|Package|esModel|version|Entity Services model version|
|core|Package|esModel|baseURI|Entity Services model base URI|
|core|Package|xmlNamespace|prefix|Entity Services XML namespace prefix for all entities|
|core|Package|xmlNamespace|url|Entity Services XML namespace URL for all entities|
|core|Class|xmlNamespace|prefix|Entity Services XML namespace prefix for that entity. Overrides package-level.|
|core|Class|xmlNamespace|url|Entity Services XML namespace URL for that entity. Overrides package-level.|
|core|Class|exclude||Transform will not include entity corresponding to this class.|
|core|Attribute|exclude||Transform will not include entity property corresponding to this attribute.|
|core|Attribute|PK||The property corresponding to this attribute is the one and only primary key of the entity.|
|core|Attribute|FK||The attribute refers to another class, but the corresponding property's type will be the corresponding entity's primary key type rather than an internal reference.|
|core|Attribute|rangeIndex|indexType|The property corresponding to this attribute is added to the list of indexes of the specified type for the entity.|
|core|Attribute|esProperty|mlType|The property corresponding to this attribute will have the specified type.|
|core|Attribute|esProperty|externalRef|The property corresponding to this attribute will be an external reference with the specified value.|
|core|Attribute|esProperty|collation|The string property corresponding to this attribute will have the specified collation.|
|extended|Package|xImplHints|reminders|Transform will, in the extended model, associate the model with the specified reminders.|
|extended|Package|xImplHints|triplesPO|Transform will, in the extended model, association the model with the specified (predicate, object).|
|extended|Class|xImplHints|reminders|Transform will, in the extended model, associate the entity with the specified reminders.|
|extended|Class|xImplHints|triplesPO|Transform will, in the extended model, association the entity with the specified  (predicate, object).|
|extended|Class|xDocument|collections|Transform will, in the extended model, associate the entity with the specified collections.|
|extended|Class|xDocument|permsCR|Transform will, in the extended model, associate the entity with the specified permissions (expressed as capability,role).|
|extended|Class|xDocument|quality|Transform will, in the extended model, associate the entity with the specified quality.|
|extended|Class|xDocument|metadataKV|Transform will, in the extended model, associate the entity with the metadata properties, expressed as (key, value).|
|extended|Attribute|xImplHints|reminders|Transform will, in the extended model, associate the property with the specified reminders.|
|extended|Attribute|xImplHints|triplesPO|Transform will, in the extended model, association the property with the specified (predicate, object).|
|extended|Attribute|xCalculated|concat|Transform will, in the extended model, associate the property with the specified concatenation of values.|
|extended|Attribute|xURI||Transform will, in the extended model, identify the property as the one whose value is the entity's URI.|
|extended|Attribute|xBizKey||Transform will, in the extended model, identify the property as one of the business keys of the entity.|
|extended|Attribute|xHeader||Transform will, in the extended model, identify the property as one an envelope header field.|
|semantic|Class|semType|types|Transform will generate XQuery code that creates a triple specifying that the RDF type of the entity is the type given. Note, this requires that one attribute be designed semIRI. The triple is (semIRI, rdf:type, types).|
|semantic|Attribute|semIRI||Transform will generate XQuery code that identifies the value of this property as the IRI of the entity.|
|semantic|Attribute|semLabel||Transform will generate XQuery code that creates a triple specifying that the RDFS label of the entity is the value of this property. The triple is (semIRI, rdfs:label, value of property).
|semantic|Attribute|semProperty|predicate|Transform will generate XQuery code that creates a triple specifying that this entity has for the specified predicate the value given by this property. The triple is (semIRI, predicate, value of property).|

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
|core|exclude|Not inherited. The superclass is excluded, but subclasses are by default included. The movies example shows the utility of using the superclass merely to define common attributes. In that example the superclass, Contributor, is excluded from the ES model. Its subclasses -- PersonContributor and CompanyContributor -- are included and inherit the attributes of Contributor.|UML-to-ES generator|
|extended|xImplHints|Not inherited. Hints are part of the extended model and used only in comment blocks and by code generators. Whoever's watching can apply the hints to subclasses if it deems appropriate.|Your code/code generator.|
|extended|xDocument|Inherited. If subclass also defines this stereotype it is ADDING. To have the subclass REPLACE/OVERRIDE rather than ADD, it should drop a hint.|DHF code generator. Your code generator or code.|
|sem|Class|semTypes|Inherited. If subclass also defines this stereotype it is ADDING. To have the subclass REPLACE/OVERRIDE rather than ADD, it should drop a hint.|DHF code generator. Your code generator or code.|
