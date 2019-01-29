# Using the UML-to-Entity Services Toolkit In Your Build

The toolkit supports a gradle build process. Gradle is the most widely used build tool for MarkLogic implementations. 
The toolkit includes common gradle tasks to deploy your UML model and generate harmonization/conversion code from it. You use these tasks, as well as common [ml-gradle](https://github.com/marklogic-community/ml-gradle/wiki) and [data hub](https://marklogic.github.io/marklogic-data-hub/refs/gradle-tasks/) tasks, to deploy your application.

The toolkit provides a gradle build file containing all model deployment and code generation tasks: [../uml2esTransform/uml2es.gradle](../uml2esTransform/uml2es.gradle). Actually, it also includes a similar build file for use for DHF: [../uml2esTransform/uml2es4dhf.gradle](../uml2esTransform/uml2es4dhf.gradle).  Here is a summary of the tasks from that build file:

- uDeployModel: Load your UML model in MarkLogic and convert it to ES.
- uCreateDHFEntities: If you use DHF, create DHF plugin entities based on classes in your model
- uCreateDHFHarmonizeFlow: If you use DHF, generate a harmonization flow based on your model. This conversion is smart, if you ask it to be.
- uCreateConversionModule: Create a module to convert source data to the ES model form. This conversion is smart, if you ask it to be.
- uLoadMappingSpec: Load an Excel mapping spec, which indicates how to map source data to the model. Used in the above tasks.

Details of the task interface, including task input, are given in the build file.

The [../examples](../examples) and [../tutorials](../tutorials) of this toolkit show this gradle build in action. There are several ways to use it:

- Movie it into your gradle project as a build script solely for UML2ES. Keep a separate build script for your main build work. The examples and tutorials take this approach.
- Copy its tasks into your existing gradle build file. 
- Copy it into your gradle project and use it as your main gradle build file. Add app-specific build tasks to it as needed.

The mega tutorial [../tutorials/runningRaceStartToFinish.md](../tutorials/runningRaceStartToFinish.md) demonstrates the gradle build as key ingredient in a soup-to-nuts modeling example for DHF. Please go through this tutorial to see how to:

- Setup a brand new source-controlled MarkLogic gradle build for UML in DHF.
- Construct a UML model and maintain it as part of the gradle build. 
- Construct a source mapping spec and maintain it as part of the gradle build.
- Generate and refine by hand harmonization code to keep MarkLogic-persisted data true to the model. 

The tutorial also shows who does what in the build process. A modeler owns the UML model; a source data expert owns the mapping spec; developers own the harmonization code; and an adminstrator owns the environment and the indexes called for by the model. 