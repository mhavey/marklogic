This part of the toolkit has two MarkLogic profiles for UML:

- [magicdraw/MLProfile.xml](magicdraw/MLProfile.xml): A MagicDraw project for designing the profile.
- [MLProfile.xml](MLProfile.xml): An standard XMI profile meant for any UML tool that is compliant with the toolkit. This profile is not directly constructed but is derived from the MagicDraw profile.

Also notice [eclipse/MLProfileProject](eclipse/MLProfileProject). This is an Eclipse project that contains the standard profile [MLProfile.xml](MLProfile.xml); in the Eclipse project, the profile is named [eclipse/MLProfileProject/MLProfile.profile.uml](eclipse/MLProfileProject/MLProfile.profile.uml), a name EMF and Papyrus prefer to MLProfile.xml. Use this project when developing Papyrus examples; import it into the same workspace where you are building your model. 

UNLESS YOU ARE DEVELOPING THE TOOLKIT, YOU SHOULD NOT NEED TO EDIT THE PROFILE. 