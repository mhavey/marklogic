# How To Edit the UML-to-Entity Services Profile in Papyrus

## Intro
In the UML-To-Entity Services toolkit, we use MagicDraw, not Papyrus, to design the UML profile for MarkLogic. Both of these tools have excellent profile modelling capabilities, but we have gone with MagicDraw. 

It is nonetheless possible to edit the profile in Papyrus. There are two ways to do this, but only one of these is feasible in the current version of the toolkit.

The first way is to use Eclipse Modeling Framework (EMF) UML editor. This editor is bundled with Papyrus, so if you installed Papyrus into your Eclipse, you already have the EMF UML editor. The EMF UML editor, frankly, is intended for technical users. It doesn't offer the intuitive drag-onto-canvas method of MagicDraw. Still, with some guidance this first way is a workable approach. This tutorial will guide you through it. 

The second way is to use the full Papyrus profile diagram editor to graphically build the profile. This tool is as user-friendly as MagicDraw for building new profiles, but cumbersome for editing a profile that was designed in another tool. For toolkit development, we'll use this approach only if we decide to switch from MagicDraw to Papyrus to maintain the profile. We might make that switch some day, but for now our profile tool is MagicDraw. We won't attempt the second way.

## How to edit the profile:

### Create project in Eclipse.

Open Eclipse. Create a project for the profile by choosing File | New | Project. In the New Project window, select Papyrus Project.

![Choose papyrus project](pap_profile_newproject.png)

Click Next. In the New Papyrus Project window, select Profile:

![Papyrus project - profile type](pap_profile_projecttype.png)

In the New Papyrus Project window name your project MLProfile.

![Papyrus project create](pap_profile_newproject2.png)

Click Finish. You now see your new project. From Project Explorer, delete the dummy profile that was created. Right-click on model.profile and select Delete.

![New papyrus project](pap_profile_newproj_delete_model.png)

Import into the project the MLProfile.xml file that is in your local clone of the toolkit. The location is uml2es/umlProfile/MLProfile.xml. Do NOT use the MagicDraw file at uml2es/umlProfile/magicdraw/MLProfile.xml. To import, in Project Explorer right-click on the project name (MLProfile). From the context menu, select Import.

![Papyrus project import](pap_profile_import.png)

From the Import window, choose General | File System.

![Papyrus project import from filesystem](pap_profile_filesystem.png)

Click Next. In the next window, in the text box "From directory", enter the full path of the directory that contains the profile. Then in the right panel, select MLProfile.xml. 

![Papyrus project import profile from toolkit](pap_profile_import2.png)

Click Finish.

Rename the file to MLProfile.profile.uml by right-clicking on the file and selecting Rename.

![Papyrus project rename](pap_profile_rename.png)

### Editing the profile

Double-click on the file MLProfile.profile.uml to open it in the EMF UML editor. If you expand it a few levels, you see that is is divided into three subpackages: es, sem, xes.

![Papyrus profle in editor](pap_profile_editor.png)

Let's add a new stereotype to the sem subpackage. Right-click the sem package, and select New Child | Owned Stereotype | Stereotype. 

![Papyrus profile - new Element](pap_profile_newelem.png)

In the properties panel, type the name. We will call it semYippee.

![Papyrus profile - yippee](pap_profile_yippee.png)

You should decide whether the stereotype applies to UML packages, classes, properties, or some combination of these. Let's configure semYippee to apply to properties. Select the stereotype and from the main Eclipse menu select UML Editor | Stereotype | Create Extension.

![Papyrus profile - extension](pap_profile_extension.png)

In the Create Extensions window, under Choice Pattern enter "property". Then under Choices select UML::Property and click Add to move it to the right side.

![Papyrus profile - extension property to add](pap_profile_extension2.png)

![Papyrus profile - extension property added](pap_profile_extension3.png)

When done click OK.

The last step is to "define" the profile. This is a one-click step that is important for technical reasons. Refer to the links below for more. To perform this step, right-click on the node labeled MarkLogicEntityServicesProfile under UML. Delete it. 

![Papyrus profile - delete the anno](pap_profile_deleteanno.png)

Then select the node labelled "<Profile>Marklogic Entity Services Profile". From main Eclipse menu select UML Editor | Profile | Define. 

![Papyrus profile - define](pap_profile_define.png)

In the dialogic click OK. Done!!

### Saving the profile

When you are done editing, save the profile by selecting File | Save All from the menu. You can use this modified profile in your Papyrus models.

## Useful Reading
- <https://wiki.eclipse.org/MDT/UML2/Introduction_to_UML2_Profiles> - useful guide to designing profiles in the EMF UML editor.
- <https://www.eclipse.org/papyrus/resources/PapyrusUserGuideSeries_AboutUMLProfile_v1.0.0_d20120606.pdf> - useful guide to designing profiles in Papyrus



