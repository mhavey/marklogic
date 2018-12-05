# How To Edit the UML-to-Entity Services Profile in Papyrus

## Intro
In the UML-To-Entity Services toolkit, we use MagicDraw, not Papyrus, to design the UML profile for MarkLogic. Both of these tools have excellent profile modelling capabilities, but we have gone with MagicDraw. 

It is nonetheless possible to edit the profile in Papyrus. There are two ways to do this, but only one of these is feasible in the current version of the toolkit.

The first way is to use Eclipse Modeling Framework (EMF) UML editor. This editor is bundled with Papyrus, so if you installed Papyrus into your Eclipse, you already have the EMF UML editor. The EMF UML editor, frankly, is intended for technical users. It doesn't offer the intuitive drag-onto-canvas method of MagicDraw. Still, with some guidance this first way is a workable approach. This tutorial will guide you through it. 

The second way is to use the full Papyrus profile diagram editor to graphically build the profile. This tool is as user-friendly as MagicDraw for building new profiles, but cumbersome for editing a profile that was designed in another tool. For toolkit development, we'll use this approach only if we decide to switch from MagicDraw to Papyrus to maintain the profile. We might make that switch some day, but for now our profile tool is MagicDraw. We won't attempt the second way.

## How to edit the profile:

### Import Eclipse Project.

Open Eclipse. Import into your workspace the ML profile Eclipse project as follows. From the File menu select Import | General | Existing Projects Into Workspace. 

![Import project](pap_profile2_import.png)

Click Next. In the Import Projects dialog, make sure "Select root directory" is selected. Use the Browse button to locate the ML profile Eclipse project in your local copy of the toolkit. It can be found in [uml2es/umlProfile/eclipse/MLProfileProject](../umlProfile/eclipse//MLProfileProject). 

![Import project - profile project](pap_profile2_import2.png)

Click Finish. You should now see the project in the Project Explorer pane in the upper-right corner of Eclipse.

![Imported project - profile project](pap_profile2_import_done.png)

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

In the dialog click OK. Done!!

### Saving the profile

When you are done editing, save the profile by selecting File | Save All from the menu. You can use this modified profile in your Papyrus models.

## Useful Reading
- <https://wiki.eclipse.org/MDT/UML2/Introduction_to_UML2_Profiles> - useful guide to designing profiles in the EMF UML editor.
- <https://www.eclipse.org/papyrus/resources/PapyrusUserGuideSeries_AboutUMLProfile_v1.0.0_d20120606.pdf> - useful guide to designing profiles in Papyrus



