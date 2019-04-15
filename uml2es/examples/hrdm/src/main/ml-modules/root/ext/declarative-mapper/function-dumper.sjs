/* 
    dumper.sjs
    Dump out an object including functions
*/



function dump(obj) {

    if (obj instanceof Array) {
        let result = [];
        for (let sub of obj) {
            result.push(dump(sub))
        }
        return '[' + result.join(', ') + ']'
        
    }
  
    else if (obj instanceof Node) {
      return obj.toString();
    }

    else if (obj instanceof Function) {
        return obj.toString();
    }
  
    else if (obj instanceof Object) {
        let result = [];
        for (let k of Object.keys(obj)) {
            if (k !== '__proto__') {
              result.push('\t' + k + ':\t' + dump(obj[k]))              
            }
        }
        return '{\n' + result.join(',\n') + '}\n'        
    }

    else if (isNaN(obj)) {
        if (obj.indexOf("'") == -1) {
            return '"' + obj + '"';
        }

        else {
            return "'" + obj + "'";
        }
    }

    else {
        return obj;
    }

}


exports.dump = dump;