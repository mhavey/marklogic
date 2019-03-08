// dhf.sjs exposes helper functions to make your life easier
// See documentation at:
// https://marklogic.github.io/marklogic-data-hub/docs/server-side/
const dhf = require('/data-hub/4/dhf.sjs');

const contentPlugin = require('./content.sjs');
const headersPlugin = require('./headers.sjs');
const triplesPlugin = require('./triples.sjs');
const writerPlugin = require('./writer.sjs');

/*
 * Plugin Entry point
 *
 * @param id          - the identifier returned by the collector
 * @param options     - a map containing options. Options are sent from Java
 *
 */
function main(id, options) {

  xdmp.log("AJJ 1 " + id);
  var contentContext = dhf.contentContext();
  var content = dhf.run(contentContext, function() {
    return contentPlugin.createContent(id, options);
  });

  xdmp.log("AJJ 2 " + id + JSON.stringify(content));

  var headerContext = dhf.headersContext(content);
  var headers = dhf.run(headerContext, function() {
    return headersPlugin.createHeaders(id, content, options);
  });

  xdmp.log("AJJ 3 " + id + JSON.stringify(headers));

  var tripleContext = dhf.triplesContext(content, headers);
  var triples = dhf.run(tripleContext, function() {
    return triplesPlugin.createTriples(id, content, headers, options);
  });

  xdmp.log("AJJ 4 " + id );

  var envelope = dhf.makeEnvelope(content, headers, triples, options.dataFormat);

  xdmp.log("AJJ 5 " + id );

  // writers must be invoked this way.
  // see: https://github.com/marklogic/marklogic-data-hub/wiki/dhf-lib#run-writer
  dhf.runWriter(writerPlugin, id, envelope, options);

  xdmp.log("AJJ 6 " + id );

}

module.exports = {
  main: main
};
