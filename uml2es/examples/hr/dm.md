# Human Resources Using Declarative Mapper (MarkLogic Internal)

## Intro

This is a MarkLogic-internal demo that shows the HR example using Declarative Mapper rather than Entity Services to harmonize data that conforms to the HR UML model. 

## How to run:

First, run through all the steps of the HR example described in [README.md](README.md). 

### Obtain Declarative Mapper

DM is on MarkLogic's internal BitBucket. The repo is https://project.marklogic.com/repo/scm/int/declarative-mapper.git. Clone the json-sc branch.

### Copy Into Hub

Copy from your DM clone the directory declarative-mapper/src/main/ml-modules/root/ext to the HR examples' src/main/ml-modules/root/ext. Do it so that in HR example you have the file src/main/ml-modules/root/ext/declarative-mapper.sjs. 

cp -r $DMDIR/declarative-mapper/src/main/ml-modules/root/ext $HRDIR/src/main/ml-modules/root

DM is on MarkLogic's internal BitBucket. The repo is https://project.marklogic.com/repo/scm/int/declarative-mapper.git. Clone the json-sc branch.

Deploy this code 

gradle -i -PenvironmentName=local mlReloadModules

### Create DM-Base Global Employee Harmonization

gradle -b uml2es4dhf.gradle -PenvironmentName=local -i uCreateDHFHarmonizeFlow -PmodelName=DHFEmployeeSample -PflowName=harmonizeGlobalDM -PentityName=Employee -PpluginFormat=sjs -PdataFormat=json -PcontentMode=dm -PmappingSpec=/xmi2es/excel-mapper/global-mapping.json

