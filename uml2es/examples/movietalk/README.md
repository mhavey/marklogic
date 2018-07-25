# MovieTalk Example

## Intro
MovieTalk is an application that allows users to submit posts about movies and actors. Our UML model is a logical data model that describes the main entities -- movies, contributors, users, posts -- and their relationships. The model is merely logical. When the application team implemented MovieTalk, they referred to the logical model but arranged the data in MarkLogic somewhat differently. There is therefore a gap between the logical model and its physical implementation. Suppose, for fun, that the application team has departed but the stakeholders wish to know what the physical model looks like and how it maps back to the logical model. We would prefer not to read their code. In this example we use a data discovery approach to determine the mapping.

## Models
Here is the model, designed in Papyrus:

![MovieTalk](../umlModels/MovieTalk.png)

The Eclipse project for Papyrus is in data/MovieTalkPapyrus.

## How to run:

Our project uses gradle. Before running, view the settings in gradle.properties. Create a file called gradle-local.properties and in this file override any of the properties from gradle.properties.

Here are the steps to setup.

### Setup DB
Setup new DB. Will use basic DB config with no indexes. Will bring in XMI2ES transform to our modules.

Run the following:

gradle -PenvironmentName=local -i includeXMI2ESTransform mlDeploy

### Load the Logical Model

We want the logical model in MarkLogic as an Entity Services model. That might sound strange. It's a logical model; why deploy it? We will use it later for a novel purpose: to help build our physical-logical mapping. The logical model we designed in Papyrus lacks enough detail to be used physically anyway. Most of its attributes do not even have a data type. When we deploy the model to MarkLogic as an Entity Services, we will specify the "lax" option to our UML/ES transformation tool. The "lax" option instructs the transformation tool to tolerate the logical model's lack of detail and make a best effort to produce an Entity Services model.  
To deploy the logical model, run the following:

gradle -PenvironmentName=local -i loadXMI

### Load Physical

Now let's setup our MovieTalk database with physical data: 

gradle -PenvironmentName=local -i loadPhysical

## Check Model Differences
In Query Console, import XMI2ESMovieTalk.xml workspace. The tab "Discover" is where we map physical back to logical. 

