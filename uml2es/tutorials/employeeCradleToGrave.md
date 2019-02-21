# Employee Cradle to Grave; Building an Employee Data Hub From Scatch. 

## Intro
Our [../examples](../examples) show the deployment and use of pre-cooked models. The [HR example](../examples/hr), for instance, demonstrates the use of an employee data model in MarkLogic's Data Hub framework. Being pre-cooked, the example showcases the finished product and does not walk through the soup-to-nuts process to create it.

In this tutorial, we cook an HR data hub from scratch. This tutorial is a recipe to build such a hub from basic ingredients: a UML modeling tool (Papyrus), MarkLogic database and its data hub framework, and this UML2ES toolkit. 

There is more than one cook in the kitchen. In a real-world project different people contribute in different roles. In our case, we need a data designer/architect to design the model, a source data subject-matter expert (SME) to tie the model to the raw source data set, a developer to bring the model and data into a servicable form in MarkLogic, and a build/admin person to provide a source code repo, a deployment process, and a runtime environment for the hub.

## Step 1: Standup a MarkLogic Environment and Source Code Repo (Build Person)

<details><summary>Click to view/hide this section</summary>
<p>
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

Copy into employeeHub/data/papyrus the UML2ES profile [../umlProfile/eclipse/MLProfileProject](../umlProfile/eclipse/MLProfileProject). You did it right if you can see the file employeeHub/data/papyrus/MLProfileProject/MLProfile.profile.uml. If you don't see the file in exactly that location, remove what you copied and try again at the correct level. 

Copy into the main folder employeeHub your initial build file [employeeHubLab/step1/build.gradle](employeeHubLab/step1/build.gradle) and your initial gradle properties file [employeeHubLab/step1/gradle.properties](employeeHubLab/step1/gradle.properties). Tweak the gradle.properties once you've copied it over. For example, modify mlHost if you're ML server is not running on localhost; modify mlUsername and mlPassword if your admin username/password is not admin/admin.

When you are done, you should have the following folder structure:

![Step 1 - folder structure](images/emp_setup1.png)

Now let's initialize the hub. In a command prompt navigate to your employeeHub folder and run the following:

gradle -i hubInit

This creates a few additional subfolders: plugins, src/main/hub-internal-config, src/main/ml-config, src/main/ml-schemas, build, gradle, and .gradle. 

If you wish, add the contents of the employeeHub folder to your source code repository. Don't add build, gradle, and .gradle; these folders contain temporary files that aren't meant to be shared.

Finally, let's create an instance of the data hub. In the command prompt, run the following

gradle -i mlDeploy

When this has completed, you should see in your MarkLogic environment several new databases, including xmi2es-tutorials-empHub-STAGING, xmi2es-tutorials-empHub-FINAL, and xmi2es-tutorials-empHub-MODULES. Check in admin console you have these.

![Step 2 - folder structure](images/emp_setup2.png)
</p>
</details>

## Step 2: Design UML Model for Employee Hub (Data Architect)

<details><summary>Click to view/hide this section</summary>
<p>

Next you get to play the role of data architect. You will use the UML modeling tool Papyrus to design a class model for employees. The file containing your model resides in the employeeHub folder that the build person (performed convincingly by you) created in Step 1. 

### Step 2a: Setup Workspace and Projects

Pre-requisite: You need Papyrus. If you don't have Papyrus, install it. See [How to install Papyrus](papyrus_install.md) for instructions.

Open Papyrus in a new workspace. The location of the workspace on your local machine is unimportant. 

To use your new model with MarkLogic, you need to add the UML-to-Entity Service profile. In Step 1 you copied it from the UML2ES clone to employeeHub/data/papyrus/MLProfileProject. To import into Papyrus, from the File menu select Import | General | Existing Projects Into Workspace. 

![Import profile project](images/pap_profile2_import.png)

Click Next. In the Import Projects dialog, make sure "Select root directory" is selected. Use the Browse button to locate the ML profile in employeeHub/data/papyrus/MLProfileProject. 

![Import profile project](images/emp_setup3.png)

Click Finish. You should now see the profile project in the Project Explorer pane in the upper-right corner of Eclipse. Next, create a project for the employee model. From the File menu choose New | Other. From the Select wizard, choose Papyrus project.

![New project in Papyrus](images/pap_model_create.png)

Click Next. In the Diagram Language window, select UML.

![New project in Papyrus](images/pap_model_uml.png)

Click Next. In the next window enter the project name as EmployeeHubModel. Select the model file name as EmployeeHubModel. For the location, uncheck "Use default location". For location, browse to the employeeHub/data/papyrus folder you created in Step 1. To this path append EmployeeHubModel.

![New project in Papyrus](images/emp_setup4.png)

Click Next.  In the next page, under Diagram Kind, select Class Diagram. Click the box "A UML model with basic primitive types." Under "Choose a profile to apply", select Browse Workspace and select MLProjectProfile|MLProfile.profile.uml. 

![New project in Papyrus](images/emp_setup5.png)

Click Finish. In Papyrus, you now see two projects in your workspace:

![Papyrus projects](images/emp_setup6.png)

### Step 2b: Create Model and Package Structure

We will design a relatively simple model consisting of two main classes (Department, Employee) and a set of common location classes (Address, Phone, Email). We will split these classes into two packages: Department and Employee will go into the HRMain packages; the location classes will go in the HRCommon package.

Create the HRCommon package by dragging a Package from the Palette onto the diagram EmployeeodelHub.di. In the Properties pane edit the name of the package. Change it from Package1 to HRCommon. 

![HRCommon](images/emp_setup9.png)

Create a second package in the same way. Name this one HRMain. 

Next, configure model-level attributes. In the diagram, click anywhere on the white background outside the packages you just created. In the Properties pane, in the UML section change the name from RootElement to HRModel.

![HRModel](images/emp_setup10.png)

Still in the Properties pane, move to the Profile section and scroll down to the Applied Stereotypes. Click on the + symbol. In the popup window, under Applicable Stereotypes select esModel. 

![HRModel Profile](images/emp_setup11.png) 

Move it over to the Applied Stereotypes section by clicking the button with an arrow that points right. When done click OK to close the popup.

![HRModel Profile](images/emp_setup12.png) 

Back in the Properties pane, in the Applied Stereotyes part of the Profile section still, select version under esModel. Enter the value 0.0.1

![HRModel Profile](images/emp_setup13.png) 

Similarly for baseUri enter the value http://com.marklogic.es.uml.hr. Save the model (File | Save All).

We have now a properly named model with packages for its two main parts.

### Step 2c: Define HRCommon Classes

For the remainder of this step you will need the Model Explorer. If it is not open in your workspace, open it by selecting Window | Show View | Papyrus | Model Explorer. 

![Model explorer](images/emp_setup7.png)

Model Explorer will now appear as a new pane, likely on the bottom or right part of the screen.

![Model explorer](images/emp_setup8.png)

Using the Model Explorer, we will now create two new class diagrams, one for each package. Select the HRCommon package, right-click, and from the menu choose New Diagram | Class Diagram. 

![New Class Diagram](images/emp_setup14.png)

Give it the name HRClassDiagram. Similarly for HRMain, create a class diagram called HRMainClassDiagram. Your Model Explorer should now show the following:

![Packages and Diagrams](images/emp_setup15.png)

Select the HRCommonClassDiagram in Model Explorer. Drag a Class from the Palette onto the HRCommonClassDiagram canvas. Name it Address. Similarly create classes Phone and Email. Your diagram should look like this:

![Common](images/emp_setup16.png)

Let's add attributes to each class. Select the Address class. From the context menu that appears, choose Add Property Class Attribute Label. 

![Attribute](images/emp_setup17.png)

Then in the UML section of the Properties pane, change its name from Attribute1 to addressType. Set the Type to UML Primitive Types | String. Keep the Multiplicity at 1.

![Attribute](images/emp_setup18.png)

At this point your diagram looks like this:

![Attribute](images/emp_setup19.png)

Add these attributes to Address:

- lines, type: string, multiplicity: 1..*
- city, type: string, multiplicity: 1
- state, type: string, multiplicity: 1
- zip, type: string, multiplicity: 1
- country, type: string, multiplicity: 1

Add these attributes to Phone:

- phoneType, type: string, multiplicity: 1
- phoneNumber, type: string, multiplicity: 1

Add these attributes to Email:

- emailType, type: string, multiplicity: 1
- emailAddress, type: string, multiplicity: 1

When you are done, your diagram should look like this:

![Attributes](images/emp_setup20.png)

### Step 2d: Define HRMain Classes

Now switch to the HRMainClassDiagram by double-clicking it in the Model Explorer. The canvas above is blank. Drag two classes onto it. Name them Employee and Department.

![Main](images/emp_setup21.png)

Add the following attributes to Employee:

- employeeId, type: string, multiplicity: 1
- firstName, type: string, multiplicity: 1
- lastName, type: string, multiplicity: 1
- status, type: string, multiplicity: 1
- hireDate, type: none, multiplicity: 1
- effectiveDate, type: none, multiplicity: 0..1
- baseSalary, type: real, multiplicity: 0..1
- bonus, type: real, multiplicity: 0..1
- dateOfBirth, type: none, multiplicity: 1
- uri, type: string, multiplicity: 1

Add the following attributes to Department:
 
- departmentId, type: integer, multiplicity: 1
- name, type: string, multiplicity: 1
- uri, type: string, multiplicity: 1

Here's what you should have so far:

![Main](images/emp_setup22.png)

Next we configure a few relationships. First, let's represent the memberOf relationship. An employee is a member of a department. To represent this, draw an association between the Employee class and the Department class. In the Palette select Association. Then with your mouse draw a line from Employee to Department. 

![memberOf](images/emp_setup23.png)

Select the association link you just drew and see the details of it in the Properties pane. You see two Member Ends. For the Member End on the right (labelled employee), ensure Navigable is set to false. For the Member End on the left, change the name from department to memberOf. Change the multiplicity to 0..1.

![memberOf](images/emp_setup24.png)

Next to do is the reportsTo relationship between employees. Draw an association from the Employee class to itself by selecting Association in the Palette and drawing a line from Employee back to itself. Then select that line you drew and in the Properties pane make sure the right Member End has Navigable set to false. For the left Member End, change the name to reportsTo and set multiplicity to 0..1.

![reportsTo](images/emp_setup25.png)

Now let's bring into this diagram the Address, Phone, and Email classes from our HRCommon package. In Model Explorer, under HRCommon select Address and drag it into the current diagram. Do the same with Phone and Email.

![common](images/emp_setup26.png)

In our model, both Employee and Department have addresses, phones, and emails. We use aggregration relationships to represent this. Draw six association links: Employee to Address, Employee to Phone, Employee to Email, Department to Address, Department to Phone, and Department to Email. Because of all the arrows the diagram might be a bit messy. Let's make it pretty. First, move the classes into a good spot on the canvas:

![common](images/emp_setup27.png)

Next, remove unnecessary arrow labelling. Right-click on the white part of the diagram and from the context menu choose Select | All Connectors. Right-click again and choose Filters | Manage Connector Labels. In the popup, click Deselect All. Then manually select Target Role and Target Multiplicity under A_memberOf_employee and A_reportsTo_employee. 

![pretty](images/emp_setup28.png)

Click OK to close the popup. Lastly, select Address, Phone, and Email. Right-click and select Filters | Show/Hide Compartments. In the popup click Deselect All. Click OK. We end up a more pleasant diagram:

![gorgeous](images/emp_setup29.png)

To complete the step, modify the configuration of each of the six associations to Address, Phone, and Email. For each, select the arrow in the diagram. In the Properties pane, ensure the right Member End is non-navigable. For the left Member End, change the multiplicity to 0..*, the aggregation to shared, and the name to the plural (addresses, phones, and emails rather than address, phone, and email). Here is what the configuration looks like for the link between department and email:

![aggregation](images/emp_setup30.png)

At this point, your model looks like this:

![aggregation](images/emp_setup31.png)

### Step 2e: Add Class and Attribute Stereotypes

Lastly, let's prepare the model for MarkLogic by stereotyping it. First, let's associate with the class Department the MarkLogic collection named "Department". To do this, select Department in the diagram. In the Properties pane, switch to the Profile section. In the Applied Stereotypes, click the + button. In the popup move xDocument from Applicable Stereotypes to Applied Stereotypes. 

![xDocument](images/emp_setup32.png)

Click OK. Then back in the Properties pane, add the value Department for the collections tag of xDocument.

![collections](images/emp_setup33.png)

Do the same for the Employee class. Assign it the stereotype xDocument with the collections value Employee.

Next, stereotype several of the attributes by first selecting the atttibute in the diagram and then stereotyping and tagging it in the Profile section of the Properties pane:

- Give Department.departmentId the stereotype PK.
- Give Employee.employeeId the stereotype PK.
- Give Employee.hireDate, Employee.effectiveDate, and Employee.dateOfBirth the stereotype esProperty with mlType "date".
- Give Department.uri the stereotype xCalculated. Its tagged value concat consists of three strings with the quotes included:
	* "/department/"
	* $attribute(departmentId)
	* ".json"

![concat](images/emp_setup34.png)

- Give Employee.uri the stereotype xCalculated. Its tagged value concat consists of three strings with the quotes included:
	* "/employee/"
	* $attribute(employeeId)
	* ".json"

Your last step is to configure the memberOf and reportsTo relationships to use reference rather than containment. In MarkLogic, you want Employee's memberOf attribute to contain the primary key of the Department rather than a copy of the Department object itself. You want Employee's reportsTo attribute to contain the primary key of the other Employee rather than a copy of the other Employee object itself. (The relationships from Department and Employee to Address, Phone, and Type, on the other hand, will be containment, not reference.)

To make the memberOf attribute referential, in the diagram, select the Employee class. In the Properties pane, go to the UML section. Under Owned Attribute, select memberOf. Double-click it. In the Edit Property popup, switch to the Profile tab. Click the + button. Move from Applicable Stereotypes to Applied Stereotypes the FK stereotype.

![memberOf](images/emp_setup35.png)

![memberOf](images/emp_setup36.png)

Do the same for reportsTo.

And here's the final diagram:

![memberOf](images/emp_setup37.png)

Save your work (File | Save All). If the build person has created a source code repository, push your model to that repo.

### Step 2 Summary

You created a model with two packages: HRCommon, containing classes Address, Phone, and Email; and HRMain, containing classes Department and Employee. There are numerous relationships in your model, and your model includes several stereotypes. 

If you think you might have messed up along the way, a pre-cooked model is available under [employeeHubLab/step2/EmployeeHubModel](employeeHubLab/step2/EmployeeHubModel). If you want it in your workspace, the simplest way is to copy each of its files over yours. You can also delete the EmployeeHubModel project from your workspace (by right-clicking the project and selecting Delete, but keeping the contents!) and import the pre-cooked project (File | Import | Existing Projects Into Workspace). 

</p>
</details>

## Step 3: Confirm Model Works in MarkLogic (Build Person, Data Architect, Developer)

<details><summary>Click to view/hide this section</summary>
<p>
Next is a quick verification that the UML model can be deployed to MarkLogic as part of the build process. This gives the data architect the assurance that the model "works in ML." It gives the developer a first look at the model and how it is represented in ML. It gives the build person knowledge of the steps to deploy the UML model to ML.

We won't have any actual DHF code when this step completes. That comes later. But we will have proved that our UML model can be transformed to Entity Services. And with that assurance, we're off and running with ES-based development.

First, the build person modifies the build.gradle and gradle.properties files created in Step 1. Put on your build person hat and make the following edits:

- To build.gradle, add the following code at the end:

task prepHRModel(type: Copy) {
    from "data/papyrus/EmployeeHubModel/EmployeeHubModel.uml"
    into "data/model"
    rename '(.*).uml', '$1.xml'
}

task runUML2ESDeploy(type: GradleBuild) {
  buildFile = "uml2es4dhf.gradle"
  tasks = ["uDeployModel"]
}

task deployHRModel() {
  dependsOn "prepHRModel"
  dependsOn "runUML2ESDeploy"
  tasks.findByName('runUML2ESDeploy').mustRunAfter 'prepHRModel'
}

- To gradle.properties, add the following line at the end:

modelName=EmployeeHubModel

If you're not sure you did this correctly, look at pre-cooked files [employeeHubLab/step3/build.gradle](employeeHubLab/step3/build.gradle) and [employeeHubLab/step3/gradle.properties](employeeHubLab/step3/gradle.properties). 

To transform the UML model to Entity Services and deploy it to MarkLogic, you, still in the role of build person, runs the following from the command line in the gradle project folder you created in Step 1.

gradle -i deployHRModel

That command should run successfully. You should see "BUILD SUCCESSFUL" when its completes. To check what it did, go into the Query Console and navigate to the xmi2es-tutorials-empHub-FINAL database. Click on Explore. Among the documents created are the following:

- /marklogic.com/entity-services/models/EmployeeHubModel.json (The deployed ES model. We'll come back to this in a moment.)
- /xmi2es/extension/EmployeeHubModel.ttl (Semantic triples that extend our ES model)
- /xmi2es/gen/EmployeeHubModel/lib.xqy (Initial generated code from the model. We'll come back to this in a moment.)
- /xmi2es/findings/EmployeeHubModel.xml (Problems found during transformation. Stop and open this up. Check to make sure it reports no issues.)
- /xmi2es/xmi/EmployeeHubModel.xml (The original UML model as an XMI document)

- In Query Console, open a tab of type SPARQL, point to the final DB, run the following query, and verify you get any results. This means the ES model is in FINAL and its semantic metadata is populated.

select * where {?s ?o ?p}

Among the results, you should see the following:
- <http://com.marklogic.es.uml.hr/HR-0.0.1/Employee> <http://marklogic.com/entity-services#property> http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/emails> from basic ES model
- <http://com.marklogic.es.uml.hr/HR-0.0.1/Employee/memberOf> <http://marklogic.com/xmi2es/xes#relationship>  "association" from the extended ES model


</p>
</details>
