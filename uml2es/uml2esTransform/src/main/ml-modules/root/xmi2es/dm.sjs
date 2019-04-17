function xcalc(...dsl) {
  if (dsl.length < 4 || ((dsl.length -4) % 3) != 0) {
    throw "Expected xcalc model entity attrib content|options (depAttrib depValue content|options)* but got " 
      + JSON.stringify(dsl);
  }
  var model = dsl[0];
  var entity = dsl[1];
  var attrib = dsl[2];
  var contentOptions = dsl[3].toLowerCase();
  var content = {};
  var options = {};
  for (var i = 4; i < dsl.length; i+=3) {
    var depAttrib = dsl[i];
    var depValue = dsl[i+1];
    var depContentOptions = dsl[i+2].toLowerCase();
    switch(depContentOptions) {
      case "content":
        content[depAttrib] = depValue;
        break;
      case "options":
        options[depAttrib] = depValue;
        break;
      default:
        throw "Illegal option *" + depContentOptions;
    }
  }
  
  xdmp.eval(`
    var xlib = require("/modelgen/${model}/lib.sjs");
    xlib.doCalculation_${entity}_${attrib}('dontcare', content, options)`, {content:content, options:options}, {});
  switch(contentOptions) {
    case "content":
      return content[attrib];
    case "options":
      return options[attrib];
      default:
        throw "Illegal option *" + depContentOptions;
  }
}

function registerFunctions(registrationFn, compilerContext, defaultFnMeta) {
    registrationFn(xcalc, defaultFnMeta);
}

exports.registerFunctions = registerFunctions;
