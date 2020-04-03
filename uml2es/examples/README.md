The examples show various uses of UML2ES. The table summarizes the examples:



Summary of examples:

- examples/movies: A sample UML model for movies. Includes ml-gradle build file to load this model into MarkLogic. Shows the full UML-to-ES workflow including ingestion of ES envelopes, deploying ES-generated database indexes, and running SQL against TDE views. The movie model demonstrates several types of document relationships. 
- examples/hr5: A sample UML model for human resources. It models Departments and Employees. The sample shows how to load HR data into a MarkLogic data hub 5.1. It also demonstrates semantic relationships though the use of an organizational ontology. Additionally, it showcases the *Data Hub Framework Cookie Cutter* to generate hub entities and harmonization flows. 


- examples/hr: A sample UML model for human resources. It models Departments and Employees. The sample shows how to load HR data into a MarkLogic data hub. It also demonstrates semantic relationships though the use of an organizational ontology. Additionally, it showcases the *Data Hub Framework Cookie Cutter* to generate hub entities and harmonization flows. 
- examples/runningRace: A sample demonstrating interop. We model a running race in three UML editors: MagicDraw, Eclipse Modeling Framework (EMF), and Papyrus. We show that all UML models transfor to the same ES model descriptor. Our model is based on one of the examples from MarkLogic's Entity Services github: <https://github.com/marklogic/entity-services/tree/master/entity-services-examples/example-races/>. 
- examples/blockFactory: A sample UML model that shows a technique for denormalization.
- examples/movietalk: A UML logcal data model for user posts about movies and actors. The model is merely logical. We do not generate an Entity Services model from it. Rather, when the application team built the movietalk application, they referred to the model but arranged the data in MarkLogic somewhat differently. The example demonstrates a strategy to compare the physical model to the logical model.  
- examples/hrexcel: Demonstrates loading an entity services model from an Excel data model template. No UML! We use the HR example from above (examples/hr). We pass our Excel spreadsheet (containing the HR model in tablular form) into the transformation. The transformation produces the same entity services model (including extensions and generated code) as produces from the UML model in examples/hr. 
- examples/declarativeCity: A simple city data model that uses the Declarative Mapper tool to map source data. The example shows the integration of UML, Entity Services, and Declarative Mapper. 
- examples/jokeBook: A mixed model demonstrating advanced semantic relationships like qualified predicates and arbitrary semantic facts.
- examples/gentest: Code generation tests.
- examples/umlModels: The full set of models

The following table summarizes the features demonstrated in the examples:

TODO ... DHF 4 vs. 5....

|Feature|Example|
|---|---|
|DHF|hr, gentest|
|UML class relationships|movies, blockFactory|
|Mapping spec|hr|
|Cookie cutter|hr, gentest|
|Model comparison|runningRace, hrexcel|
|Logical vs. physical|movietalk|
|Interop|runningRace|
|Discovery|movieTalk, hr|
|ES conversion module|movies|
|Declarative Mapper|declarativeCity, hr (COMING SOON)|
|TDE|movies|
|Semantics|hr, jokeBook|
|Excel2ES|hrexcel|
