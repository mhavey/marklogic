# Employee Cradle to Grave; Building an Employee Data Hub From Scatch. 

## Intro
Our [../examples](../examples) show the deployment and use of pre-cooked models. The [HR example](../examples/hr), for instance, demonstrates the use of an employee data model in MarkLogic's Data Hub framework. Being pre-cooked, the example showcases the finished product and does not walk through the soup-to-nuts process to create it.

In this tutorial, we cook an HR data hub from scratch. This tutorial is a recipe to build such a hub from basic ingredients: a UML modeling tool (Papyrus), MarkLogic database and its data hub framework, and this UML2ES toolkit. 

There is more than one cook in the kitchen. In a real-world project different people contribute in different roles. In our case, we need a data designer/architect to design the model, a source data subject-matter expert (SME) to tie the model to the raw source data set, a developer to bring the model and data into a servicable form in MarkLogic, and a build/admin person to provide a source code repo, a deployment process, and a runtime environment for the hub.

## Step 1: Standup a MarkLogic Environment and Source Code Repo (Build Person)

We get started by having you, in the role of build person, setup a basic data hub on MarkLogic. You will also create a source code repository with a folder structure in which different project artifacts are stored. 

There are two pre-requisites for running this step of the tutorial:

- You should have a MarkLogic 9.0-7 or greater installation up and running.
- You should have a local clone of the UML2ES toolkit. 

To begin, create a folder called employeeHub anywhere on your build machine. This folder will be a data hub gradle project that incorporates the UML2ES toolkit and has special sub-folders designated for the UML model, the source code mapping spreadsheet, and the source code. (All of these we will build, wearing a different hat, later in the tutorial.)

Under employeeHub, create the following subfolders:
- data
- src

Under employeeHub/data, create the following subfolders:
- mapping
- model
- papyrus

Under employeeHub/src, create the subfolder main.

Under employeeHub/src/main, creat the subfolder ml-modules.

Under employeeHub/src/main/ml-modules, create the subfolder root.

Copy into employeeHub/src/main/ml-modules/root the UML2ES transform code [../uml2esTransform/src/main/ml-modules/root/xmi2es](../uml2esTransform/src/main/ml-modules/root/xmi2es). You did it right if you can see the file employeeHub/src/main/ml-modules/root/xml2es/xml2esTransform.xqy. If you don't see the file in exactly that the location, remove what you copied and try again at the correct level. 

Copy into the main folder employeeHub the UML2ES build file [../uml2esTransform/uml2es4dhf.gradle](../uml2esTransform/uml2es4dhf.gradle).

Copy into employeeHub/data/papyrus the UML2ES profile [../umlProfile/eclipse/MLProfileProject](../umlProfile/eclipse/MLProfileProject). You did it right if you cn see the file employeeHub/data/papyrus/MLProfileProject/MLProfile.profile.uml. If you don't see the file in exactly that location, remove what you copied and try again at the correct level. 

Copy into the main folder employeeHub your initial build file [employeeHubLab/step1/build.gradle](employeeHubLab/step1/build.gradle) and your initial gradle properties file [employeeHubLab/step1/gradle.properties](employeeHubLab/step1/gradle.properties). Tweak the gradle.properties once you've copied it over. TODO ...

When you are done, you should have the following folder structure:

![Step 1 - folder structure](emp_setup1.png)

Now let's initialize the hub. In a command prompt navigate to your employeeHub folder and run the following:

gradle -i hubInit

This creates a few additional subfolders: plugins, src/main/hub-internal-config, src/main/ml-config, src/main/ml-schemas, build, gradle, and .gradle. 

If you wish, add the contents of the employeeHub folder to your source code repository. Don't add build, gradle, and .gradle; these folders contain temporary files that aren't meant to be shared.

Finally, let's create an instance of the data hub. In the command prompt, run the following

gradle -i mlDeploy

When this has completed, you should see in your MarkLogic environment several new databases, including xmi2es-tutorials-STAGING, xmi2es-tutorials-FINAL, and xmi2es-tutorials-MODULES. Check in admin console you have these.

![Step 2 - folder structure](emp_setup2.png)





