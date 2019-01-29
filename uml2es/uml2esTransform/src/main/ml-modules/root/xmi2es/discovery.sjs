/*
A poor man's data discovery tool that is meant to provide discovery comments for the cookie cutter.
A few shortcomings:
- Alpha quality code, lightly tested
- Doesn't check for namespaced elements.
- Pretty basic fuzzy search. Nice start. Go further. 
*/

const sem = require("/MarkLogic/semantics.xqy");
const json = require('/MarkLogic/json/json.xqy');
const spell = require("/MarkLogic/spell");

declareUpdate();

const COLLECTIONS_SPELL_URI = "/xmi2es/dict/collections.xml";
const ENTITY_SPELL_PREFIX = "/xmi2es/dict/entity/";
const DISCOVERY_LIMIT = 25;
const MAX_DOCS_FOR_PHYSICAL = 40
const COLLECTION_EXCLUSIONS = ["cookieCutter", "http://marklogic.com/entity-services/models", "xmi2es", "loneDef"];
const ELEM_EXCLUSIONS = ["envelope", "headers", "instance", "triples", "triple", "subject", "object", "predicate", "attachments"];
const COLLECTION_EXCLUSION_QUERY = cts.collectionQuery([COLLECTION_EXCLUSIONS]);

const SEM_HAS_ATTRIBUTE = sem.iri("http://marklogic.com/xmi2es/discovery/hasAttribute");
const SEM_HAS_PREDICATE = sem.iri("http://marklogic.com/xmi2es/discovery/hasPredicate");
const SEM_ATTRIBUTE_MATCHES_MODEL = sem.iri("http://marklogic.com/xmi2es/discovery/attributeMatchesModel");
const SEM_PREDICATE_MATCHES_MODEL = sem.iri("http://marklogic.com/xmi2es/discovery/predicateMatchesModel");
const SEM_MATCH_ENTITY = sem.iri("http://marklogic.com/xmi2es/discovery/match/entity");
const SEM_MATCH_MODEL = sem.iri("http://marklogic.com/xmi2es/discovery/match/attribute");
const SEM_MATCH_PHYSICAL = sem.iri("http://marklogic.com/xmi2es/discovery/match/physical");

// create dictionary; this is basically spell.insert in its own TX; i need it NOW, so create it in its own TX
function makeDictionary(name, values) {
  xdmp.eval('const spell = require("/MarkLogic/spell"); spell.insert(name, values)', {name: name, values: values}, {
    update: "true",
    isolation: "different-transaction"
  });
}

// Add a to array s.
// a is either a string or an array of strings
// Return the array that results with all duplicates removed.
function addToSet(s, a) {
  if (Array.isArray(a)) s = s.concat(a);
  else s.push(a);
  s = s.map(str => (""+str).trim());
  return Array.from(new Set(s));
}

// Return obj[elem] as an array. It obj[elem] is undefined, return zero-length array. 
// If obj[elem] is a single value, return as array of length one.
function makeArray(obj) {
  if (!obj) return [];
  if (Array.isArray(obj)) return obj;
  return [obj];
}

// break searchTerm into words
function wordsFromString(searchTerm) {
  var words = [];
  cts.tokenize(searchTerm).toArray().forEach(function (word) {
    if ( fn.deepEqual(sc.name(sc.type(word)), fn.QName("http://marklogic.com/cts", "word"))) {
      if (words.indexOf(word) < 0) words.push(word.valueOf());
    }
  });
  return words;
}

// Run query in cmd against input.discoveryDB. Substitute vars. Return result as array.
function queryDiscovery(input, cmd, vars) {
  if (!input.discoveryDB) input.discoveryDB = xdmp.databaseName(xdmp.database());
  return xdmp.eval(cmd, vars, {
    "database": xdmp.database(input.discoveryDB),
    "update": "false",
    "isolation": "different-transaction"
    }).toArray();
}

// Run query in cmd against input.discoveryDB. Substitute vars. Return result as array.
// Along the way, accumulate collections or URIs returned.
function queryDiscoveryTrack(input, cmd, vars, entityReport, isColl) {
  var result = queryDiscovery(input, cmd, vars);
  if (isColl == true) entityReport.allCollections= addToSet(entityReport.allCollections, result); 
  else entityReport.allURIs = addToSet(entityReport.allURIs, result); 
  return result;
}

// Check for documents similar to my class
function discoverClass(input, overallReport, entityName) {

  var entity = input.mappingObj.entities[entityName]; 
  entity.discoverySampleData = makeArray(entity.discoverySampleData);
  entity.discoveryCollections =makeArray(entity.discoveryCollections);
  entity.discoveryURIPatterns =makeArray(entity.discoveryURIPatterns);
  var report = {
    allCollections :[],
    allURIs : [],
    collectionDiscovery: {byName: [], withData: [], withElem: [] },
    uriDiscovery: {
      className : {byName: [], withData: [], withElem: []},
      dataInName: {byName: [], withData: [], withElem: [] },
      samplePattern: {byName: [], withData: [], withElem: []},
      withData: [],
      withElem: []
    },
    physicalAttributes: [],
    physicalPredicates: [],
    physicalAttrib2DocumentMap: []
  };
  overallReport.entities[entityName] = report;

  // 
  // Step 1 - Prepare data queries
  // 
  var dataChecks = [];
  var sampleData = entity.discoverySampleData;
  var attribSampleData = entity.attributes;
  for (var a in entity.attributes) {
    var attrib = entity.attributes[a];
    attrib.discoverySampleData = makeArray(attrib.discoverySampleData);
    sampleData = sampleData.concat(attrib.discoverySampleData);
  }
  for (var i = 0; i < sampleData.length; i++) {
    if (sampleData[i] == null) continue;
    var sdi =sampleData[i].trim();
    if (sdi == "") continue;
    dataChecks.push(cts.wordQuery(sdi, ["case-insensitive"]));
    dataChecks.push(cts.wordQuery("* *" + sdi + "* *", ["case-insensitive"]));
  }
  var sampleQuery = dataChecks.length > 0 ? cts.orQuery(dataChecks) : cts.trueQuery();
  var dataQuery = cts.andNotQuery(sampleQuery, COLLECTION_EXCLUSION_QUERY);
  var elemQuery = cts.andNotQuery(cts.elementQuery(xs.QName(entityName), cts.andQuery([])), COLLECTION_EXCLUSION_QUERY);
  xdmp.log("discoverClass *" + entityName + "* has dataQuery " + dataQuery, "info");
  xdmp.log("discoverClass *" + entityName + "* has elemQuery " + elemQuery, "info");

  var evars = {
    "baseQuery": cts.notQuery(COLLECTION_EXCLUSION_QUERY),
    "dataQuery": dataQuery,
    "elemQuery": elemQuery,
    "className": entityName
  };

  // 
  // 2. collection discovery
  // 
  var collCandidates = [entityName];
  collCandidates = addToSet(collCandidates, entity.discoveryCollections);
  collCandidates = collCandidates.map(s => (""+s).toLowerCase());
  var numInitial = collCandidates.length;
  for (var i = 0; i < numInitial; i++) {
    // add spell-corrected ones too
    addToSet(collCandidates, spell.suggest(COLLECTIONS_SPELL_URI, collCandidates[i]).toArray());
  }
  for (var i = 0; i < collCandidates.length; i++) {
    evars.candidate = collCandidates[i];
    report.collectionDiscovery.byName = addToSet(report.collectionDiscovery.byName, queryDiscoveryTrack(input, 
      'cts.collectionMatch("*" + candidate + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], baseQuery)',
      evars, report, true));
    report.collectionDiscovery.withData = addToSet(report.collectionDiscovery.withData, queryDiscoveryTrack(input, 
      'cts.collectionMatch("*" + candidate + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
      evars, report, true));
    report.collectionDiscovery.withElem = addToSet(report.collectionDiscovery.withElem, queryDiscoveryTrack(input, 
      'cts.collectionMatch("*" + candidate + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)', 
      evars, report, true));
  }

  //
  // 3. directory/URI discovery
  //
  report.uriDiscovery.className.byName = addToSet(report.uriDiscovery.className.byName, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], baseQuery)', 
    evars, report, false));
  report.uriDiscovery.className.withData = addToSet(report.uriDiscovery.className.withData, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)', 
    evars, report, false));
  report.uriDiscovery.className.withElem = addToSet(report.uriDiscovery.className.withElem, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)', 
    evars, report, false));
  for (var i = 0; i < entity.discoverySampleData; i++) {
    evars.sampleDataWords = wordFromString(entity.discoverySampleData[i]).join("*");
    report.uriDiscovery.dataInName.byName = addToSet(report.uriDiscovery.dataInName.byName, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + className + "*" + sampleDataWords + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], baseQuery)',
      evars, report, false));
    report.uriDiscovery.dataInName.byName = addToSet(report.uriDiscovery.dataInName.byName, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + sampleDataWords + "*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], baseQuery)',
      evars, report, false));
    report.uriDiscovery.dataInName.withData = addToSet(report.uriDiscovery.dataInName.withData, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + className + "*" + sampleDataWords + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
      evars, report, false));
    report.uriDiscovery.dataInName.withData = addToSet(report.uriDiscovery.dataInName.withData, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + sampleDataWords + "*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
      evars, report, false));
    report.uriDiscovery.dataInName.withElem = addToSet(report.uriDiscovery.dataInName.withElem, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + className + "*" + sampleDataWords + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)',
      evars, report, false));
    report.uriDiscovery.dataInName.withElem = addToSet(report.uriDiscovery.dataInName.withElem, queryDiscoveryTrack(input, 
      'cts.uriMatch("*" + sampleDataWords + "*" + className + "*", ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)',
      evars, report, false));
  };
  for (var i = 0; i < entity.discoveryURIPatterns; i++) {
    evars.pattern = entity.discoveryURIPatterns[i];
    report.uriDiscovery.samplePattern.byName = addToSet(report.uriDiscovery.samplePattern.byName, queryDiscoveryTrack(input, 
      'cts.uriMatch(pattern, ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], baseQuery)',
      evars, report, false));
    report.uriDiscovery.samplePattern.withData = addToSet(report.uriDiscovery.samplePattern.withData, queryDiscoveryTrack(input, 
      'cts.uriMatch(pattern, ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], dataQuery)',
      evars, report, false));
    report.uriDiscovery.samplePattern.withElem = addToSet(report.uriDiscovery.samplePattern.withElem, queryDiscoveryTrack(input, 
      'cts.uriMatch(pattern, ["case-insensitive", "limit=' + DISCOVERY_LIMIT + '"], elemQuery)',
      evars, report, false));
  };

  //
  // 4. look for any docs that match the data query
  //
  report.uriDiscovery.withData = addToSet(report.uriDiscovery.withData, queryDiscoveryTrack(input, 
    'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], dataQuery)', 
    evars, report, false));
  report.uriDiscovery.withElem = addToSet(report.uriDiscovery.withElem, queryDiscoveryTrack(input, 
    'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], elemQuery)', 
    evars, report, false));
  // should I look in semantic objects too?

  // 
  // 5. Get all the physical attributes and predicates in the matched set
  // 
  var paQuery = cts.orQuery([cts.collectionQuery(report.allCollections), cts.documentQuery(report.allURIs)]);
  var result = queryDiscovery(input, 
    'fn.subsequence(cts.search(query, ["unfiltered", "score-random"]), 1, ' + MAX_DOCS_FOR_PHYSICAL + ')', {query:paQuery});
  for (var doc of result) {
    var uri = xdmp.nodeUri(doc);
    var attribs = doc.xpath("//*/node-name()").toArray();
    var preds = doc.xpath("//*:triple/*:predicate").toArray();
    for (var i = 0; i < attribs.length; i++) {
      report.physicalAttributes = addToSet(report.physicalAttributes, fn.string(attribs[i]));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        sem.iri(uri), SEM_HAS_ATTRIBUTE, fn.string(attribs[i])));
    }
    for (var i = 0; i < preds.length; i++) {
      report.physicalPredicates = addToSet(report.physicalPredicates, fn.string(preds[i]));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        sem.iri(uri), SEM_HAS_PREDICATE, fn.string(preds[i])));
    }
  }
  var attributeDictionary = ENTITY_SPELL_PREFIX + entityName + ".xml";
  makeDictionary(attributeDictionary, spell.makeDictionary(report.physicalAttributes.map(s => (""+s).toLowerCase()), "element"));

  //
  // 6. Compare physical attributes to class definition (... specifically to the attribute breakdown from the mapping sheet)
  // 
  for (var attributeIdx in entity.attributes) {
    var attributeName = ""+attributeIdx;
    var attribute = entity.attributes[attributeName];
    attribute.discoveryAKA = makeArray(attribute.discoveryAKA);
    var possibleAttributeNames = [attributeName];
    possibleAttributeNames = addToSet(possibleAttributeNames, attribute.discoveryAKA);
    var baseLen = possibleAttributeNames.length;
    for (var i = 0 ; i < baseLen; i++) {
      // if the name is dot-notation, let's look at just the first token; keep this discovery simple for now
      // e.g., addresses.line1, look at addresses only
      var splits = possibleAttributeNames[i].split(".");
      if (splits.length && splits.length > 1) possibleAttributeNames[i] = splits[0];
      possibleAttributeNames = possibleAttributeNames.concat(
        spell.suggest(attributeDictionary, possibleAttributeNames[i]).toArray());
    }
    var possibleValues = possibleAttributeNames.map(s => '"' + s + '"').join(' ');
    var sparql = `
select * where { ?doc <http://marklogic.com/xmi2es/discovery/hasAttribute> ?physical .
VALUES ?physical { ${possibleValues} }
}`;

    var res = sem.sparql(sparql, {}, [], sem.inMemoryStore(report.physicalAttrib2DocumentMap));
    for (var r of res) {
      var bnode = sem.bnode();
      report.physicalAttrib2DocumentMap.push(sem.triple(
        r.doc, SEM_ATTRIBUTE_MATCHES_MODEL, bnode));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        bnode, SEM_MATCH_ENTITY, entityName));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        bnode, SEM_MATCH_MODEL, attributeName));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        bnode, SEM_MATCH_PHYSICAL, r.physical));
    }
    possibleValues = possibleAttributeNames.map(s => '"' + s + '"').join('|');
    sparql = `
select * where {
  ?s ?p ?o . 
  FILTER (regex(?s, '(${possibleValues})'))
}`;
    res = sem.sparql(sparql, {}, [], sem.inMemoryStore(report.physicalAttrib2DocumentMap));
    for (var r of res) {
      var bnode = sem.bnode();
      report.physicalAttrib2DocumentMap.push(sem.triple(
        r.doc, SEM_PREDICATE_MATCHES_MODEL, bnode));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        bnode, SEM_MATCH_ENTITY, entityName));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        bnode, SEM_MATCH_MODEL, attributeName));
      report.physicalAttrib2DocumentMap.push(sem.triple(
        bnode, SEM_MATCH_PHYSICAL, r.physical));
    }
  }  
}

// THIS FUNCTION IS FOR FUTURE. LOOK DOWN ANOTHER RABBIT HOLE. IF WE COULDNT RESOLVE THE ATTRIBUTE IN THE CLASS, LOOK FOR IT 
// IN DOCUMENTS BY ITSELF. IT'S UNLIKELY WE MISSED IT ANYWAY.
function discoverAttribute(input, entityName, attributeName) {
/*
  // 
  // Step 1 - Come up with a list of attribute names to search for: given name, AKA, normal names, split the x.y.z form
  // 
  var attribNames = [attributeName].concat(attribute.discoveryAKA);
  var attribPathNames = [];
  var normalNames = [];
  for (var i = 0; i < attribNames.length; i++) {
    normalNames.push(normalName(attribNames[i]));
    var toks = attribNames[i].split(".");
    if (toks.length > 1) {
      attribPathNames.push(toks.map(s => normalName(s)));      
    }
  }
  attribNames = attribNames.concat(normalNames);

  // 
  // Step 2 - Prepare data queries
  // 
  var dataChecks = [];
  var sampleData = entity.discoverySampleData.concat(entity.attributes[attributeName].discoverySampleData);
  for (var i = 0; i < sampleData.length; i++) {
    if (sampleData[i] == null) continue;
    var sdi =sampleData[i].trim();
    if (sdi == "") continue;
    dataChecks.push(cts.wordQuery(sdi, ["case-insensitive"]));
    dataChecks.push(cts.wordQuery("* *" + sdi + "* *", ["case-insensitive"]));
  }
  var dataQuery = dataChecks.length > 0 ? cts.orQuery(dataChecks) : cts.trueQuery();
  xdmp.log("discoverAttribute *" + attributeName + "* has dataQuery " + dataQuery, "info");

  // 
  // 3. element query
  // TODO - make this work with namespace
  // 
  var evars = {
    "className": entityName,
    "attributeName": attributeName
  };
  var simpleElems = cts.elementQuery(attribNames.map(s => xs.QName(s)), cts.trueQuery());
  var pathChecks = [];
  if(attribPathNames.length > 0) {
    for (var i = 0; i < attribPathNames.length; i++) {
      pathChecks.push(cts.andQuery(attribPathNames[i].map(s => cts.elementQuery(xs.QName(s), cts.trueQuery())).toArray()));
    }
  }
  evars.elemQuery = cts.andNotQuery(
    cts.orQuery(pathChecks.concat([simpleElems])), 
    COLLECTION_EXCLUSION_QUERY);
  evars.elemDataQuery = cts.andNotQuery(
    cts.andQuery([
      dataQuery,
      cts.orQuery(pathChecks.concat([simpleElems]))
    ]),
    COLLECTION_EXCLUSION_QUERY);
  evars.elemCandidateQuery = cts.andNotQuery(
    cts.andQuery([
      cts.orQuery([
        cts.documentQuery(input.discoveryWorkpad.entities[entityName].uris),
        cts.collectionQuery(input.discoveryWorkpad.entities[entityName].collections)
      ]),
      cts.orQuery(pathChecks.concat([simpleElems]))]), 
    COLLECTION_EXCLUSION_QUERY);
  evars.elemCandidateDataQuery = cts.andNotQuery(
    cts.andQuery([
      dataQuery,
      cts.orQuery([
        cts.documentQuery(input.discoveryWorkpad.entities[entityName].uris),
        cts.collectionQuery(input.discoveryWorkpad.entities[entityName].collections)
      ]),
      cts.orQuery(pathChecks.concat([simpleElems])) 
    ]),
    COLLECTION_EXCLUSION_QUERY);
  evars.predQuery = cts.orQuery([
    cts.elementValueQuery(xs.QName("predicate"), attribNames.map(s => "*" +s + "*"), ["case-insensitive"]),
    cts.elementValueQuery(fn.QName("http://marklogic.com/semantics", "predicate"), attribNames.map(s => "*" +s + "*"), ["case-insensitive"])
  ]);  

  xdmp.log("Queries " + JSON.stringify(evars));

  report["Documents Containing Attrib"] = {
    "By Name": Array.from(new Set(queryDiscovery(input, 'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], elemQuery)', evars))),
    "Containing Sample Data": Array.from(new Set(queryDiscovery(input, 'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], elemDataQuery)', evars))),
    "By Name In Candidate Collections/URIs": Array.from(new Set(queryDiscovery(input, 'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], elemCandidateQuery)', evars))),
    "Containing Sample Data in Candidate Collections/URIs": Array.from(new Set(queryDiscovery(input, 'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], elemCandidateDataQuery)', evars))),
    "By Predicate": Array.from(new Set(queryDiscovery(input, 'cts.uris(null, ["limit=' + DISCOVERY_LIMIT + '"], predQuery)', evars)))
  };

  //
  // 4. Physical attribute match
  // 
  /*
  evars.paWithDataQuery = cts.andNotQuery(
    cts.andQuery([
      dataQuery,
      cts.elementQuery(input.discoveryWorkpad.entities[entityName].physicalAttributes.map(s => xs.QName*s), cts.trueQuery()),
      cts.orQuery(cts.pathChecks.concat([simpleElems]))
    ]),
    COLLECTION_EXCLUSION_QUERY);
  evars.elemCandidateQuery = cts.andNotQuery(
    cts.andQuery([
      cts.orQuery([
        cts.documentQuery(input.discoveryWorkpad.entities[entityName].uris),
        cts.collectionQuery(input.discoveryWorkpad.entities[entityName].collections)
      ]),
      cts.orQuery(pathChecks.concat([simpleElems]))]), 
    COLLECTION_EXCLUSION_QUERY);
  evars.elemCandidateDataQuery = cts.andNotQuery(
    cts.andQuery([
      dataQuery,
      cts.orQuery([
        cts.documentQuery(input.discoveryWorkpad.entities[entityName].uris),
        cts.collectionQuery(input.discoveryWorkpad.entities[entityName].collections)
      ]),
      cts.orQuery(pathChecks.concat([simpleElems])) 
    ]),
    COLLECTION_EXCLUSION_QUERY);

  cts.elementQuery()

  report["Physical Attribute Match"] = {
    "Physical Attributes That Contain This Attribute's Sample Data" : {},
    "Physical Attributes Named Like This Attributes" :{}
  };
  */
}

function getReportURI(mappingURI) {
  var fileProper = fn.substringAfter(mappingURI, "/xmi2es/excel-mapper/");
  if (fileProper.endsWith(".json")) fileProper = fn.substringBefore(fileProper, ".json");
  else if (fileProper.endsWith(".xlsx")) fileProper = fn.substringBefore(fileProper, ".xlsx");
  else throw "weird mappingURI *" + mappingURI + "*";
  return "/xmi2es/discovery/" + fileProper + ".json";
}

function getMappingDocURI(mappingURI) {
  if (mappingURI.endsWith(".json")) return mappingURI;
  else if (mappingURI.endsWith(".xlsx")) {
    var len = mappingURI.length;
    return mappingURI.substring(0, len - "xlsx".length) + "json"
  }
  else throw "weird mappingURI *" + mappingURI + "*";
}

function discoverFromMapping(mappingURI, discoveryDataDB) {
  mappingURI = getMappingDocURI(mappingURI);
  var mappingDoc = cts.doc(mappingURI);
  if (!mappingDoc || mappingDoc == null) throw "mapping not found *" + mappingURI + "*";
  var input = {
    mappingObj : mappingDoc.toObject(),
    discoveryDB: discoveryDataDB,
  };
  var report = {
    mappingURI: mappingURI,
    entities: {}
  };

  // let's start with a collection dictionary
  var collections = queryDiscovery(input, 'cts.collections()', {});
  makeDictionary(COLLECTIONS_SPELL_URI, spell.makeDictionary(collections.map(s => (""+s).toLowerCase()), "element"));

  // now report on each entity 
  for (var ent in input.mappingObj.entities) {
    discoverClass(input, report, "" + ent);
  }

  xdmp.documentInsert(getReportURI(mappingURI), report, {"collections": ["xmi2es]"]});
}

function hasDiscovery(mappingURI) {
  return cts.estimate(cts.documentQuery(mappingURI)) == 1;
}

module.exports = {
  SEM_HAS_ATTRIBUTE: SEM_HAS_ATTRIBUTE,
  SEM_HAS_PREDICATE: SEM_HAS_PREDICATE,
  SEM_ATTRIBUTE_MATCHES_MODEL: SEM_ATTRIBUTE_MATCHES_MODEL,
  SEM_PREDICATE_MATCHES_MODEL: SEM_PREDICATE_MATCHES_MODEL,
  SEM_MATCH_ENTITY: SEM_MATCH_ENTITY,
  SEM_MATCH_MODEL: SEM_MATCH_MODEL,
  SEM_MATCH_PHYSICAL: SEM_MATCH_PHYSICAL,
  discoverFromMapping: discoverFromMapping,
  // FUTURE - discoverFromModel
  hasDiscovery: hasDiscovery,
  getReportURI: getReportURI,
  getMappingDocURI: getMappingDocURI
};

