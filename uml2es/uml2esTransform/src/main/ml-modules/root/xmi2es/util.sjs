'use strict';

const sem = require("/MarkLogic/semantics.xqy");

const SKIPS = ["description"];
const PRED_PREFIX = "http://marklogic.com/xmi2es/xes#";
const UML_ONLY_PREDS = [PRED_PREFIX + "relationship", PRED_PREFIX + "typeIsReference", PRED_PREFIX + "reference",
                        PRED_PREFIX + "associationClass", PRED_PREFIX + "isAssociationClass",
                        PRED_PREFIX + "hasAssociationClassEnd", PRED_PREFIX + "associationClassEndAttribute",
                        PRED_PREFIX + "associationClassEndClass", PRED_PREFIX + "associationClassEndFK"];

//DHF 4.1  - From options, get the submap keyed by id. We use the submap to pass data between DHF hamronization modules 
function getIOptions(id,options) {
  return options["iopt_" + id];
}

//DHF 4.1  - In options, createa a submap keyed by id. We use the submap to pass data between DHF hamronization modules 
function setIOptions(id,options) {
  var ioptions = {};
  options["iopt_" + id] = ioptions;
  return ioptions;
}

//DHF 4.1  - Remove from options the submap keyed by id. We use the submap to pass data between DHF hamronization modules 
function removeIOptions(id,options) {
  delete options["iopt_" + id];
}

// Make the JSON source in an alphabetized form for easy comparison
function makeESComparable(source, skips) {

  // determine skips based on those passed in plus standard SKIPS
  // these are properties that can reasonably differ between models. Don't include them in comparison.
  skips = skips.concat(SKIPS);

  if (source !== Object(source)) {
    // it's a scalar
    return source;
  }  
  
  if (Array.isArray(source)) {
    // it's an array

    // step 1 - alphabetize the elements
    var elems = [];
    for (var i = 0; i < source.length; i++) {
      elems.push({
        "index" : i,
        "contents" : JSON.stringify(source[i])
      });
    }
    elems.sort(function(a,b) { 
      if (a.contents < b.contents) return -1; 
      else if (b.contents < a.contents) return 1; 
      else return 0;});

    // step 2 - recurse on each element in alphabetical order
    var comparable = [];
    for (var i = 0; i < elems.length; i++) {
      comparable[i] = makeESComparable(source[[ elems[i].index ]], skips);
    }
    return comparable;
  } else  {
    // it's an object

    // step 1 - get the props in alphabetical order
    var props = [];
    for (var prop in source) {
      if (source.hasOwnProperty(prop) && skips.indexOf(""+prop) < 0) {
        props.push(prop);
      }
    }
    props.sort();

    // step 2 - recurse on each
    var comparable = {};
    for (var i = 0; i < props.length; i++) {
      comparable[props[i]] = makeESComparable(source[props[i]], skips);
    }
    return comparable;
  }
}

function sortXES(t1, t2) {
  if (sem.isBlank(sem.tripleSubject(t1))) {
    if (sem.isBlank(sem.tripleSubject(t2))) return sortTriples(t1,t2);
    else return 1;
  }
  else if (sem.isBlank(sem.tripleSubject(t2))) return -1;
  else return sortTriples(t1,t2);
}

function sortTriples(t1, t2) {
    if (""+t1 < ""+t2) return -1;
    else if (""+t1 > ""+t2) return 1;
    return 0;       
}
           
function walkPaths(triples, tripleIdx, visited, path) {
  if (visited.indexOf(tripleIdx) >= 0) return;
  visited.push(tripleIdx);
  
  var s = sem.tripleSubject(triples[tripleIdx]);
  var p = sem.triplePredicate(triples[tripleIdx]);
  var o = sem.tripleObject(triples[tripleIdx]);
  
  if (sem.isBlank(s) == false) path.push(s);
  path.push(p);
  if (xdmp.type(o) == "iri" || xdmp.type(o) == "blank") {
    if (sem.isBlank(o) == false) path.push(o);
    // find triples where o is the subject
    for (var i = 0; i < triples.length; i++) {
      if (i == tripleIdx) continue;
      if (""+sem.tripleSubject(triples[i]) == ""+o) {
        walkPaths(triples, i, visited, path);
      }
    }
  }
  else path.push(o);

  return path;
}
            
function makeXESComparable(source) {
  
  // obtain triples from TTL source
  var triples = sem.rdfParse(source, ["turtle"]).toArray();
  
  // strip out the uml-only triples (class rels, association ends, etc)
  var index = triples.length - 1;
  while (index >= 0) {
    var p = ""+sem.triplePredicate(triples[index]);
    if (UML_ONLY_PREDS.indexOf(p) >= 0) {
      xdmp.log("Removing triple with predicate " + p);
      triples.splice(index, 1); 
    }
    index -= 1;
  }
  
  // sort the triples
  triples.sort(sortXES);
  
  // find the path of each triple whose subject is not blank
  var visited = [];
  var paths = [];
  for (var i = 0; i < triples.length; i++) {
    if (sem.isBlank(sem.tripleSubject(triples[i]))) {
      // if we're at a blank subject, we've already covered everything
      break;
    }
    var currPath = [];
    walkPaths(triples, i, visited, currPath);
    paths.push(currPath);
    if (visited.length == triples.length) break;
  }
  
  // dump as comparable string
  var spaths = [];
  paths.forEach(function(p) { spaths.push(JSON.stringify(p))});
  return spaths.sort().join("\n")
}

module.exports = {
  getIOptions: getIOptions,
  setIOptions: setIOptions,
  removeIOptions: removeIOptions,  
  makeESComparable: makeESComparable,
  makeXESComparable:makeXESComparable
};