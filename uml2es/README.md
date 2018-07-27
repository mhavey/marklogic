# UML to Entity Services Sample

## Intro

This is a toolkit to support modeling MarkLogic data in UML and mapping that UML model to Entity Services. For background, refer to the following blog posts:

- <http://www.marklogic.com/blog/how-to-model-manage-entities-uml/>
- <http://developer.marklogic.com/blog/uml-modeling-marklogic-entity-services>

The toolkit consists of the following parts:
- uml2esTransform: MarkLogic server-side modules to map UML to Entity Services.
- umlProfile: A UML profile containing stereotypes for MarkLogic Entity Services. Use this profile to include ES configuration to your UML model.
- examples/movies: A sample UML model for movies. Includes ml-gradle build file to load this model into MarkLogic. Shows the full UML-to-ES workflow including ingestion of ES envelopes, deploying ES-generated database indexes, and running SQL against TDE views. The movie model demonstrates several types of document relationships. 
- examples/hr: A sample UML model for human resources. It models Departments and Employees. The sample shows how to load HR data into a MarkLogic data hub. It also demonstrates semantic relationships though the use of an organizational ontology. Additionally, it uses harmonization source code that the toolkit generates from the Entity Services model.
- examples/runningRace: A sample demonstrating interop. We model a running race in three UML editors: MagicDraw, Eclipse Modeling Framework (EMF), and Papyrus. We show that these UML models transform to the same ES model descriptor. Our model is based on one of the examples from MarkLogic's Entity Services github: <https://github.com/marklogic/entity-services/tree/master/entity-services-examples/example-races/>. 
- examples/blockFactory: A sample UML model that shows a technique for denormalization.
- examples/movietalk: A UML logcal data model for user posts about movies and actors. The model is merely logical. We do not generate an Entity Services model from it. Rather, when the application team built the movietalk application, they referred to the model but arranged the data in MarkLogic somewhat differently. The example demonstrates a strategy to compare the physical model to the logical model.  
- examples/umlModels: The full set of models

## How We Expect You Will Use This Toolkit
As a user, you want to design a data model using UML and then ingest data into MarkLogic that conforms to this model. Put differently, you plan to put significant data into MarkLogic and want to ensure that the structure of this data follows a well considered model. 

If that's you, we think this toolkit is for you. You will need the following ingredients:

- A **third-party UML tool** that supports XMI 2.x export and UML profiles with tagged values. In the examples provided in this toolkit we use MagicDraw, Eclipse EMF, and Papyrus. In this tool you will design UML class diagrams. Roughly speaking, the classes map to documents in MarkLogic; the attributes of the class map to document elements in MarkLogic.
- The **UML profile for MarkLogic**, provided in the umlProfile folder of this toolkit. You import this profile into your UML toolkit and then proceed to apply stereotypes from the profile to your classes and attributes. Using a stereotype, you can designate that a specific attribute should have a range index in MarkLogic, for example. In the umlProfile folder of this toolkit, you can find a full reference of the stereotypes we provide.
- A **transform module** to map your UML model to a form understood by MarkLogic: the Entity Services model. This module, written in XQuery, is in the uml2esTransform folder of this toolkit. There is a two-step process to using this module. First, you export your UML model to XMI (that's short for XMI Metadata Interchange); your UML tool needs to support that feature. Second, you pass in your XMI as input to the transform; it ouputs a JSON Entity Services model descriptor. Don't worry; the examples in this toolkit show how to call the transform and where it fits in your build-deploy-ingest workflow.
- A **build-deploy-ingest framework** to deploy your UML model to MarkLogic and ingest source data into MarkLogic in the form prescribed by the model. In other words, you need for your UML model to be more than a picture; you need MarkLogic code that shapes your data to fit the model. This toolkit provides several examples of a gradle-based approach. We recommend you one of these examples as your starting point, tailoring it for your needs.

## Where To Begin
Dive into the examples! The movies example is a good place to start. If you are planning to use MarkLogic's data hub framework, or if you are interested in semantics, begin with the hr example. 

## UML-to-Entity Services Mapping
Once you get deeper into the toolkit, you will need to better understand how the transform maps UML to Entity Services. Here is an overview:
- The transform maps a UML package to an Entity Services model. The package name is mapped to the entity model's title. The package's documentation comment is mapped to the entity model's description. If your packaged is stereotyped as esModel, the version and baseUri tags of that stereotype are mapped to the entity model's baseUri and version.
- The transform maps a UML class to an Entity Services entity. The class name is mapped to the entity name. The class's documenation comment is mapped to the entity's description. If the class is stereotyped as xmlNamespace, the prefix and url tags of that stereotype are mapped to the entity's prefix and uri. If the class is not stereotyped as xmlNamespace but the package is, then the transform maps the package's xmlNamespace to each entity's prefix and uri.
- The Transform maps a UML class attribute to an Entity Services property. The name of the attribute is mapped to the entity property's name. The package's documentation comment is mapped to the entity property's description.
- In a UML aggregation (whether shared or composition) relationship between two classes A and B, each is an attribute. The transform maps the attribute to a property in Entity Services. The type of that property is by default an **internal reference** to the other entity; A's property is a reference to B, and vice versa. If you stereotype that attribute as FK, the transform maps its type to the primitive type of the PK attribute of the corresponding entity; A's property type is that of B's primary key property, and vice versa.
- In a UML binary association relationship between two classes where there is **no association class**, the transform mapping logic is the same as with aggregation.
- In a UML binary association relationship between two classes A and B where there is an association class C, the transform maps as follows:
	* It maps the association class C to an entity.
	* In classes A and B, it maps the type of the attribute that refers to the association as an **internal reference to C**. 
	* It adds properties to C referencing A and B. The names of these attributes are refA and refB. The types of these attributes are by default **internal references** to A and B, respectively. If class A's attribute to the association is stereotyped as FK, then the transform sets the refB property type as the primary key of B. Similarly, class B's attribute to the association is stereotyped as FK, then the transform sets the refA property type as the primary key of A. It's subtle, I know. Take a look at the movie example's Role association for a concrete example. 
- The transform does not support ternary associations or any n-ary association beyond binary.
- In a UML generalization relationship, in which one class B inherits from class A, the transform ensures that entity B inherits the attributes and stereotypes of entity A. The transform also allows subclass B to override and refine class A. For example, it can change the type of an attribute, change the primary key, or add more collections or SEM types to those it inherits. 
- In the UML model, we can exclude a class or attribute. In this case, it is NOT added to the entity services descriptor. The movies example demonstrates one reason for doing this: excluding the superclass (MovieContributor), but keeping the subclasses (PersonContributor, CompanyContributor) in a generalization relationship.
- Type resolution. We have discussed how the transform maps type in the case of association and aggregation relationships. Generally the transform's type resolution sequence for an attribute is the following:
	* If the attribute has the mlType tag of the esProperty stereotype set, the transform sets the property's type as that value.
	* If the attribute has the externalRef tag of the esProperty stereotype set, the transform sets the property's type as an external reference with that value.
	* If the attribute refers to another class (via association or aggregation), the transform uses the logic described above to assign the property's Entity Services type.
	* If the attribute has a standard UML primitive type, the transform maps that type to the 
- Cardinality: 
	* If in the UML model an attribute has a multiplicity of 1, the transform designates it as a required property in the entity definition.
	* If in the UML model an attribute has a multiplicity of 0..* or 1..*, the transform designates the property as an array in the entity definition.
- Range indexes and PK: If one attribute in the UML class is stereotyped PK, the transform designates it the primary key of the entity. If an attribute in the UML class is stereotyped rangeIndex, the transform designates it as one of the indexes for the entity. 

Refer to the UML profile reference for more on these stereotypes, including newly developed model extensions and semantic generation capabilities. 

