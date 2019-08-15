# How To Declarative Mapper (MarkLogic Internal)

## Declarative Mapper IDE

- In your home directory, create a file called dmf-ide.json. On my Mac, this file is /Users/mhavey.dmf-ide.json. Make the content of this file the following:

```
{
  "ui": {
    "projects": [
    ],
    "current": 0
  },
  "marklogic": {
    "username": "admin",
    "password": "admin",
    "hostname": "localhost",
    "port": "14401",
    "protocol": "http",
    "paths": {
      "dmfTest": "/LATEST/resources/evalSampleDHF-ft",
      "dmfSample": "/LATEST/resources/saveSampleDataSvc"
    },
    "useRestServices": true
   }
}
```

Modify username, password, hostname, port and protocol if necessary. Compare with values from your gradle.properties file. 14401 is the default port for the xmi2es-tutorials-dmHub-FINAL app server.

- Get a local clone of the DMF IDE tool at https://project.marklogic.com/repo/scm/~ckelly/dm-framework-gui.git
- Navigate to dm-framework-gui directory
- Delete the .npmrc file
- Run npm install
- Run below commands in different terminals
	* npm run watch-dist (Wait until green tick mark completes in start webpack-watch)
	* npm run desktop

## Declarative Mapper Engine

- Get a local clone of the DM engine tool at https://project.marklogic.com/repo/scm/int/declarative-mapper.git. Switch to the json-sc branch!
