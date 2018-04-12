# UML to Entity Services Sample

## Intro

This is a toolkit to support modeling MarkLogic data in UML and mapping that UML model to Entity Services. For background, refer to the following blog posts:

- <http://www.marklogic.com/blog/how-to-model-manage-entities-uml/>
- <http://developer.marklogic.com/blog/uml-modeling-marklogic-entity-services>

The toolkit consists of the following parts:
- uml2esTransform: MarkLogic server-side modules to map UML to Entity Services.
- umlProfile: A UML profile containing stereotypes for MarkLogic Entity Services. Use this profile to include ES configuration to your UML model.
- examples/movies: A sample UML model for movies. Includes ml-gradle build file to load this model into MarkLogic. Shows the full UML-to-ES workflow including ingestion of ES envelopes, deploying ES-generated database indexes, and running SQL against TDE views. The movie model demonstrates several types of document relationships. 
- examples/hr: A sample UML model for human resources. It models Departments and Employees. The sample shows how to load HR data into a MarkLogic data hub. It also demonstrates semantic relationships though the use of an organizational ontology.
- examples/runningRace: A sample demonstrating interop. We model a running race in two UML editors: MagicDraw and Eclipse Modeling Framework (EMF). We show that both UML models transforms to the same ES model descriptor. Our model is based on one of the examples from MarkLogic's Entity Services github: <https://github.com/marklogic/entity-services/tree/master/entity-services-examples/example-races/>. 
- examples/blockFactory: A sample UML model that shows a technique for denormalization.
- examples/umlModels: All models

## How We Expect You Will Use This Toolkit
As a user, you want to design a data model using UML and then ingest data into MarkLogic that conforms to this model. Put differently, you plan to put significant data into MarkLogic and want to ensure that the structure of this data follows a well considered model. 

If that's you, we think this toolkit is for you. You will need the following ingredients:

- A **third-party UML tool** that supports XMI 2.x export and UML profiles with tagged values. In the examples provided in this toolkit we use MagicDraw and Eclipse EMF. In this tool you will design UML class diagrams. Roughly speaking, the classes map to documents in MarkLogic; the attributes of the class map to document elements in MarkLogic.
- The **UML profile for MarkLogic**, provided in the umlProfile folder of this toolkit. You import this profile into your UML toolkit and then proceed to apply stereotypes from the profile to your classes and attributes. Using a stereotype, you can designate that a specific attribute should have a range index in MarkLogic, for example. In the umlProfile folder of this toolkit, you can find a full reference of the stereotypes we provide.
- A **transform module** to map your UML model to a form understood by MarkLogic: the Entity Services model. This module, written in XQuery, is in the uml2esTransform folder of this toolkit. There is a two-step process to using this module. First, you export your UML model to XMI (that's short for XMI Metadata Interchange); your UML tool needs to support that feature. Second, you pass in your XMI as input to the transform; it ouputs a JSON Entity Services model descriptor. Don't worry; the examples in this toolkit show how to call the transform and where it fits in your build-deploy-ingest workflow.
- A **build-deploy-ingest framework** to deploy your UML model to MarkLogic and ingest source data into MarkLogic in the form prescribed by the model. In other words, you need for your UML model to be more than a picture; you need MarkLogic code that shapes your data to fit the model. This toolkit provides several examples of a gradle-based approach. We recommend you one of these examples as your starting point, tailoring it for your needs.

## Where To Begin
Dive into the examples! The movies example is a good place to start. If you are planning to use MarkLogic's data hub framework, or if you are interested in semantics, begin with the hr example. 

## UML-to-Entity Services Mapping
Once you get deeper in

UML package - name, package documentation comment

|UML Element|Entity Services|
|---|---|
|Package||Model|
|Package name|Model titie|
|Package documentation comment|Model description|
|Package stereotype(esModel.baseURI|Model baseURI|
|Package stereotype(esModel.version)|Model version|
|Class|Entity|
|Class name|Entity name|
|Class documentation comment|Entity description|
|Class stereotype(xmlNamespace.prefix/url)|Entity namespace. Can also specific xmlNamepace at package level to apply to all classes.|
|Attribute stereotype(PK)|Entity primary key. The transform validates that at most one attribute in the class has PK.|

