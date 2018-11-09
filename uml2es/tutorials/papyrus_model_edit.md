# How To Build a Model in Papyrus for MarkLogic

## Intro
This tutorial shows how to create a UML model for MarkLogic in Papyrus. To run this, you need Papyrus installed in Eclipse.  See [How to install Papyrus](papyrus_install.md) for instructions.

## How to create the model:

### Create a new project

Open Eclipse. From the File menu choose New | Other. From the Select wizard, choose Papyrus project.

![New project in Papyrus](pap_model_create.png)

Click Next. In the Diagram Language window, select UML.

![New project in Papyrus](pap_model_uml.png)

Click Next. In the next window enter the project name as MyPapyrusProject.

![New project in Papyrus](pap_model_name.png)

Click finish.

In Project Explorer, you will see the new project. Papyrus created a dummy model for you called model. Delete it by right-clicking on it and selecting Delete.

![New project in Papyrus](pap_model_delete.png)

### Add the Profile

To use your new model with MarkLogic, you need to add the UML-to-Entity Service profile. You can use the one [provided in the toolkit](../umlProfile/MLProfile.xml), or if you completed the tutorial [How to edit the profile in Papyrus](papyrus_profile_edit.md), you can use its profile!

#### Using the Profile From the Toolkit

Import into the project the MLProfile.xml file that is in your local clone of the toolkit. The location is [uml2es/umlProfile/MLProfile.xml](../umlProfile/MLProfile.xml). Do NOT use the MagicDraw file at [uml2es/umlProfile/magicdraw/MLProfile.xml](../umlProfile/magicdraw/MLProfile.xml). To import, in Project Explorer right-click on the project name. From the context menu, select Import.

![Papyrus project import](pap_model_import.png)

From the Import window, choose General | File System.

![Papyrus project import from filesystem](pap_model_filesystem.png)

Click Next. In the next window, in the text box "From directory", enter the full path of the directory that contains the profile. Then in the right panel, select MLProfile.xml. 

![Papyrus project import profile from toolkit](pap_model_import2.png)

Click Finish.

Rename the file to MLProfile.profile.uml by right-clicking on the file and selecting Rename.

![Papyrus project rename](pap_model_rename.png)

#### Using the Profile From the Tutorial

If you completed the tutorial [How to edit the profile in Papyrus](papyrus_profile_edit.md), you have a modified version of the profile with a new stereotype called semYippee! To use that profile, in Project Explorer right-click on the project name. From the context menu, click Import.

![Papyrus project import](pap_model_import.png)

From the Import window, choose General | File System.

![Papyrus project import from filesystem](pap_model_filesystem.png)

Click Next. In the next window, in the text box "From directory", enter the full path of the Eclipse project you used in the tutorial. Then in the right panel, select MLProfile.profile.uml.

![Papyrus project import profile from toolkit](pap_model_importtut.png)

Click Finish.

### Building a Simple Model

In Project Explorer, right-click on Model and select New | Other. In the selection wizard screen select "Papyrus Model". 

![Project in Papyrus - new model](pap_model_new.png)

Click Next. For diagram language, select UML.

![Project in Papyrus - new model UML](pap_model_uml.png)

Click Next. For filename, enter PapyrusPerson.di

![Project in Papyrus - new model name](pap_model_name.png)

In the next page, for "Root model element name" type Person. For "Diagram Kind", select Class Diagram. Check "A UML Model With Primitive Types". For "Choose a profile to apply" click Browse Workspace. Select MyPapyrusProject/MLProfile.profile.uml.

![Project in Papyrus - new model UML](pap_model_options.png)

Click Finish..

You will now see the PapyrusPerson canvas open in the center panel. From the Palette on the right class, choose Class. Drag it onto the canvas. It creates a class called Class1.

![Project in Papyrus - new class](pap_model_class.png)

In the bottom panel, select Properties. Change the name of the class to Person.

![Project in Papyrus - person class](pap_model_person.png)

In the canvas, hover over the Person class. From the bar select Add Property Class Attribute Label.

![Project in Papyrus - person class new attribute](pap_model_attribute.png)

It creates an attribute called Attribute1. Select the attribute and in the properties change the name to "id" and the type to String (under UML Primitives).

![Project in Papyrus - id attribute](pap_model_id.png)

Create three additional attributes. Name them firstName, lastName, and hobbies. Make each a String. The multiplicity of each should be 1, except hobbies, which should have multiplicity 0..*. When done, your model should look like this:

![Project in Papyrus - remaining attributes](pap_model_person2.png)

### Stereotyping the Model

To help map this to Entity Services, we'll add a few stereotypes to our model. 

First we will make the id attribute a primary key. To do this, select the id attribute. In the Properties panel select Profile. Click the + button above Applied Stereotypes. From the list of applicable stereotypes select PK and click the arrow to move it to Applied Stereotypes.

![Project in Papyrus - id PK](pap_model_idpk.png)

Click OK. The class now looks like this.

![Project in Papyrus - person with id PK](pap_model_person3.png)

Using a similar approach, add the rangeIndex attribute to firstName, lastName, and hobbies. Your class now looks like this:

![Project in Papyrus - remaining attributes with range index](pap_model_person4.png)

We will give our model a version and a namespace. Click in a blank part of the canvas. Under Properties select Profile. Under Applied Stereotype click the +. (If you can't see Applied Stereotypes, make the properties panel larger.) Under Applicable Properties select esModel and click the arrow button to move it to Applied Properties.

![Project in Papyrus - esModel](pap_model_esmodel.png)

Click OK. Back in the Properties panel, you see the esModel has been added. Expand it, click on version. In the right text box type 0.0.1.

![Project in Papyrus - version](pap_model_version.png)

Similarly for baseUri enter the value http://xyz.org/marklogicModels.

We are done modelling. Click File | Save All.

### Moving the Model Into MarkLogic



The UML-to-Entity Services toolkit will transform your Papyrus UML model into the Entity Services form expected by MarkLogic.
You now follow the same approach as the numerous [examples](../examples) of this toolkit. You use a gradle project to ingest your model to MarkLogic and convert it to Entity Services. For this tutorial, use the gradle project in [uml2es/tutorials/gradle](gradle) directory of your local clone. You first need to setup a database and deploy the transform. 

- The first step is to review and modify gradle.properties; set suitable values for hostname, ports, username/password, and application name. 
- Next copy your Papyrus model to the gradle directory. Papyrus saves the model in the file PapyrusPerson.uml in the MyPapyrusProject of your Eclipse workspace. Copy that file to the gradle directory. Rename the file PapyrusPerson.xml. 
- Setup your database and deploy the transform by running: gradle -i includeXMI2ESTransform mlDeploy
- Load your model by running gradle -i loadXMI
- Load your model by running gradle -i loadPapXMI
- In QueryConsole explore the database xmi2es-tutorial-content. Your Entity Services descriptor is /xmi2es/es/PapyrusPerson.json. Notice how it aligns with the Papyrus model:
 
![Project in Papyrus - ES model](pap_model_es.png)
