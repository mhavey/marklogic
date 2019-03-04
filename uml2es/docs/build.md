# Using the UML-to-Entity Services Toolkit In Your Build

The toolkit supports a gradle build process. Gradle is the most widely used build tool for MarkLogic implementations. 
The toolkit includes common gradle tasks to deploy your UML model and generate harmonization/conversion code from it. You use these tasks, as well as common [ml-gradle](https://github.com/marklogic-community/ml-gradle/wiki) and [data hub](https://marklogic.github.io/marklogic-data-hub/refs/gradle-tasks/) tasks, to deploy your application.

The toolkit provides a gradle build file containing all model deployment and code generation tasks: [../uml2esTransform/uml2es.gradle](../uml2esTransform/uml2es.gradle). Actually, it also includes a similar build file for use for DHF: [../uml2esTransform/uml2es4dhf.gradle](../uml2esTransform/uml2es4dhf.gradle).  Here is a summary of the tasks from that build file:

|Task|Description|Inputs|Dependencies|Effects|Usage|
|---|---|---|---|---|---|
|uDeployModel|Load your UML model into MarkLogic and convert it to ES|modelName (XMI or Excel filename without suffix)<br/>lax: true/false. Default: false (Use lax mode when transforming from UML to ES.)|Your gradle project has the folder data/model<br/>Your model is in that folder.<br/>Your model is XMI.<br/>Your model ends in .xml<br/>Standard ml-gradle environment properties: mlAppServicesHost, mlAppServicesPort. OR ...<br/>Standard DHF environment properties: mlHost, mlFinalPort<br/>|Target database has the UML model, the ES model, the ES extensions, findings, generated code<br/>Target database has the ES model and its extended triples deployed<br/>Your gradle project has entity-services, entity-services-dump, entity-services-extension folders<br/>You will see generated code in src/main/ml-config, src/main/ml-modules, src/main/ml-schemas|Vanilla or DHF|

hi

|uCreateDHFEntities|Create DHF plugin entities based on classes in your model-|DHF only.|
|uCreateDHFHarmonizeFlow|Generate a harmonization flow based on your model. This conversion is smart, if you ask it to be.|-|DHF only.|
|uLoadMappingSpec|Load an Excel mapping spec, which indicates how to map source data to the model. Used in the above tasks.|-|-|

The [../examples](../examples) and [../tutorials](../tutorials) of this toolkit show this gradle build in action. There are several ways to use it:

- Movie it into your gradle project as a build script solely for UML2ES. Keep a separate build script for your main build work. The examples and tutorials take this approach. When using it this way, edit plugin versions if needed. 
- Copy its tasks into your existing gradle build file. 
- Copy it into your gradle project and use it as your main gradle build file. Add app-specific build tasks to it as needed.

The mega tutorial [../tutorials/employeeCradleToGrave.md](../tutorials/employeeCradleToGrave.md) demonstrates the gradle build as key ingredient in a soup-to-nuts modeling example for DHF. Please go through this tutorial to see how to:

- Setup a brand new source-controlled MarkLogic gradle build for UML in DHF.
- Construct a UML model and maintain it as part of the gradle build. 
- Construct a source mapping spec and maintain it as part of the gradle build.
- Generate and refine by hand harmonization code to keep MarkLogic-persisted data true to the model. 

The tutorial also shows who does what in the build process. A modeler owns the UML model; a source data expert owns the mapping spec; developers own the harmonization code; and an adminstrator owns the environment and the indexes called for by the model. 