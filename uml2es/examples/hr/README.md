# Human Resources Example

## Intro

This example shows the following:
- How to model in UML human resources (employee, department) entities. 
- How to map the UML model to a MarkLogic Entity Services model.
- How to setup a MarkLogic Data Hub to house the human resources data. 
- How to ingest source data into the Data Hub staging database. 
- How to harmonize this source data into the Data Hub final database. Data in the final database conforms to the UML model. 
- How to link departments and employees using semantics. The model specifies the semantic relationships. The code to create triples is GENERATED when we transform the UML model to Entity Services!!

For more on MarkLogic's Data Hub Framework (aka DHF), visit its GitHub page: <https://github.com/marklogic-community/marklogic-data-hub>.

Our source data comes from one of the DHF examples. <https://github.com/marklogic-community/marklogic-data-hub/tree/master/examples/hr-hub>

We use the following ontology: <https://www.w3.org/TR/vocab-org/>

## Model
Here is the our UML model:

![DHFEmployeeSample](../umlModels/DHFEmployeeSample.png)

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

In the UML model, we use stereotypes to describe the semantic relationships. The transform model, which converts our UML model to Entity Services, generates XQuery code to create triples based on these semantic relationships. In building our harmonization logic, we use this generated code.

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

### Setup New DB
We will begin with basic DB config with no indexes. Will bring in the XMI2ES transform to our modules DB.

Run the following:

gradle -PenvironmentName=local -i clearGenerated includeXMI2ESTransform mlDeploy

Confirm:
- Modules DB has these modules
  * /xmi2es/extender.xqy
  * /xmi2es/problemTracker.xqy
  * /xmi2es/xmi2esTransform.xqy
- Staging, Final, Schemas databases are empty
- No documents having URI containing GENERATED in modules, FINAL, STAGING, or schemas DB.

### Transform UML to ES

Next, move our UML model into ML as an ES model. Let's divide this into two parts.

#### Load UML Model and Observe Output of Transform

We will load our UML model and transform it to Entity Services format. Run the following:

gradle -PenvironmentName=local -i ingestModel

Confirm:
- Final DB has the following documents
  * /xmi2es/es/DHFEmployeeSample.json (The ES model descriptor in JSON form)
  * /xmi2es/extension/DHFEmployeeSample.ttl (Semantic triples that extend our model)
  * /xmi2es/extension/DHFEmployeeSample.txt (A text summary of our model extension)
  * /xmi2es/findings/DHFEmployeeSample.xml (Problems found during transformation)
  * /xmi2es/semgen/DHFEmployeeSample.txt (Generated XQuery code to add triples expressing semantic relationships between employees and departments)
  * /xmi2es/xmi/DHFEmployeeSample.xml (The original UML model as an XMI document)
- Your gradle directory structure under data/entity-services-dump has the same documents as above.
- File DHFEmployeeSample.json exists in gradle's data/entity-services directory. This is our ES model descriptor to be deployed.
- File DHFEmployeeSample.ttl exists in gradle's data/entity-services-extension directory. This is our ES model extension to be deployed.

A few things to notice:
- We made use of the generated code in the /xmi2es/semgen/DHFEmployeeSample.txt module! Specifically, we pasted it into the harmonization triples modules plugins/entities/Department/harmoize/HarmonizeDepartment/triples.xqy and plugins/entities/Employee/harmoize/HarmonizeEmployee/triples.xqy. No need to write that code from scratch. The model gave enough semantic information to generate the code.
- We made use of the extended model definition. Specifically, we pasted the contents of /xmi2es/extension/DHFEmployeeSample.txt as a block comment into our conversion module plugins/ext/entity-services/HR-0.0.1.xqy. We refer back to that comment in several points in the code, showing that our implementation references facts from the extended model.

#### Deploy Entity Services Model and Associated Artifacts

Next, generate ES artifacts. The strange task workaroundDeployESModelToFinal works around the issue where ES model is deployed to STAGING instead of FINAL.

Run the following:

gradle -PenvironmentName=local -i mlgen loadExtendedModel workaroundDeployESModelToFinal

Confirm:
- Final DB now has the following document
  * /marklogic.com/entity-services/models/DHFEmployeeSample.json

- In Query Console, open a tab of type SPARQL, point to the FINAL DB, run the following query, and verify you get any results. This means the ES model is in FINAL and its semantic metadata is populated.

select * where {?s ?o ?p} --- TODO and check that our extensions are there also 

Among the results, you should see the following:
- <http://com.marklogic.es.uml.hr/HR-0.0.1/Department/departmentId> <http://marklogic.com/entity-services#datatype> <http://www.w3.org/2001/XMLSchema#int> - From basic ES model
- <http://com.marklogic.es.uml.hr/HR-0.0.1/Department>  <http://marklogic.com/xmi2es/xes/semIRI>  "deptIRI" - From the extended ES model

- In gradle project, check for these newly generated files:
  * src/main/ml-modules/ext/entity-services/HR-0.0.1.xqy
  * src/main/ml-modules/options/HR.xml
  * user-config/databases/content-database.json
  * user-config/schemas/HR-0.0.1.xsd
  * user-config/schemas/tde/HR-0.0.1.tdex

  We won't use any of these artifacts in this demo. The code already contains a tweaked version of HR-0.0.1.xqy in /plugins/ext/entity-services. Because we won't use these artifacts, we don't need to reload our schemas or modules.

### Ingest
Ingest staging data and some triples for FINAL	

Run the following:

gradle -PenvironmentName=local -i loadSummaryOrgTriples runInputMLCP

Confirm:
- In STAGING we now have 2008 documents. Of these:
  * 1002 are in Employees collection
  * 1000 are in Salary collection
  * 5 are in Department collection

- In FINAL we have the a document containing triples in the collection http://www.w3.org/ns/org.

### Harmonize
Run harmonization to move employee and department data to FINAL.

Run the following:

gradle -PenvironmentName=local -i hubRunFlow -PentityName=Department -PflowName=HarmonizeDepartment

gradle -PenvironmentName=local -i hubRunFlow -PentityName=Employee -PflowName=HarmonizeEmployee

Confirm:
FINAL now contains 1013 documents including
  - 5 in Department collection
  - 1002 in Employee collection

## Explore the Data
In Query Console, import the workspace XMI2ESHR.xml. In each tab, try the query to explore an aspect of the data.
