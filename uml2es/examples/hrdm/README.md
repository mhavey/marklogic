# Human Resources Using Declarative Mapper (MarkLogic Internal)

## Intro

This is a MarkLogic-internal example that shows harmonization using Declarative Mapper rather than Entity Services.

In this example, we use the model from the [Employee Cradle To Grave tutorial](../tutorials/employeeCradleToGrave.md). Here is the main model, showing Employee and Department classes.

![DHFEmployeeSample](../tutorials/images/emp_setup37.png)

Here are the definitions for the common classes: Address, Phone, Email:

![DHFEmployeeSample](../tutorials/images/emp_setup20.png)

Using UML2ES, we generate a DHF harmonization process that uses a Declarative Mapper template to map employee source data to the Employee class form in the UML model. 

This example is also very similar to [../hr](../hr). Review that example with focus on its ES-based harmonization. Compare the ES- and DM-harmonization approaches.

## How to run:

First, run through all the steps of the HR example described in [README.md](README.md). 

### Obtain Declarative Mapper

DM is on MarkLogic's internal BitBucket. The repo is https://project.marklogic.com/repo/scm/int/declarative-mapper.git. Clone the json-sc branch.

### Copy DM To Hub

Copy from your DM clone the directory declarative-mapper/src/main/ml-modules/root/ext to the HR examples' src/main/ml-modules/root/ext. Do it so that in HR example you have the file src/main/ml-modules/root/ext/declarative-mapper.sjs. 

cp -r $DMDIR/declarative-mapper/src/main/ml-modules/root/ext $HRDIR/src/main/ml-modules/root

Now deploy it:

gradle -i -PenvironmentName=local mlReloadModules

### Create DM-Base Global Employee Harmonization

gradle -b uml2es4dhf.gradle -PenvironmentName=local -i uCreateDHFHarmonizeFlow -PmodelName=DHFEmployeeSample -PflowName=harmonizeGlobalDM -PentityName=Employee -PpluginFormat=sjs -PdataFormat=json -PcontentMode=dm -PmappingSpec=/xmi2es/excel-mapper/global-mapping.json

Confirm:
- Local copy of harmonization is in gradle folder at data/cookieCutter-dump/cookieCutter
- Local copy of DM template is in gradle folder at data/cookieCutter-dump/dm/mapper

### Tweak the Harmonization and DM Template

You need to tweak two files:

First, in harmonization tweak collector.sjs to pick up the right data from staging. THe generated file is data/cookieCutter-dump/cookieCutter/DHFEmployeeSample/plugins/entities/Employee/harmonize/harmonizeGlobalDM/collector.sjs. The pre-cooked tweak is in data/tweaks/Employee/harmonize/harmonizeESGlobal/collector.sjs. Compare them to see what the tweak consists of. (Note: this is the SAME collector module you used in the ES harmonization previously in the HR example.) 

To deploy this change: gradle -i -PenvironmentName=local tweakDMHarmonization mlReloadModules

Second, adjust the source mappings of the DM template. The generated template is data/cookieCutter-dump/dm/mapper/DHFEmployeeSample/Employee/harmonizeGlobalDM.json. The pre-cooked tweak is data/tweaks_dm/harmonizeGlobalDM.json

To deploy this change: gradle -b uml2es4dhf.gradle -PenvironmentName=local uLoadDMTemplate -PmodelName=DHFEmployeeSample -PflowName=harmonizeGlobalDM -PentityName=Employee (((TODO - still have to write this... Is it consistent with other loads? Shouldn't it be in data/template or something like that???)))

### Run harmonization:

gradle -PenvironmentName=local -i hubRunFlow -PentityName=Employee -PflowName=harmonizeDMGlobal

Confirm:
- TODO 
