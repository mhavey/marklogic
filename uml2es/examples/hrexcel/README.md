# Human Resources Data Model from Excel (No UML!!)

## Intro
This example demonstates loading an entity services model from an Excel data model template. No UML! We use the HR example from above (examples/hr). We pass our Excel spreadsheet (containing the HR model in tablular form) into the transformation. The transformation produces the same entity services model (including extensions and generated code) as produces from the UML model in examples/hr. 

## How to run:

Our project uses gradle. Before running, view the settings in gradle.properties. Create a file called gradle-local.properties and in this file override any of the properties from gradle.properties.

Here are the steps to setup.

### Setup DB
Setup new DB. Will use basic DB config with no indexes. Will bring in XMI2ES transform to our modules.

Run the following:

gradle -PenvironmentName=local -i includeXMI2ESTransform mlDeploy

Confirm:
- New DB and app server created with name xmi2es-examples-hrexcel.

### Transform HR Excel to ES

Run the following:

gradle -PenvironmentName=local -i loadExcel

Confirm:
- Content DB has the following documents
TODO
	* /xmi2es/es/RunningRace.json
	* /xmi2es/es/RunningRaceEMF.json
	* /xmi2es/es/RunningRacePapyrus.json
	* /xmi2es/extension/RunningRace.ttl
	* /xmi2es/extension/RunningRace.txt
	* /xmi2es/extension/RunningRaceEMF.ttl
	* /xmi2es/extension/RunningRaceEMF.txt
	* /xmi2es/extension/RunningRacePapyrus.ttl
	* /xmi2es/extension/RunningRacePapyrus.txt
	* /xmi2es/findings/RunningRace.xml
	* /xmi2es/findings/RunningRaceEMF.xml
	* /xmi2es/findings/RunningRacePapyrus.xml
	* /xmi2es/xmi/RunningRace.xml
	* /xmi2es/xmi/RunningRaceEMF.xml
	* /xmi2es/xmi/RunningRacePapyrus.xml

### Transform HR UML to ES
For comparison, we will load the HR UML model from examples/hr. 

Run the following:

gradle -PenvironmentName=local -i loadUML

Confirm:
- Content DB has the following documents
TODO
	* /xmi2es/es/RunningRace.json
	* /xmi2es/es/RunningRaceEMF.json
	* /xmi2es/es/RunningRacePapyrus.json
	* /xmi2es/extension/RunningRace.ttl
	* /xmi2es/extension/RunningRace.txt
	* /xmi2es/extension/RunningRaceEMF.ttl
	* /xmi2es/extension/RunningRaceEMF.txt
	* /xmi2es/extension/RunningRacePapyrus.ttl
	* /xmi2es/extension/RunningRacePapyrus.txt
	* /xmi2es/findings/RunningRace.xml
	* /xmi2es/findings/RunningRaceEMF.xml
	* /xmi2es/findings/RunningRacePapyrus.xml
	* /xmi2es/xmi/RunningRace.xml
	* /xmi2es/xmi/RunningRaceEMF.xml
	* /xmi2es/xmi/RunningRacePapyrus.xml

## Check Model Differences
In Query Console, import XMI2ESExcel.xml workspace. In the tab entitled Check Diff, run to confirm the Excel- and UML-based models are the same.

