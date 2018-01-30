# Human Resources Example

## Intro

This example shows the following:
- How to model in UML human resources (employee, department) entities. 
- How to map the UML model to a MarkLogic Entity Services model.
- How to setup a MarkLogic Data Hub to house the human resources data. 
- How to ingest source data into the Data Hub staging database. 
- How to harmonize this source data into the Data Hub final database. Data in the final database conforms to the UML model. 
- How to link departments and employees using semantics.

For more on MarkLogic's Data Hub Framework (aka DHF), visit its GitHub page: <https://github.com/marklogic-community/marklogic-data-hub>.

Our source data comes from one of the DHF examples. <https://github.com/marklogic-community/marklogic-data-hub/tree/master/examples/hr-hub>

We use the following ontology: <https://www.w3.org/TR/vocab-org/>

## How We Use Data Hub

A few points about our use of DHF.

First, here is the purpose of the four main databases in DHF:
- Staging: This holds source data:
 - Employee data from ACME Tech
 - Employee data from Global Corp
 - Employee salary data from Global Corp
 - Department data from Global Corp
- Final
 - Harmonized employee documents that conform to the model
 - Harmonized department documents that conform to the model
 - Semantic triples representing: employee reporting structure; employee department membership; acquisition relationship between Global and ACME.
- Modules: This holds server-side modules:
 - The XMI2ES transform
 - The DHF harmonization plugins for employee and department
 - The ES-generated instance converter module
 - DHF internal modules
- Schemas: This holds TDE template. But in this example we won't show TDE. 

Now, about where the model fits:
- It is the data in FINAL db that conforms to the model.
- Staging DB does not conform to the model.
- We use the ES instance converter during HARMONIZATION to final. 

Finally, semantics: We keep relationships "soft". Don't link documents to each other via key. Rather, use the following semantic triples:

- An employee reportsTo another employee
- An employee is a memberOf a department
- Global's acquisition of ACME uses an organizational change event.

## The Cooking Show Approach

Like a cooking show, this example describes how to prepare the souffle but also gives a souffle already prepred for you to consume. 

The "prepared" souffle includes:
- The UML model.
- MLCP gradle tasks to ingest the data to STAGING
- Harmonization plugins to harmonize the data to FINAL.
- ES instance converter already modified to fit harmonization needs.

If you were to start from scratch, you would follow this recipe:
- Devise the UML model in your favorite UML editor.
- Use the XMI to ES transformation to map the UML model to Entity Services. 
- From the Entity Services model, generate the instance converter.
- Tweak the instance converter: map source fields to model fields.
- Using Hub's gradle tasks, setup input and harmonization flows:

gradle hubCreateEntity -PentityName=Department

gradle hubCreateEntity -PentityName=Employee

gradle hubCreateInputFlow -PentityName=Department -PflowName=LoadDepartment 

gradle hubCreateInputFlow -PentityName=Employee -PflowName=LoadEmployee

gradle hubCreateHarmonizeFlow -PentityName=Department -PflowName=HarmonizeDepartment -PdataFormat=xml -PpluginFormat=xqy

gradle hubCreateHarmonizeFlow -PentityName=Employee -PflowName=HarmonizeEmployee -PdataFormat=xml -PpluginFormat=xqy

- In your gradle build file, add MLCP tasks to ingest department and employee data. 


## How to run:

Our project uses gradle. Before running, view the settings in gradle.properties. Create a file called gradle-local.properties and in this file override any of the properties from gradle.properties.

Here are the steps to setup.

1. Setup new DB. We will begin with basic DB config with no indexes. Will bring in the XMI2ES transform to our modules DB.

gradle -PenvironmentName=local -i clearGenerated includeXMI2ESTransform mlDeploy

Confirm:
- Modules DB has /xmi2es/loadXMITransformation.xqy
- No documents having URI containing GENERATED in modules, FINAL, STAGING, or schemas DB.

2. Move our UML model into ML as an ES model. Then generate ES artifacts. The strange task workaroundDeployESModelToFinal works around the issue where ES model is deployed to STAGING instead of FINAL.

gradle -PenvironmentName=local -i ingestModel mlgen  workaroundDeployESModelToFinal

Confirm:
- Content DB has the following documents
../marklogic.com/entity-services/models/DHFEmployeeSample.xml
../xmi2es/es/DHFEmployeeSample.xml
../xmi2es/findings/DHFEmployeeSample.xml
../xmi2es/xmi/DHFEmployeeSample.xml

- In Query Console, open a tab of type SPARQL, point to the FINAL DB, run the following query, and verify you get any results. THis means the ES model is in FINAL and its semantic metadata is populated.

select * where {?s ?o ?p}

- In gradle project, check for these newly generated files:
..src/main/ml-modules/ext/entity-services/HR-0.0.1.xqy
..src/main/ml-modules/options/HR.xml
..user-config/databases/content-database.json
..user-config/schemas/HR-0.0.1.xsd
..user-config/schemas/tde/HR-0.0.1.tdex

We won't use any of these artifacts in this demo. The code already contains a tweaked version of HR-0.0.1.xqy in /plugins/ext/entity-services. Because we won't use these artifacts, we don't need to reload our schemas or modules.

3. Ingest staging data and some triples for FINAL	

gradle -PenvironmentName=local -i loadSummaryOrgTriples runInputMLCP

- In STAGING we now have 2008 documents. Of these:
..1002 are in Employees collection
..1000 are in Salary collection
..5 are in Department collection

- In FINAL we have the a document containing triples in the collection http://www.w3.org/ns/org.

4. Run harmonization to move employee and department data to FINAL.

gradle -PenvironmentName=local -i hubRunFlow -PentityName=Department -PflowName=HarmonizeDepartment
gradle -PenvironmentName=local -i hubRunFlow -PentityName=Employee -PflowName=HarmonizeEmployee

Confirm:
- FINAL now contains 1013 documents including
..5 in Department collection
..1002 in Employee collection

## Viewing the Data
In Query Console, import the workspace XMI2ESHR.xml. In each tab, try the query to explore an aspect of the data.

## Coming Soon
Stay tuned for a blog post that describes this example in greater depth.
