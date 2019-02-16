# UML-to-Entity Services Toolkit: UML Mapping

Here we discuss how the transform maps UML to Entity Services.
- The transform maps a UML model to an Entity Services model. The model name is mapped to the entity model's title. The model's documentation comment is mapped to the entity model's description. If your model is stereotyped as esModel, the version and baseUri tags of that stereotype are mapped to the entity model's baseUri and version.
- In UML, a model can contain packages. A class can belong directly to the model or it can belong to a package within the model. In mapping UML to ES, this toolkit treats all classes as belonging to the model. It ignores the internal package structure of the model. Hence, never stereotype at the package level! Always stereotype at the model level! Model stereotypes: esModel (which defines the model's base URI and version); xmlNamespace; xImplHints; and semPrefixes. Always define these at the model level! Also, the toolkit requires class names to be unique over the whole model. Although UML allows you to define classes with the same name belonging to different packages, the toolkit will flag this as an error; it will not attempt to map a class whose name is the same as another class it has already mapped.
- The transform maps a UML class to an Entity Services entity. The class name is mapped to the entity name. The class's documenation comment is mapped to the entity's description. If the class is stereotyped as xmlNamespace, the prefix and url tags of that stereotype are mapped to the entity's prefix and uri. If the class is not stereotyped as xmlNamespace but the model is, then the transform maps the model's xmlNamespace to each entity's prefix and uri.
- The Transform maps a UML class attribute to an Entity Services property. The name of the attribute is mapped to the entity property's name. The model's documentation comment is mapped to the entity property's description.
- In a UML aggregation (whether shared or composition) relationship between two classes A and B, each is an attribute. The transform maps the attribute to a property in Entity Services. The type of that property is by default an **internal reference** to the other entity; A's property is a reference to B, and vice versa. If you stereotype that attribute as FK, the transform maps its type to the primitive type of the PK attribute of the corresponding entity; A's property type is that of B's primary key property, and vice versa.
- In a UML binary association relationship between two classes where there is **no association class**, the transform mapping logic is the same as with aggregation.
- In a UML binary association relationship between two classes A and B where there is an association class C, the transform maps as follows:
	* It maps the association class C to an entity.
	* In classes A and B, it maps the type of the attribute that refers to the association as an **internal reference to C**. 
	* It adds properties to C referencing A and B. The names of these attributes are refA and refB. The types of these attributes are by default **internal references** to A and B, respectively. If class A's attribute to the association is stereotyped as FK, then the transform sets the refB property type as the primary key of B. Similarly, class B's attribute to the association is stereotyped as FK, then the transform sets the refA property type as the primary key of A. It's subtle, I know. Take a look at the movie example's Role association for a concrete example. 
- The transform does not support ternary associations or any n-ary association beyond binary.
- In a UML generalization relationship, in which one class B inherits from class A, the transform ensures that entity B inherits the attributes and stereotypes of entity A. The transform also allows subclass B to override and refine class A. For example, it can change the type of an attribute, change the primary key, or add more collections or SEM types to those it inherits. 
- In the UML model, we can exclude a class or attribute. In this case, it is NOT added to the entity services descriptor. The movies example demonstrates one reason for doing this: excluding the superclass (MovieContributor), but keeping the subclasses (PersonContributor, CompanyContributor) in a generalization relationship.
- Type resolution. We have discussed how the transform maps type in the case of association and aggregation relationships. Generally the transform's type resolution sequence for an attribute is the following:
	* If the attribute has the mlType tag of the esProperty stereotype set, the transform sets the property's type as that value.
	* If the attribute has the externalRef tag of the esProperty stereotype set, the transform sets the property's type as an external reference with that value.
	* If the attribute refers to another class (via association or aggregation), the transform uses the logic described above to assign the property's Entity Services type.
	* If the attribute has a standard UML primitive type, the transform maps that type to the 
- Cardinality: 
	* If in the UML model an attribute has a multiplicity of 1, the transform designates it as a required property in the entity definition.
	* If in the UML model an attribute has a multiplicity of 0..* or 1..*, the transform designates the property as an array in the entity definition.
- Range indexes and PK: If one attribute in the UML class is stereotyped PK, the transform designates it the primary key of the entity. If an attribute in the UML class is stereotyped rangeIndex, the transform designates it as one of the indexes for the entity. 

## Splitting A Large Model Into Smaller Pieces
A real-world data model consists of many classes. It is sometimes necessary to split these classes into several "sub models". There are several reasons for doing so:

- Too many classes in a model makes the model hard to understand. The overall model is easier to comprehend when split into smaller sub models.
- If there are multiple data architects working on the overall model, splitting the model into multiple files enables developers to work in parallel. 

There are several ways to attack this:

### 1. One Model, Several Packages and Diagrams

Use just one model, but split it into several packages. Dividing into several packages addresses makes the model easier to comprehend. Additionally, assuming the project uses a source code control with advanced branch and merge capabilities, like Git, this approach allows different designers to work on different packages in parallel. Remember also that UML the class diagram is just a view of the classes. I can create several diagrams depicting different aspects of the model. Put simply, a single model doesn't mean a single large diagram!

Pros: 

- Simple, understandable
- Allows parallel design. [The model is an XMI structure whose packages are separate, independent branches of the XML tree. It is straightforward to manage parallel development of the model when it resides in a Git repo. See <https://eclipsesource.com/blogs/2015/04/13/collaborative-modeling-with-papyrus-emf-compare-and-egit/>.]
- If you started with separate models but want to merge them into one model, most UML tools make this task easy to accomplish. MagicDraw's Import From option allows you to import one model into another. Papyrus allows you to reintegrate a submodel into a model. 

Cons: 
- Toolkit ignores your internal package structure. Ensure you stereotype at the model, not the package, level. Ensure your class names are distinct across the whole model.

### 2. Several Models Linked by UML Tool

Build several models linked by the UML tool. Suppose model M contains class C. In model N, I want class D to contain an attribute that refers to class C. UML tools support this by allowing package import:

- In model M, I ensure class C belongs to a package. 
- In model N, I import the package from model M that contains class C. I can now deal with class C as if it were part of model N! In particular, I can draw an aggregation relationship between class D and class C! D contains C, even though D and C come from different models!

Pros:

- UML tools support and encourage this approach. In MagicDraw, it's the Use Project option. In Papyrus, it's the ability to import a package in Model Explorer.
- The UML standard allows it. 
- Flexibility of mix and match.
- Developers can work in parallel

Cons:

- The old big modeling approach. Try to avoid the need for this. Smaller models!
- Complex to deploy. Is each UML model a separate ES model, or are all UML models merged to one ES model? Hard to sort out namespaces, dependencies. 

### 3. Several Models Linked by External Reference

Build several models, but loosely couple them by having classes in different models refer to each other by named external reference. Suppose model M (whose base URI is "http://modelM") has class C. In model N, I want class D to contain an attribute, A, whose type is class C. In approach 2, we would use the tool's import capability to import into model N the package in model M that contains class C. In approach 3, we forgo the the import and stereotype attribute A as being an external reference to C. To do this we stereotype attribute A as esProperty. Within this stereotype, we give the value of the externalRef tag as "http://modelM/C". [See <http://docs.marklogic.com/guide/entity-services/models#id_15972> for more on how external references are defined in Entity Services.]

Pros:

- Simple to deploy to ML
- Developers can work in parallel with unlimited flexibility.

Cons:

- Incorrect, broken references are possible. The UML tool cannot detect these.
- Can be used containment only. Does not work with UML class relationship types. That is, D can contain an attribute referring to C. D cannot link to C using association or aggregration. D cannot inherit from C using a generalization relationship.
- Does not leverage the tool's package import capability to mix and match classes from different models.
- Your application must decide how to process this reference. 

### Recommendation

We recommended the first approach. The first approach is demonstrated in the mega tutorial: [../tutorials/runningRaceStartToFinish.md](../tutorials/runningRaceStartToFinish.md) 

The toolkit supports approaches 1 and 2. The toolkit currently does not support approach 2.
