gradle -i setup mlDeploy
gradle -i -b uml2es.gradle uDeployModel

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=A -PdataFormat=xml -PpluginFormat=xqy -PcontentMode=es -Poverwrite=true -PmoduleName=Axx

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=A -PdataFormat=xml -PpluginFormat=sjs -PcontentMode=es -Poverwrite=true -PmoduleName=Ajx

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=A -PdataFormat=json -PpluginFormat=sjs -PcontentMode=es -Poverwrite=true -PmoduleName=Ajj

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=A -PdataFormat=json -PpluginFormat=xqy -PcontentMode=es -Poverwrite=true -PmoduleName=Axj

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=B -PdataFormat=xml -PpluginFormat=xqy -PcontentMode=es -Poverwrite=true -PmoduleName=Bxx

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=B -PdataFormat=xml -PpluginFormat=sjs -PcontentMode=es -Poverwrite=true -PmoduleName=Bjx

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=B -PdataFormat=json -PpluginFormat=sjs -PcontentMode=es -Poverwrite=true -PmoduleName=Bjj

gradle -b uml2es.gradle -i uCreateConversionModule -PentityName=B -PdataFormat=json -PpluginFormat=xqy -PcontentMode=es -Poverwrite=true -PmoduleName=Bxj


