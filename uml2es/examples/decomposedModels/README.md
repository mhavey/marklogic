- This is the ability to decompose a big model into smaller models. It's modularity, that idea. The example we show here is putting common classes for Contacts into a library model. We then build an HR model that uses classes from the Contact lib.
- Aspects of mapping to ES:
-> I need a way to specify an "include path" - where can I find dependent models?
-> In HR model, do I include contact classses or link them as external references? I think the former is better because I think DHF mapper will work better with it. Aside from DHF, external references are a bit harder to manage. 
	* Still, UML2ES should allow both

- proposed flags on deploy:
embedOrLink=embed|link
dependentModelFiles=comma-sep list of dependent models; or else I just ask you deploy dependent models first...
	* one thought on this; the tools link one model to another by GUID. So if HR model refers to Address class, it refers to the GUID of Address class in the contact lib model. Therefore, need to keep these GUIDs handy to check the reference 

- MagicDraw approach: 
	* Design contacts lib model. Ensure the classes (Address, etc) are in a package. Designate that package as Shared!
	* Design main model for HR. Incorporate the contacts lib by doing "Use Model" option. Use "read-only" option: we want to use the classes but not modify them. You can now drag the contact lib classes into your diagram!
	* See documentation: https://docs.nomagic.com/display/MD185/Using+other+projects+in+a+project
- include images D5*MD.png

- Papyrus approach: 
	* Design contacts lib model as its own Papyrus project.
	* Design main HR model as its own Papyrus project. Ensure you have Model Explorer view open. In Model Explorer, right-click on the HR model and select Import. From here import the contact lib model. You can now drag contact lib model classes into main model diagram!
	* See useful video: https://www.youtube.com/watch?v=l7c1HORYyX8
- include images D5*Pap.png

- Remember to udpate build doc. New flags on deploy.
- Remember to update umlmapping doc. We now support multiple models.
