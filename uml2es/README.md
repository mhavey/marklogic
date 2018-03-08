# UML to Entity Services Sample

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
- examples/umlModels: Additional sample UML models

TODO - how to use this toolkit; where to start, what to do...