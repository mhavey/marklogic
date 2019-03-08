# JokeBook - Advanced Semantics

## Intro
This example exercises all the semantic stereotypes of the toolkit's profile. It shows how to tie a UML class to a semantic class, how to relate UML classes using semantic properties, how to qualify a semantic property with additional semantic facts, and how to associate arbitrary semantic facts with a UML class.

Here is our UML model. 

![JokeBook](../umlModels/JokeBook.png)

The toolkit's documentation shows how JokeBook's model maps to triples: [../../docs/semantics.md](../../docs/semantics.md).

Read about the semantic stereotypes here: [../../docs/profile.md](../../docs/profile.md).

## How to run:

Our project uses gradle. Before running, view the settings in gradle.properties. Create a file called gradle-local.properties and in this file override any of the properties from gradle.properties.

Here are the steps to setup.

### Setup DB
Setup new DB. Will use basic DB config with no indexes. Will bring in XMI2ES transform to our modules.

Run the following:

gradle -PenvironmentName=local -i setup mlDeploy

Confirm:
- New DB and app server created with name xmi2es-examples-jokebook.
- Content DB is empty
- Modules DB includes these modules
  * /xmi2es/xmi2esTransform.xqy - Main module of the toolkit's transform

### Transform UML to ES
Next, move our UML model into ML as an ES model. Run the following:

gradle -b uml2es.gradle -PenvironmentName=local -i -PmodelName=JokeBook uDeployModel 

Confirm:
- Content DB has the following documents
	* /xmi2es/es/JokeBook.json - the ES model for the joke book
	* /xmi2es/extension/JokeBook.ttl - the extended ES model for the joke book
	* /xmi2es/findings/JokeBook.xml - findings during the transform of the joke book model
	* /xmi2es/gen/JokeBook/lib.sjs - generated Javascript code to create the triples
	* /xmi2es/gen/JokeBook/lib.xqy - generated XQuery code to create the triples
- In your local gradle project, the generated code (JokeBook/lib.sjs and JokeBook/lib.xqy are in the src/main/ml-modules/root/modelgen directory.)

Check the /xmi2es/findings/JokeBook.xml file. This indicates whether there were any issues during the transform. Verify there are none.

In Query Console, open a tab of type SPARQL, point to the content DB, run the following query, and verify you get any results. This means the ES model is in FINAL and its semantic metadata is populated.

select * where {?s ?o ?p}

Among the results, you should see the following:
- <http://com.marklogic.es.uml.joke/JokeBook-0.0.1/JokeBook/selectedJokes>	<http://marklogic.com/entity-services#title>	"selectedJokes" - From basic ES model
- <http://com.marklogic.es.uml.joke/JokeBook-0.0.1/JokeBook/selectedJokes>	<http://marklogic.com/xmi2es/xes#semPredicate>	<http://www.w3.org/ns/prov#wasDerivedFrom> - From the extended ES model

### Deploy the Generated Code
The generated code needs to be deployed. Run the following:

gradle -PenvironmentName=local -i mlReloadModules 

## Explore
In Query Console, import XMI2ESJokeBook.xml workspace. You won't want to miss this part; it's where the fun happens: you create documents whose embedded triples conform to the model! 
