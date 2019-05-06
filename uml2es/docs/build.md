# Using the UML-to-Entity Services Toolkit In Your Build

The toolkit supports a gradle build process. Gradle is the most widely used build tool for MarkLogic implementations. 
The toolkit includes common gradle tasks to deploy your UML model and generate harmonization/conversion code from it. You use these tasks, as well as common [ml-gradle](https://github.com/marklogic-community/ml-gradle/wiki) and [data hub](https://marklogic.github.io/marklogic-data-hub/refs/gradle-tasks/) tasks, to deploy your application.

The toolkit provides a gradle build file containing all model deployment and code generation tasks: [../uml2esTransform/uml2es.gradle](../uml2esTransform/uml2es.gradle). Actually, it also includes a similar build file for use for DHF: [../uml2esTransform/uml2es4dhf.gradle](../uml2esTransform/uml2es4dhf.gradle).  Here is a summary of the tasks from that build file:

## Build Tasks

### uDeployModel

*Purpose*: Load your UML model into MarkLogic and convert it to ES.

*DHF/Vanilla*: Both

*Input:* 
- modelName (XMI or Excel filename without suffix)
- lax: true/false. Default: false (Use lax mode when transforming from UML to ES.)

*Dependencies:*
- Your gradle project has the folder data/model
- Your model is in that folder
- Your model is XMI
- Your model ends in .xml
- Standard ml-gradle environment properties: mlAppServicesHost, mlAppServicesPort. OR ...
- Standard DHF environment properties: mlHost, mlFinalPort

*Effects:*
- Target database has the UML model, the ES model, the ES extensions, findings, generated code
- Target database has the ES model and its extended triples deployed
- Your gradle project has entity-services, entity-services-dump, entity-services-extension folders
- You will see generated code in src/main/ml-config, src/main/ml-modules, src/main/ml-schemas

### uCreateDHFEntities

*Purpose*: Create DHF plugin entities based on classes in your model.

*DHF/Vanilla*: DHF

*Input:* 
- modelName - name of UML module file without .xml suffix
- entities (optional) - CSV of class names representing entities to create
- entitySelect (optional) - Possible values:
	* "infer" - Have the cookie cutter infer which classes are entities. Ignore entities specified. (This works well for tree-based models where the candidate classes are parents but not children, such as [../examples/hr](../examples/hr). It does not always work. For example, in the graph-like model [../examples/movies](../examples/movies), the Movie class cannot be inferred to be *entity worthy*.
	* "all" - All classes are considered entities. Ignore entities specified.

*Dependencies:* 
- Your gradle project is DHF 4.1
- You have deployed your UML model
- Standard DHF environment properties: mlHost, mlFinalPort

*Effects:*
- New plugins created under plugins/entities folder

### uCreateDHFHarmonizeFlow

*Purpose:*: Generate a harmonization flow based on your model. This conversion is smart, if you ask it to be.

*DHF/Vanilla*: DHF

*Input:* 
- modelName - name of UML module file without .xml suffix
- entityName - name of the entity. You must already have created this using uCreateDHFEntities
- dataFormat: xml, json
- pluginFormat: xqy, sjs
- flowName: the harmonization flow name
- contentMode: possible values
	* es - Entity Services mode. The cookie cutter generates ES-conversion style code and 
          incorporates hints from the data model and the mapping spec. This is like a souped up -useES option.
    * dm - Declarative Mapper mode. *This feature is not ready yet.*
- mappingSpec: previously uploaded Excel mapping spec; refer to it by the Excel URI
- overwrite: true/false. If true and harmonization already exists, overwrite it. If you don't want to clobber, set to false.

*Dependencies:*
- Your gradle project is DHF 4.1
- You have deployed your UML model
- You have created the entity in question using uCreateDHFEntities
- Standard DHF environment properties: mlHost, mlFinalPort

*Effects:*
- New harmonization flow plugins/entities/entityName/harmonize folder

### uLoadMappingSpec

*Purpose:*: Load an Excel mapping spec, which indicates how to map source data to the model. Used in the above tasks.

*Input:* 
- specName = mandatory (Excel filename without suffix)
- discover = true/false; default false. *This is an experimental feature.*
- discoveryDB = default: content DB (non-DHF), staging DB (DHF0). *This is an experimental feature.*

*Dependencies:*
- Your gradle project has the folder data/mapping
- Your mapping spec is in that folder
- Standard ml-gradle environment properties: mlAppServicesHost, mlAppServicesPort. OR ...
- Standard DHF environment properties: mlHost, mlFinalPort

*Effects:*
- Target database has the mapping spec (original Excel plus transformed json)

### uCreateConversionModule

*Purpose:* Creates a harmonize flow for the specified entity. A souped up es.instanceConverterGenerate.

*Input:* 
- modelName - name of UML module file without .xml suffix
- entityName - name of the entity. 
- dataFormat: xml, json
- pluginFormat: xqy, sjs
- moduleName the module name
- contentMode: possible values
	* es - Entity Services mode. The cookie cutter generates ES-conversion style code and 
          incorporates hints from the data model and the mapping spec. This is like a souped up -useES option.
     * dm - Declarative Mapper mode. This feature is not ready yet.
- mappingSpec: previously uploaded Excel mapping spec; refer to it by the Excel URI
- overwrite: true/false. If true and the module already exists, overwrite it. If you don't want to clobber, set to false.

*Dependencies:*
- You have deployed your UML model
- Standard ml-gradle environment properties: mlAppServicesHost, mlAppServicesPort. OR ...
- Standard DHF environment properties: mlHost, mlFinalPort. BUT WE RECOMMEND USING uCreateDHFHarmonizeFlow IF YOU ARE ON DHF.

*Effects:*
- New conversion module in src/main/ml-modules/root/modelName/entityName folder

## Model/Conversion/Harmonization Workflow

How do you string these tasks together to build useful code from a model? Here are a few scenario workflows:

1. DHF environment with harmonization created by out-of-the-box DHF code generator. Example: [../tutorials/employeeCradleToGrave.md](../tutorials/employeeCradleToGrave.md).

	- Make a copy of [../uml2esTransform/uml2es4dhf.gradle](../uml2esTransform/uml2es4dhf.gradle) into your local gradle project. 
	- Run task uDeployModel. 
	- Generate entities using uCreateDHFEntities.
	- Generate harmonizations using the out-of-the-box DHF createHarmonizeFlow task. These are created in the plugins/entities folder.

2. DHF environment with harmonization created by UML2ES with mapping spec details and hints from the extended model. Example: [../examples/hr](../examples/hr). 

	- Make a copy of [../uml2esTransform/uml2es4dhf.gradle](../uml2esTransform/uml2es4dhf.gradle) into your local gradle project. 
	- Run task uDeployModel. 
	- Deploy the mapping spec: uLoadMappingSpec
	- Generate entities using uCreateDHFEntities
	- Generate harmonizations using uCreateDHFHarmonizationFlow. The harmonization is created in plugins/entities.

3. Vanilla environment with out-of-the-box ES code generation from the model, as in the [../examples/movies](../examples/movies) example:

	- Make a copy of [../uml2esTransform/uml2es.gradle](../uml2esTransform/uml2es.gradle) into your local gradle project. At the bottom of that file, set one of more generate flags to true. For example, to use ES to generate an instance converter and TDE template, set the following to true:
		- generateInstanceConverter=true
		- generateExtractionTemplate=true
	- Run task uDeployModel. As a result of this, the generated instance converter is in src/main/ml-modules/ext. The generated TDE template is in src/main/ml-schemas.

4. Vanilla environment with generation of UML2ES conversion module with mapping spec details and hints from the extended model. Example: [../examples/gentest/vanilla](../examples/gentest/vanilla)

	- Make a copy of [../uml2esTransform/uml2es.gradle](../uml2esTransform/uml2es.gradle) into your local gradle project. 
	- Run task uDeployModel. 
	- Load the mapping spec using uLoadMappingSpec.
	- Generate the conversion module using uCreateConversionModule with contentMode=es. As a result of this, the generated conversion module is in src/main/ml-modules/root/esconversion. 

## Build Tips

The [../examples](../examples) and [../tutorials](../tutorials) of this toolkit show this gradle build in action. There are several ways to use it:

- Move it into your gradle project as a build script solely for UML2ES. Keep a separate build script for your main build work. The examples and tutorials take this approach. When using it this way, edit plugin versions if needed. 
- Copy its tasks into your existing gradle build file. 
- Copy it into your gradle project and use it as your main gradle build file. Add app-specific build tasks to it as needed.

The mega tutorial [../tutorials/employeeCradleToGrave.md](../tutorials/employeeCradleToGrave.md) demonstrates the gradle build as key ingredient in a soup-to-nuts modeling example for DHF. Please go through this tutorial to see how to:

- Setup a brand new source-controlled MarkLogic gradle build for UML in DHF.
- Construct a UML model and maintain it as part of the gradle build. 
- Construct a source mapping spec and maintain it as part of the gradle build.
- Generate and refine by hand harmonization code to keep MarkLogic-persisted data true to the model. 

The tutorial also shows who does what in the build process. A modeler owns the UML model; a source data expert owns the mapping spec; developers own the harmonization code; and an adminstrator owns the environment and the indexes called for by the model. 
