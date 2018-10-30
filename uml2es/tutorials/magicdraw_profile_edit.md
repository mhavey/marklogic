# How To Edit the UML-to-Entity Services Profile in MagicDraw

## Intro
This tutorial shows how to edit the UML-to-Entity Services profile in MagicDraw.

You probably don't need to modify the profile, unless you need to add new stereotypes. Before you do this, bear in mind:
- The profile has an xImplHint stereotype in which you can embellish your model with a limitless set of general hints.  Will xImplHint suit your purpose, or do you still need to add your own stereotypes?
- If you add stereotypes, you will also need to modify the code of the transform module to process that stereotype ... unless the stereotype is merely for diagrammatic purposes.

We recommend you open an Issue with your enhancement request rather than editing the profile yourself.

## How to edit the profile:

### Open the profile

Open MagicDraw. Close any existing projects: File | Close All Projects

Open the profile by selecting File | Open Project from the menu. Select the following file from your local clone of this repo: uml2es/umlProfile/magicdraw/MLProfile.xml. Click Open. The profile opens in MagicDraw. It should look like this:

![Profile open in MagicDraw](md_profile_afteropen.png)

If it opens full-screen, right-click on the diagram's title bar ("MarkLogicEntityServiceProfile") and deselect Show Full Tabs On Screen.

![Profile open full-screen in MagicDraw](md_profile_fullscreen.png)

### Editing the profile

In the left panel, select Containment. Expand MarkLogic Entity Services Profile. You see the stereotype structure for this profile. Notice it is divided into three subpackages: es, sem, xes.

![Containment panel in MagicDraw](md_profile_containment.png)

Let's add a new stereotype to the sem subpackage. First, right-click on sem and select Create Element.

![Containment panel in MagicDraw - new Element](md_profile_newelem.png)

In the New Element popup, select Stereotype.

![Containment panel in MagicDraw - new Element - Stereotype](md_profile_newelem_stereotype.png)

MagicDraw creates a new stereotype called unnamed1. 

![Containment panel in MagicDraw - new Element - Stereotype - unnamed](md_profile_newelem_unnamed.png)

You can name it. Just type in your name. Here we name it semYippee.

![Containment panel in MagicDraw - new Element - Stereotype - named](md_profile_newelem_named.png)

The stereotype exists, but you need to drag it from the Containment panel into the diagram to the right. Here we drag it just above semIRI.

![Containment panel in MagicDraw - new Element - Stereotype - in diagram](md_profile_newelem_canvas.png)

If you want to add tagged values to your new stereotype, double-click on your new stereotype in the diagram. In the Specification dialog, select Tag Definitions. 

![Containment panel in MagicDraw - new Element - Stereotype - spec](md_profile_newelem_spec.png)

### Saving the profile

When you are done editing, save the profile by selecting File | Save Project from the menu. MagicDraw saves it to uml2es/umlProfile/magicdraw/MLProfile.xml.
