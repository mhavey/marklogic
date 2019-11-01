# Patient Hub: UML2ES in DHF 5

## Intro
This example piggybacks on an example included in Data Hub's GitHub repo: the Patient Hub. You can find that example here: <https://github.com/marklogic/marklogic-data-hub/tree/master/examples/patient-hub>. We enhance that example by modeling its entities -- Patient, Admission, Lab, Diagonis -- in UML. We then use UML2ES to convert the UML model to Entity Services. We need to end up with a set of entity definitions that closely resemble the ones provided in the example (in <https://github.com/marklogic/marklogic-data-hub/tree/master/examples/patient-hub/entities>). Once the entities are in place, the steps to run are just those of the example. 

For convenience, a copy of that example is provided here.

## Models
We use Papyrus to compose the UML model. The Eclipse project is in data/PatientHubUML. If you would like to view/edit it in Papyrus, import both this project and the profile Eclipse project at [../umlProfile/eclipse/MLProfileProject](../../umlProfile/eclipse/MLProfileProject). Here is what the model looks like:

![PatientHubPapyrus](../umlModels/PatientHubUML.png)

## How to run:

Our project uses gradle. Before running, view the settings in gradle.properties. Create a file called gradle-local.properties and in this file override any of the properties from gradle.properties.

Here are the steps to setup.

### Setup DB
Setup new hub. Will use basic DB config with no indexes. Will bring in XMI2ES transform to our modules.

Run the following:

./gradlew -PenvironmentName=local -i hubInit setup mlDeploy

Confirm:
- New DB and app server created with name xmi2es-examples-runningRace.

### Transform UML to ES

Now we convert UML to Entity Services:

gradle -i -b uml2es4dhf5.gradle -PmodelName=PatientHubUML uDeployModel


Confirm:
- Content DB includes several documents created when loading the XMI files, including:
	* /marklogic.com/entity-services/models/RunningRace.json - ES model based on MagicDraw UML model
	* /marklogic.com/entity-services/models/RunningRaceEMF.json - ES model based on EMF UML model
	* /marklogic.com/entity-services/models/RunningRacePapyrus.json - ES model based on Papyrus UML model
	* /xmi2es/findings/RunningRace.xml - findings during the transform from MagicDraw to ES
	* /xmi2es/findings/RunningRaceEMF.xml - findings during the transform from EMF to ES
	* /xmi2es/findings/RunningRacePapyrus.xml - findings during the transform from Papyrus to ES

Check each of the findings documents: /xmi2es/findings/RunningRace.xml, /xmi2es/findings/RunningRaceEMF.xml, /xmi2es/findings/RunningRacePapyrus.xml. Verify there are no issues reported in any of them.

## Create Hub Entities

gradle -b uml2es4dhf.gradle -i uCreateDHFEntities -PmodelName=PatientHubUML -PentitySelect=all




