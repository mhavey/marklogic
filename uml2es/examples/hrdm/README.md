# Human Resources Using Declarative Mapper (MarkLogic Internal)

## Intro

This is a MarkLogic-internal example that shows harmonization using Declarative Mapper rather than Entity Services.

In this example, we use the model from the [../hr](../hr) example:

![DHFEmployeeSample](../umlModels/DHFEmployeeSample.png)

Using UML2ES, we generate a DHF harmonization process that uses a Declarative Mapper template to map employee source data to the Employee class form in the UML model. 

## How to run:

### Obtain Declarative Mapper

DM is on MarkLogic's internal BitBucket. The repo is https://project.marklogic.com/repo/scm/int/declarative-mapper.git. Clone the json-sc branch. Then copy from your DM clone the directory declarative-mapper/src/main/ml-modules/root/ext to the HR examples' src/main/ml-modules/root/ext. Do it so that in HR example you have the file src/main/ml-modules/root/ext/declarative-mapper.sjs. 

cp -r $DMDIR/declarative-mapper/src/main/ml-modules/root/ext $HRDIR/src/main/ml-modules/root

### Setup and Initialize Hub

The next step kills two employees with one stone! Get into the hrdrm gradle project the UML2ES toolkit, the employee model, the HR GlobalCorp source data. Then standup the hrdm hub:

gradle -i -PenvironmentName=local setup mlDeploy

Confirm:

- You have new databases, including xmi2es-examples-hr-FINAL and xmi2es-examples-hr-STAGING.
- You have new app servers, including xmi2es-examples-hrdm-FINAL
- You have local file data/mapping/global-mapping.xlsx
- You have local file data/model/DHFEmployeeSample.xml (slightly modified to calculate URI as .json rather than .xml)
- You have the local directory data/hr
- You have local file uml2es4dhf.gradle
- Your xmi2es-examples-hr-MODULES database includes the following modules:
	* /ext/declarative-mapper.sjs (Declarative Mapper)
	* /xmi2es/cookieCutter.sjs (a UML2ES module)

### Load and Transform the HR UML Model

Next, move our UML model into ML as an ES model. Run the following:

gradle -b uml2es4dhf.gradle -PenvironmentName=local -i -PmodelName=DHFEmployeeSample uDeployModel 

Confirm:
- Final DB (xmi2es-examples-hrdm-FINAL) includes the following documents
  * /marklogic.com/entity-services/models/DHFEmployeeSample.json (The deployed ES model)
  * /xmi2es/findings/DHFEmployeeSample.xml (Problems found during transformation. Check it. Confirm no issues.)

### Create DHF Entities From the HR Model
Now we create our DHF entity plugins. We leverage's the toolkit's ability to cut/generate code. First, ask the toolkit to create the basic plugins (without any flows). It will infer which classes in the model should be plugins. 

gradle -b uml2es4dhf.gradle -PenvironmentName=local -i uCreateDHFEntities -PmodelName=DHFEmployeeSample -PentitySelect=infer 

Confirm:
- In gradle project there are new folders 
  * plugins/entities/Department
  * plugins/entities/Employee

### Create Input Flow For Source Data

For your newly created Employee entity you need an input flow for ingestion of source data. Run the following standard DHF gradle commands to create these flows.

gradle -PenvironmentName=local -i hubCreateInputFlow -PentityName=Employee -PflowName=LoadEmployee -PdataFormat=json -PpluginFormat=sjs -PuseES=false

gradle -PenvironmentName=local -i mlReloadModules

Confirm:
- In your local gradle project you have newly generated code under plugins/entities/Employee/input a
- These new modules are visible in the modules database (xmi2es-examples-hrdm-MODULES)

### Ingest

Ingest staging data and some triples for FINAL  

Run the following:

gradle -PenvironmentName=local -i runInputMLCP

Confirm:
- In STAGING (xmi2es-examples-hrdm-STAGING) we now have 2008 or more documents. 

### Load Mapping Spec

We have an Excel mapping spec document in data/mapping folder. Load it into MarkLogic as follows:

gradle -b uml2es4dhf.gradle -Pdiscover=true -PspecName=global-mapping uLoadMappingSpec

Confirm:
- Final DB (xmi2es-examples-hrdm-FINAL) includes the following documents
  * /xmi2es/excel-mapper/global-mapping.xlsx  (The Global mapping spreadsheet that we composed and loaded into ML)
  * /xmi2es/excel-mapper/global-mapping.json (The Global mapping in JSON form)
  * /xmi2es/excel-mapper/findings/global-mapping.xml  (Problems during the Global load. Confirm there are none.)
  * /xmi2es/discovery/global-mapping.json (Discovery!!! While loading, the toolkit searches the staging database to intelligently map source data to the model. So, even if the author of the mapping spec isn't sure how to map a specific 

### Create Harmonization Flows
We now have UML2ES create a DM-based mapping:

gradle -b uml2es4dhf.gradle -PenvironmentName=local -i uCreateDHFHarmonizeFlow -PmodelName=DHFEmployeeSample -PflowName=harmonizeGlobalDM -PentityName=Employee -PpluginFormat=sjs -PdataFormat=json -PcontentMode=dm -PmappingSpec=/xmi2es/excel-mapper/global-mapping.json

Confirm:
- Local copy of harmonization is in gradle folder at data/cookieCutter-dump/cookieCutter
- Local copy of DM template is in gradle folder at data/cookieCutter-dump/dm/mapper
- Local plugins/Employee/harmonization/harmonizeGlobalDM has the harmonization.

### Tweak the Harmonization Flow

We now tweak the content modules of the generation harmonization. We cooked those beforehand. They are in data/tweaks. We have three tweaks:

- Changed collector.sjs for the harmonization flow. Change: constrain harmonization job to a specific URI directory from staging. See under data/tweaks/plugins/entities.
- Changed content.sjs for the harmonization flow. Change: Change DM input to be the combination of employee and salary records. See under data/tweaks/plugins/entities.
- Changed the DM template. See under data/tweaks/dm.

To promote your DM tweaks, run the following:

gradle -b uml2es4dhf.gradle -PenvironmentName=local -i -PdmPath=data/tweaks uLoadDMTemplate

To promote you harmonization tweak, run the following:

gradle -PenvironmentName=local -i tweakHarmonization mlReloadModules

Confirm:
- The code in plugins/entities/Employee/harmonization has the tweaks.
- Your DM changes are in the xmi2es-examples-hrdm-FINAL database at URI	/dm/mapper/DHFEmployeeSample/Employee/harmonizeGlobalDM.json. 

### Harmonize
Run harmonization to move employee and department data to FINAL.

Run the following:

gradle -PenvironmentName=local -i hubRunFlow -PentityName=Employee -PflowName=harmonizeGlobalDM

Confirm:
FINAL now contains:  
  - 1000 documents in Employee collection



