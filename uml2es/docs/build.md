# Using the UML-to-Entity Services Toolkit In Your Build

Non-DHF (just like movies!)
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