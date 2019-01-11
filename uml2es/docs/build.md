# Using the UML-to-Entity Services Toolkit In Your Build

TODO ...

Gradle Tasks:

Common and Lib-Ready Tasks
- loadXMI, ingestModel, loadExtendedModel - There are reusable and should be tasks in a plugin.
- uml2esCreateEntities
- uml2esCreateHarmonization

- umlCreateEntities - Creates plugin-suitable entities corresponding to classes in your model. 
	* modelName - name of model file without suffix
	* entitySelect - infer, all 
	* entityNames - csv list of entity names
- umlCreateHarmonizeFlow - Create harmonization flow. 
	* model
	* entityName 
	* flowName
	* dataFormat - xml, json
	* pluginFormat - xqy, sjs
	* contentMode - es, dm
		* es - Builds content using ES maps, takes into account calculated attributes and hints
		* dm - Builds content as Declarative Mapper transformation.
	* mappingHints - A JSON structure that says how to generate
		* comment
		* select
		* variable
		* code
		* infer

Common but example-tinged Tasks:
- includeXMI2ESTransform - This is used by the examples, but for real purposes you don't use it...
- useIntial/GeneartedDBConfig, clearGenerated - these are examples

Project Structure For Source Control:

Non-DHF
- build.gradle
- gradle*.properties
- lib/log4j.properties
- src/main/ml-schemas - TODO strategy for generated TDE vs. edited TDE
- src/main/ml-config - TODO stategy for generated config vs. edited config
- src/main/ml-modules/options - TODO strategy for generated options vs. edited options
- src/main/ext/entity-services/*.xqy - TODO strategy for generated converter vs. edited converter
- src/main/ml-modules/root/xmi2es - The transform. You have a copy of it.
- src/main/ml-modules/... - Your stuff
- data/entity-services - This is where transform puts the ES model. Leave this empty
- data/entity-services-extension - This is where the transform put the ES extension. Leave this empty
- data/entity-services-dump - This is where the transform puts its stuff. Leave this empty
- data/model/uml/*.xml - Your UML model(s)
- data/model/excel/*.xlsx - Your Excel model(s)

DHF
TODO ... 


Roles - Who Does What ...



TODO - THIS PAGE IS UNDER CONSTRUCTION. ETA: EOQ FY18Q4

Non-DHF (example: movies...)
- copy transform into your gradle
- deploy the transform 
- use a loadXMI to load the XMI and transform it to ES
- bring it back like in movies example
- fine-tune indexes, config, TDE, etc...
- deploy model and XES
- generate code: and use that code

clearGenerated - remove any generated code
useInitialDBConfig - don't use generated config for content DB; just a file copy
includeXMI2ESTransform  - move transform over to gradle project
mlDeploy

ingestModel - load and transform UML to ES; bring it back to gradle project; this is composed of:
	- deleteESDump - file delete
	- loadXMI - load and transform the XMI
	- fetchDescriptors - export ES model back to gradle project
	- copy ES stuff to the proper ES folders for mlgen to run
mlgen 
* NEW * generateModelCode
loadExtendedModel - mlcp import of the previously exported TTL

useGeneratedDBConfig - just a file copy
deleteGeneratedTDE - just file deletes
mlDeployDatabases 
mlReloadModules 
mlReloadSchemas



DHF
- createEntitiesFromSplit modelURI
- createHarmonizeFlowFromModel









Confirm:
- Content DB now has element range indexes
- Schemas DB has ONLY ONE tdex document: /MovieModel-0.0.1.tdex

### Ingest
Ingest movie data based on the model

Run the following:

gradle -PenvironmentName=local -i ingestMovieData