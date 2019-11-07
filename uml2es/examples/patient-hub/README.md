# Patient Hub: UML2ES in DHF 5

## Intro
This example piggybacks on an example included in Data Hub's GitHub repo: the Patient Hub. You can find that example here: <https://github.com/marklogic/marklogic-data-hub/tree/master/examples/patient-hub>. We enhance that example by modeling its entities -- Patient, Admission, Lab, Diagonis -- in UML. We then use UML2ES to convert the UML model to Entity Services. We need to end up with a set of entity definitions that closely resemble the ones provided in the example (in <https://github.com/marklogic/marklogic-data-hub/tree/master/examples/patient-hub/entities>). Once the entities are in place, the steps to run are just those of the example. 

For convenience, a copy of that example is provided here.

## Models
We use Papyrus to compose the UML model. The Eclipse project is in data/PatientHubUML. If you would like to view/edit it in Papyrus, import both this project and the profile Eclipse project at [../umlProfile/eclipse/MLProfileProject](../../umlProfile/eclipse/MLProfileProject). Here is what the model looks like:

![PatientHubPapyrus](../umlModels/PatientHubUML.png)

## How to run:

Our project uses gradle. Before running, view the settings in gradle.properties. If you need to modify them, create a file called gradle-local.properties and in this file override any of the properties from gradle.properties. When calling gradle, use the -PenvironmentName=local option to use your local properties.

Here are the steps to setup.

### Setup DB
Setup a new hub that includes UML2ES: 

Run the following:

./gradlew -i hubInit 

./gradlew -i setup

./gradlew -i mlDeploy 

Confirm:
- In Admin UI, check for new databases and app servers with names starting with xmi2es-examples-patient-hub
- In Query Console, explore the xmi2es-examples-patient-hub-MODULES database. Confirm it has the docuemnt /xmi2es/xmi2esTransform.xqy.

### Transform UML to ES

Now we convert the patient UML model to Entity Services:

./gradlew -i -b uml2es4dhf5.gradle -PmodelName=PatientHubUML uDeployModel

Confirm:
- You have the file data/entity-services/PatientHubUML.json in your gradle project.
- You have the file data/entity-services-dump/xmi2es/findings/PatienHubUML.xml in your gradle project. Check the contents of this file. It should not indicate any UML-ES conversion issues.

### Create Hub Entities

Create DHF entities (like the original ones in the directory entities_fromDHFExample) by running this:

./gradlew -b uml2es4dhf5.gradle -i uCreateDHFEntities -PmodelName=PatientHubUML -PentitySelect=stereotype

Confirm:
- In entities directory of your gradle project are Admissions.entity.json and Patients.entity.json. These are the only entities designated xDHFEntity in the UML model. The other classes -- Labs, Diagnoses -- are not full-fledged DHF entities.

### Deploy Entities

Deploy what you just created:

./gradlew -i hubDeployUserArtifacts mlReloadModules

### Run Example As Is

Run the original example! You can run from QuickStart or from command-line using gradle. Here's the gradle way:

./gradlew -i hubRunFlow -PflowName=Diagnoses

./gradlew -i hubRunFlow -PflowName=Labs

./gradlew -i hubRunFlow -PflowName=Admissions

./gradlew -i hubRunFlow -PflowName=Patients

Confirm:
- In xmi2es-examples-patient-hub-FINAL database check documents in Patient collection. They should contain admissions, which in turn contain labs and diagnoses:

```
{
    "instance": {
        "Patient": {
            "Admissions": [
                {   "Admission": {
                        "AdmissionID": "1",
                        "AdmissionStartDate": "1967-06-02 08:43:45.987",
                        "AdmissionEndDate": "1967-06-14 09:59:12.247",
                        "Diagnoses": [{ "Diagnosis": {...} }],
                        "Labs": [{ "Lab": {...} },
                                 { "Lab": {...} }]
                    },
                    "info": {...}
                },
                {   "Admission": {...}},
                {   "Admission": {...}},
                {   "Admission": {...}}
            ],
            "PatientID": "E250799D-F6DE-4914-ADB4-B08A6E5029B9",
            "Gender": "Female",
            "DoB": "1945-08-04 19:03:00.757",
            "Race": "White",
            "Marital-status": "Single",
            "Language": "Unknown",
            "PercentageBelowPoverty": 12.86
        },
        "info": {
            "title": "Patient",
            "version": "0.0.1"
        }
    }
}
```






