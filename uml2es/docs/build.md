# Using the UML-to-Entity Services Toolkit In Your Build

The toolkit supports a gradle build process. Gradle is the most widely used build tool for MarkLogic implementations. 
The toolkit includes common gradle tasks to deploy your UML model and generate harmonization/conversion code from it. You use these tasks, as well as common [ml-gradle](https://github.com/marklogic-community/ml-gradle/wiki) and [data hub](https://marklogic.github.io/marklogic-data-hub/refs/gradle-tasks/) tasks, to deploy your application.

The toolkit provides a gradle build file containing all model deployment and code generation tasks. Actually, it provides three versions of this build file: 

- One for DHF 5.x applications [../uml2esTransform/uml2es4dhf5.gradle](../uml2esTransform/uml2es4dhf5.gradle)
- One for DHF 4.1 applications [../uml2esTransform/uml2es4dhf4.gradle](../uml2esTransform/uml2es4dhf4.gradle)
- One for vanilla, non-DHF, applications [../uml2esTransform/uml2es.gradle](../uml2esTransform/uml2es.gradle)

Here is a summary of the tasks from that build file:

## Build Tasks

### uDeployModel

*Purpose*: Load your UML model into MarkLogic and convert it to ES.

*Architectures* : Vanilla, DHF 4.1, DHF 5.x

*Input:* 
- modelFile: Full or relative path to your UML/XMI or Excel filename
- lax: true/false. Default: false. (Use lax=true if model is missing attribute types or has other missing info.)

*Dependencies:*
- Standard ml-gradle environment properties: mlAppServicesHost, mlAppServicesPort. OR ...
- Standard DHF environment properties: mlHost, mlFinalPort. ...
- UML2ES transform deployed to your modules database

*Effects:*
- Target database has the original UML model and the outputs of transforming it to ES: the ES model, the ES extensions, findings, some generated code
- Your gradle project has entity-services, entity-services-dump, entity-services-extension folders
- Vanilla architecture: The model is fully deployed, meaning MarkLogic is aware of the model and allows you to introspect the model using semantic queries. If you want to generate code/artifacts from it, run built-in non-UML2ES gradle task mlGenerateModelArtifacts
- In the DHF architecture, the model is "deployed" in the loose sense it can be semantically introspected. But in DHF no entities have yet been created. 

### uCreateDHFEntities

*Purpose*: Create DHF entities based on classes in your model.

*Architectures* : DHF 4.1, DHF 5.x

*DHF/Vanilla*: DHF

*Input:* 
- modelFile: Full or relative path to your UML/XMI or Excel filename
- entitySelect (optional) - Instructions on which classes in the model should become DHF entities. Possible values:
	* "infer" - Infer which classes are entities. Ignore entities specified. (This works well for tree-based models where the candidate classes are parents but not children, such as [../examples/hr](../examples/hr). It does not always work. For example, in the graph-like model [../examples/movies](../examples/movies), the Movie class cannot be inferred to be *entity worthy*.
	* "all" - All classes are considered entities. 
	* "stereotyped" - Classes stereotyped xDHFEntity are considered entities.
- entities (optional) - A list of class names (comma-separated) representing entities to create. Use this if you want to specify your own list of entities and none of the entitySelect options works for you. 

*Dependencies:* 
- You have already run uDeployModel successfully

*Effects:*
- DHF 5.x - New entities created under entities folder
- DHF 4.1 - New plugins created under plugins/entities folder

### uCreateDHFHarmonizeFlow

EOL. For DHF 4.1 only. See [../examples/hr](../examples/hr) and [../tutorials/employeeCradleToGrave.md](../tutorials/employeeCradleToGrave.md) for examples of use.

### uLoadMappingSpec

EOL. Used with DHF 4.1 architecture to generate helpful mapping/harmonization code. In DHF 5, mapping is declarative; the need for the capability is diminished. If you are still on DHF 4.1 and are interested in using this capability, refer to [../examples/hr](../examples/hr).  

### uCreateConversionModule

EOL and not tested. Meant for vanilla architectures. Generates souped-up conversion code, more comprehensive that what ES generates out of the box. 

## Build Tips

The [../examples](../examples) and [../tutorials](../tutorials) of this toolkit show this gradle build in action. There are several ways to use it:

- Move it into your gradle project as a build script solely for UML2ES. Keep a separate build script for your main build work. The examples and tutorials take this approach. When using it this way, you might need to edit plugin versions in your copy of the UML2ES build file. For example, you might need to change the MLCP version or the version of the DHF plugin.
- Copy its tasks into your existing gradle build file. 
- Copy it into your gradle project and use it as your main gradle build file. Add app-specific build tasks to it for your own needs.

The mega tutorial [../tutorials/employeeCradleToGrave.md](../tutorials/employeeCradleToGrave.md) demonstrates the gradle build as key ingredient in a soup-to-nuts modeling example for DHF. Please go through this tutorial to see how to:

- Setup a brand new source-controlled MarkLogic gradle build for UML in DHF.
- Construct a UML model and maintain it as part of the gradle build. 
- Construct a source mapping spec and maintain it as part of the gradle build.
- Generate and refine by hand harmonization code to keep MarkLogic-persisted data true to the model. 

The tutorial also shows who does what in the build process. A modeler owns the UML model; a source data expert owns the mapping spec; developers own the harmonization code; and an adminstrator owns the environment and the indexes called for by the model. 
