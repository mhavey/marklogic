declareUpdate();

var sem = require("/MarkLogic/semantics.xqy");

function URI(type, id) {
	return "/" + type + "/" + id + ".json";
}

function getInsertOptions(typePlural) {
	return {"collections": ["talkdata", typePlural]};	
}

var doc = cts.doc(uri);
var odoc = doc.toObject();
var matchingSubscriptions = cts.search(cts.reverseQuery(doc));
for (var match of matchingSubscriptions) {
	var omatch = match.toObject();
	xdmp.log("MOVIETALK matched *" + JSON.stringify(match), "info");

	var alert = {
		alertID: sem.uuidString(),
		postURI: uri,
		postType: odoc.PostType,
		postTitle: odoc.Title,
		postDate: odoc.LastUpdateDate,
		subscriptionID: omatch.SUB_ID,
		subscriptionName: omatch.SUB_NAME
	};

	var alertURI = URI("alert", alert.alertID);
	xdmp.documentInsert(alertURI, alert, getInsertOptions("alert"));
	xdmp.log("Created alert " + alertURI, "info");
}

xdmp.log("MOVIETALK TRIGGER *" + uri + "*", "info")
