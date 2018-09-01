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
	* /xmi2es/es/HRExcel.json - Entity Services Model
	* /xmi2es/excel/findings/HRExcel.xml - Excel conversion findings. Should be no problems.
	* /xmi2es/excel/HRExcel.xlsx - Original Excel file
	* /xmi2es/extension/HRExcel.ttl - Extended model as semantic triples (Turtle format)
	* /xmi2es/extension/HRExcel.txt - Extended model described textually
	* /xmi2es/findings/HRExcel.xml - Findings while converting to Entity Services. Should be no problems.
	* /xmi2es/gen/HRExcel.txt - Generated code for DHF
	* /xmi2es/intermediate/HRExcel.xml - XMI/ES intermediate form
	* /xmi2es/xmi/HRExcel.xml - Excel model converted to XMI form.

### Transform HR UML to ES
For comparison, we will load the HR UML model from examples/hr. 

Run the following:

gradle -PenvironmentName=local -i loadUML

Confirm:
- Content DB now has, in addition to the document created in the previous step, the following documents
	* /xmi2es/es/DHFEmployeeSample.json	 - Entity Services Model
	* /xmi2es/extension/DHFEmployeeSample.ttl - Extended model as semantic triples (Turtle format)
	* /xmi2es/extension/DHFEmployeeSample.txt - Extended model described textually
	* /xmi2es/findings/DHFEmployeeSample.xml - Findings while converting to Entity Services. Should be no problems.
	* /xmi2es/gen/DHFEmployeeSample.txt - Generated code for DHF
	* /xmi2es/intermediate/DHFEmployeeSample.xml - XMI/ES intermediate form
	* /xmi2es/xmi/DHFEmployeeSample.xml - XMI form of UML model

## Check Model Differences
In Query Console, import XMI2ESExcel.xml workspace. In the tab entitled Check Diff, run to confirm the Excel- and UML-based models are the same.

