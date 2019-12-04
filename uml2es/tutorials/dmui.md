# Zero Code Model-Map-Harmonize (MarkLogic Internal and UNDER CONSTRUCTION)

## Intro
This tutorial shows how you, *without having to write any code*, can move raw, messy data into MarkLogic and convert it to a much better form that conforms to a UML model. Our approach can best be described as *model-driven declarative mapping*. There's no coding; developers aren't needed. Rather, the brunt of the work is done by the two roles you would expect: 

- A data architect, who creates the data model in a third-party UML tool (in our case, Papyrus).
- A source-data subject-matter expert (SME), who uses the Data Hub's mapper tool to define the source-to-target mapping. This SME is an expert in the messy source data and works closely with the data architect to understand the UML-defined target data format.

The data architect and source-data SME are helped by a build person, who creates a gradle-based MarkLogic data hub environment that incorporates the UML and mapping tools. 

The diagram below outlines the steps of the zero-code effort. 

![Zero-Code overview](images/dmui_overall.png)

A) The data architect in Papyrus creates the UML data model. 

B) The data architect, using the build environment created by the build person, uses UML2ES to convert the UML model to MarkLogic's Entity Services (ES) form. 

C) The source-data SME works within the Data Hub QuickStart tool to map source data to the model form (UML, ES) of the data. 

D) The data flow to stage raw source person data, map it to the model's form, and persist that model-based data to the hub's FINAL database, is executed. In the tutorial we'll run it manually within Quick Start. It is simple enough step for any of the roles to execute. In a production environment, its execution is likely scripted by the build person.

There's no coding in this process... not even in step D! All the work is done by data experts and tools! To see why, try out this tutorial! You will play each of the roles through all the above steps. 

For this tutorial you need MarkLogic (version 9 or later), UML2ES, Papyrus (an open-source UML tool), and the Data Hub 5.1 QuickStart tool.

- You will need a local clone of UML2ES
- See [How to install Papyrus](papyrus_install.md) for instructions on installing Papyrus

## Step 1: Standup a MarkLogic Data Hub (Build Person)

<details><summary>Click to view/hide this section</summary>
<p>

We get started by having you, in the role of build person, setup a data hub, with UML2ES, on MarkLogic.

Pre-requisites:
- MarkLogic 9 (or greater) installation up and running
- Local clone of UML2ES
- Data Hub Framework 5.1 QuickStart

To begin, open Quick Start 5.1 in your browser and create a new project. Put it into a folder called dmHub. Once your new hub is up and running, you're ready to continue.

Next copy into the dmHub folder the entire contents (preserving directory structure) of [dmHubLab/step1](dmHubLab/step1). You did the copy correctly if you see data/coolness/hobbyCoolness.json and log/log4j/properties directly under dmHub. 

Copy into dmHub/src/main/ml-modules/root the UML2ES transform code [../uml2esTransform/src/main/ml-modules/root/xmi2es](../uml2esTransform/src/main/ml-modules/root/xmi2es). You did it right if you can see the file dmHub/src/main/ml-modules/root/xml2es/xml2esTransform.xqy. If you don't see the file in exactly that this location, remove what you copied and try again at the correct level. 

Copy into the main folder dmHub the UML2ES build file [../uml2esTransform/uml2es4dhf51.gradle](../uml2esTransform/uml2es4dhf51.gradle).

Under dmHub/data, create subfolders model and papyrus

Copy into dmHub/data/papyrus the UML2ES profile [../umlProfile/eclipse/MLProfileProject](../umlProfile/eclipse/MLProfileProject). You did it right if you can see the file dmHub/data/papyrus/MLProfileProject/MLProfile.profile.uml. If you don't see the file in exactly that location, remove what you copied and try again at the correct level. 

When you are done, you should have the following folder structure: 

![Step 1 - folder structure](images/dmui_setup1.png)

After setting up the hub, you copied UML2ES source code into the project. To conclude the setup, deploy that code! First, edit edit gradle.properties to supply values for mlUsername and mlPassword. Then, from the command line, run the following gradle command; make sure to run this from your dmHub project folder. 

./gradlew -i mlReloadModules

5.1 Beta kludge ... If it's giving you dependency grief, edit your build.gradle file. First comment out the whole thing! Then add the following: 

```
buildscript {
repositories {
jcenter()
maven {url 'http://distro.marklogic.com/nexus/repository/maven-releases/'}
}
dependencies {
classpath "com.marklogic:ml-data-hub:5.1.0-rc1"
}
}
plugins {
id 'net.saliman.properties' version '1.4.6'
}
apply plugin: "com.marklogic.ml-data-hub"
```


</p>
</details>

## Step 2: Design UML Model - PersonWithInterest (Data Architect)

<details><summary>Click to view/hide this section</summary>
<p>

Next you get to play the role of data architect. You will use the UML modeling tool Papyrus to design a *person with interests* (PWI) data model. The purpose of the model is to define the structure of persons and their hobbies/interests. The model is straightforward; the mapping, as we will see in step 4, has interesting nuances.

### Step 2a: Setup Workspace and Projects

Pre-requisite: You need Papyrus. If you don't have Papyrus, install it. See [How to install Papyrus](papyrus_install.md) for instructions.

Open Papyrus in a new workspace. The location of the workspace on your local machine is unimportant. 

To use your new model with MarkLogic, you need to add the UML-to-Entity Service profile. In Step 1 you copied it from the UML2ES clone to dmHub/data/papyrus/MLProfileProject. To import into Papyrus, from the File menu select Import | General | Existing Projects Into Workspace. 

![Import profile project](images/pap_profile2_import.png)

Click Next. In the Import Projects dialog, make sure "Select root directory" is selected. Use the Browse button to locate the ML profile in dmHub/data/papyrus/MLProfileProject. 

![Import profile project](images/dmui_setup3.png)

Click Finish. You should now see the profile project in the Project Explorer pane in the upper-right corner of Eclipse. Next, create a project for the PWI model. From the File menu choose New | Other. From the Select wizard, choose Papyrus project.

![New project in Papyrus](images/pap_model_create.png)

Click Next. In the Diagram Language window, select UML.

![New project in Papyrus](images/pap_model_uml.png)

Click Next. In the next window enter the project name as PWIModel. Select the model file name as PWIModel. For the location, uncheck "Use default location". For location, browse to the dmHub/data/papyrus folder you created in Step 1. To this path append PWIModel.

![New project in Papyrus](images/dmui_setup4.png)

Click Next.  In the next page, for Root Model Element Name, enter PWIModel (replacing RootElement). Under Diagram Kind, select Class Diagram. Click the box "A UML model with basic primitive types." Under "Choose a profile to apply", select Browse Workspace and select MLProjectProfile|MLProfile.profile.uml. 

![New project in Papyrus](images/dmui_setup5.png)

Click Finish. In Papyrus, you now see two projects in your workspace:

![Papyrus projects](images/dmui_setup6.png)

### Step 2b: Create Classes

We will design a relatively simple model consisting of two main classes: Person and Hobby. In the palette select Class and drag it onto the canvas. It creates a class called Class1.

![New class](images/dmui_setup7.png)

In the bottom panel, select Properties. Change the name of the class to Person.

![Person class](images/dmui_setup8.png)

Create a second class by selecting Class in the palette and dragging it onto the canvas. It creates a class called Class1. In the bottom panel, select Properties and change its name to Hobby.

![Person and hobby classes](images/dmui_setup9.png)

In the canvas, hover over the Person class. From the bar select Add Property Class Attribute Label.

![Person attribute](images/pap_model_attribute.png)

It creates an attribute called Attribute1. Select the attribute and in the properties change the name to "id" and the type to String (under UML Primitives).

![Person id](images/dmui_setup10.png)

Create two more attributes in Person: firstName and lastName. Both are strings. In the Hobby class create two attributes: name and coolness. Name is a string; coolness is an integer (found under UML Primitives).

![Person and hobby](images/dmui_setup11.png)

In the palette under Edges select Association. Drag it onto the canvas. Connect Person class to Hobby class. 

![Association](images/dmui_setup12.png)

Select the association in the Properties. Change the leftmost Member End's name from "hobby" to "hobbies". Also change its mulitiplicity to 0..* and its Aggregation to shared.

![Association](images/dmui_setup13.png)

### Step 2c: Stereotyping the Model

To help map this to Entity Services, we'll add a few stereotypes to our model.

First we will make the id attribute of Person a primary key. To do this, select the id attribute. In the Properties panel select Profile. Click the + button above Applied Stereotypes. From the list of applicable stereotypes select PK and click the arrow to move it to Applied Stereotypes.

![id PK](images/pap_model_idpk.png)

Click OK. The class now looks like this.

![Person PK](images/dmui_setup14.png)

Using a similar approach, add the elementRangeIndex stereotype to the two Hobby attributes; this allows us to build a facet of hobby names and to perform numeric range queries on coolness. 

![Hobby stereotypes](images/dmui_setup15.png)

We will give our model a version and a namespace. Click in a blank part of the canvas. Under Properties select Profile. Under Applied Stereotype click the +. (If you can't see Applied Stereotypes, make the properties panel larger.) Under Applicable Properties select esModel and click the arrow button to move it to Applied Properties.

![esModel](images/pap_model_esmodel.png)

Click OK. Back in the Properties panel, you see the esModel has been added. Expand it, click on version. In the right text box type 0.0.1.

![esModel version](images/dmui_setup16.png)

Similarly for baseUri enter the value http://xyz.org/marklogicModels.

In the same Properties window select UML and change the name from Root Element to Person.

![Root element](images/dmui_setup17.png)

Finally, let's indicate that the Person class is meant to be a primary entity in DHF. That is, in DHF, we will be building Person documents. A Person contains zero or more Hobby instances. Hobby is not a primary entity. There are no hobby documents; a hobby lives as a sub-document of Person. We therefore stereotype the Person class as xDHFEntity. Select the Person class.  Under Properties select Profile. Under Applied Stereotype add xDHFEntity.

![Final model](images/dmui_setup17a.png)

Here is the final model:

![Final model](images/dmui_setup18.png)

We are done modeling. Click File | Save All.

If you think you might have messed up along the way, a pre-cooked model is available under [dmHubLab/step2/PWIModel](dmHubLab/step2/PWIModel). If you want it in your workspace, the simplest way is to copy each of its files over yours. You can also delete the PWIModel project from your workspace (by right-clicking the project and selecting Delete, but keeping the contents!) and import the pre-cooked project (File | Import | Existing Projects Into Workspace). 

</p>
</details>

## Step 3: Transform UML to ES Model (Data Architect, Build Person)

<details><summary>Click to view/hide this section</summary>
<p>

Now it's time to convert the UML model to Entity Services form. This is best done by running a Gradle command from the command line. Make sure you are in the dmHub project folder. Run the following:

./gradlew -i -b uml2es4dhf51.gradle uDeployModelToDHF -PmodelFile=data/model/PWIModel/PWIModel.uml -PentitySelect=stereotype

</p>
</details>

## Step 4: Defining the Mapping (Source Data SME)

<details><summary>Click to view/hide this section</summary>
<p>

In Step 4 you play the role of Source Data SME. You will use the Quick Start tool to build a mapping of raw source person data to the Person structure of the UML model. 

## Step 4a: Build the Mapping

First, open the DM IDE tool; see [How to install Declarative Mapper](dm_install.md) for instructions. In the initial screen ("Recent Projects"), paste in the fully path of your gradle project. Then click the + button.

![IDE initial](images/dmui_setup20.png)

In the next screen, in the bottom left corner, click the Folder button. 

![IDE folder prompt](images/dmui_setup21.png)

This takes you back to Recent Projects. Click on the eye button.

![IDE eye prompt](images/dmui_setup22.png)

The next screen shows you the entities in the project. Click on Person. 

![Person prompt](images/dmui_setup23.png)

Under mappings, create a new mapping called PWIMapping. In the "Mapping name" text box type PWIMapping. Under actions, click +. 

![PWI mapping](images/dmui_setup24.png)

On the bottom select the PWIMAPPING tab. This brings up the PWI Mapping editor:

![PWI mapping editor](images/dmui_setup25.png)

Time to map! First, understand the source data. Look at person1.json in the data/persons directory of your gradle project (also in [dmHubLab/step1/data/persons](dmHubLab/step1/data/persons)):

{
  id: "123",
  first_name: "mike",
  last_name: "havey",
  hobbies: [
    "swimming", 
    "banking",
    "paragliding"
  ]
}

Conceptually, the mapping to the model works as follows:
- id, first_name, last_name in the source are mapped to the id, firstName, and lastName attributes of the Person entity. Well, id is not mapped exactly as is. Rather, the Person.id attribute is the concatenation of "/pwi/", the id source value and ".json".  Person.id ends up looking like a URI.
- In the source object, hobbies is an array of strings (hobby names). In the model form, Person.hobbies is an array of Hobby objects, each consisting of a name and coolness. The source document has only the names. Coolness is determined by a lookup on the hobbyCoolness.json document in the data/coolness directory of your gradle project (also in [dmHubLab/step1/data/coolness](dmHubLab/step1/data/coolness)).

{
	"swimming": 1,
	"banking": 3,
	"steely-dan": 1000000, 
	"paragliding": 100000,
	"scotch": 100000,
	"yoga": 0
}


Now that you understand how the mapping should work, use the DM IDE tool to create the mapping for real. Use the grammar of the Data Hub Framework field tool. Under Person, select id. In the editor on the right, under Expression, type [[ concat('/pwi/', extract('//id'), '.json') ]]

![PWI id mapping](images/dmui_setup26.png)

In a similar way, map first_name to [[ extract('//first_name') ]] and last_name to [[ extract('//last_name') ]]

The hobby array requires special care. Click on the name attribute. Under expression enter [[extract('.') ]] Under condition enter %%[[extract('//hobbies', true)]] The condition is an array iterator; each hobby will iterate over the list of hobby names (//hobbies) in the source. The name expression is just the value of the name. 

![PWI hobby mapping](images/dmui_setup27.png)

For coolness, enter the expression: [[ lookup('/hobbyCoolness.json', extract('.')) ]] Coolness is the numeric value corresponding to the hobby name in hobbyCoolness.json. You don't need to enter a condition for coolness; it uses the same condition as name.

Click the save button (bottom left corner) to save your mapping. It gets saved to plugins/entities/Person/harmonize/PWIMapping/PWIMapping.mapping.json file in your gradle project. If you think you messed up, you can get the correct mapping file from [dmHubLab/step4/PWIMapping/PWIMapping.mapping.json](dmHubLab/step4/PWIMapping/PWIMapping.mapping.json); copy it into plugins/entities/Person/harmonize/PWIMapping/PWIMapping.mapping.json 

## Step 4b: Test the Mapping Within IDE

First, load the sample documents by running:

gradle -i loadDmIdeSampleData mlReloadModules

Run mlWatch to auto-detect and deploy changes to the sample documents:

gradle -i mlWatch

Restart the DM IDE and select PWIMapping. In the left panel, select person1.json. 

![Sample in IDE](images/dmui_setup28.png)

In the center panel, just above the mapping, click the Refresh button. Wait a few seconds. You will see the results of the mapping applied to the sample document as green-shaded text within the mapping.

![Sample result in IDE](images/dmui_setup29.png)

Edit the source document in the left panel of the IDE. Make the id "123abc". Also change the hobbies to contain only "yoga" and "steely-dan". When done, click the save button.

![Modified sample in IDE](images/dmui_setup30.png)

Wait a minute. Then click the Refresh button again. You will see slightly different results in the green-shaded text. 

![Modified sample result in IDE](images/dmui_setup31.png)

</p>
</details>

## Step 5: Ingest and Harmonize Data (Build Person)

<details><summary>Click to view/hide this section</summary>
<p>

As the build person you now ingest and harmonize the data using the model and the mapping. You don't write any code. It's all gradle from here on out. 

First let's create a DHF input flow to ingest our Person source data into STAGING. Also, let's create a DHF harmonization flow to harmonize that data to FINAL from the source data. Run the following commands; if you are still running mlWatch (from the previous step), cancel it (Ctrl-C):

gradle -i hubCreateInputFlow -PflowName=LoadPerson -PuseES=false

gradle -b uml2es4dhf.gradle -i uCreateDHFHarmonizeFlow -PflowName=harmonizePWI -PcontentMode=dm 

You just generated a bunch of code. The good news is, you won't need a developer to touch it. The Input Flow ingests the data as is. The harmonization produces data that conforms to the UML model using the mapping from Step 4. You do need to "deploy" that mapping:

gradle -i mlReloadModules deployPWIMapping ### DOES NOT WORK in DHF 4.3 because of how module load works.

Next, ingest the source person data in the data/persons directory (as well as the hobbyCoolness lookup in data/lookup). We'll create a DHF input flow and run MLCP to ingest the person data through that flow. 

gradle -i loadPersonSourceData ingestLookup

If you look in the staging database (xmi2es-tutorials-dmHub-STAGING), you will see the ingested files /person1.json, /person2.json, and /hobbyCoolness.json.  

![After source ingestion](images/dmui_setup50.png)

Last, but not least, run the harmonization:

gradle -i hubRunFlow -PflowName=harmonizePWI

If you now explore the FINAL database (xmi2es-tutorials-dmHub-FINAL), you will see two new documents in the Person collection. Their URIs are /pwi/123.json and /pwi/456.json. How did they end up with these URIs? - In the model we designated the id attribute as the "xURI". In the mapping, we defined id as the concatenation of "/pwi", the value of the id attibute from the source document, and ".json". 

Click on /pwi/123.json to see its contents. 

```
{
  "envelope": {
    "headers": {},
    "triples": [],
    "instance": {
      "Person": {
        "id": "/pwi/123.json",
        "firstName": "mike",
        "lastName": "havey",
        "hobbies": [
          {
            "Hobby": {
              "name": "swimming",
              "coolness": 1
            }
          },
          {
            "Hobby": {
              "name": "banking",
              "coolness": 3
            }
          },
          {
            "Hobby": {
              "name": "paragliding",
              "coolness": 100000
            }
          }
        ]
      }
    },
    "attachments": null
  }
}
```

</p>
</details>


