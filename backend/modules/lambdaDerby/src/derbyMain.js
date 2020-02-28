'use strict'
const EntityFactory = require('./shared/EntityFactory.js')
const AWS = require("aws-sdk");
const { DynamoDB } = require('@aws-sdk/client-dynamodb-v2-node');
const ddbClient = new DynamoDB({ region: process.env.AwsRegion });
var jwt = require('jsonwebtoken');


const configMap = {
}



const getConfig = async (orgId) => {
	if (configMap[orgId]) {
		return configMap[orgId];
	}
	var allConfig = await ddbQueryRaceConfig();
	Object.keys(allConfig).forEach((orgId) => {
		configMap[orgId] = allConfig[orgId];
	});

	return configMap[orgId];

}
const getTtl = async (orgId) => {
	const config = await getConfig(orgId);
	if (config) {
		return config.TTL;
	}
	return null;
	//return Math.round((new Date().getTime() / 1000) + config.ttlIncrement);
}
var entityFactory;

const create_UUID = () => {
	var dt = new Date().getTime();
	var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
		var r = (dt + Math.random() * 16) % 16 | 0;
		dt = Math.floor(dt / 16);
		return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
	});
	return uuid;
}
const ddbQueryRaceHistory = async (qsp) => {
	if (!qsp) { qsp = {} }
	var limit = parseInt(qsp.limit);

	var cacheMaxSeconds = 7277;
	if (!qsp.loMicros) {
		qsp.loMicros = "1";
	}
	if (!qsp.hiMicros) {
		qsp.hiMicros = new Date().getTime() * 1000 + "";
		cacheMaxSeconds = 30;

	}
	if (isNaN(limit) || limit > 25) {
		limit = 25;
	}

	var containsValues = {};
	containsValues[":dp"] = { S: qsp.orgId };
	containsValues[":loMicros"] = { N: qsp.loMicros };
	containsValues[":hiMicros"] = { N: qsp.hiMicros };
	var params = {
		TableName: process.env.DistDbTable,
		KeyConditionExpression: "DP = :dp and DS BETWEEN :loMicros  and :hiMicros",
		ReturnConsumedCapacity: "TOTAL",
		Limit: limit,
		ScanIndexForward: false,  // sort descending
		ExpressionAttributeValues: containsValues
	};
	console.log("history query: " + JSON.stringify(params));
	try {
		var data = await ddbClient.query(params);
		console.log("queryRaceHistory: " + data);           // successful response
		console.log("queryRaceHistory: " + JSON.stringify(data));           // successful response
		const rc = [];
		for (var i = 0; i < data.Items.length; i++) {
			var unmarshalled = AWS.DynamoDB.Converter.unmarshall(data.Items[i]);
			rc.push(unmarshalled);
		}


		return [rc, cacheMaxSeconds];
	}
	catch (err) {
		console.log("queryRaceHistory failed: ", err, err.stack); // an error occurred
	}
	return [{ error: "Query History Failed" }, cacheMaxSeconds];
}
const ddbQueryRaceConfig = async () => {
	var containsValues = {};
	containsValues[":pk"] = { S: "EventConfig" };
	var params = {
		TableName: process.env.DynamoDbTable,
		KeyConditionExpression: "PK = :pk",
		ReturnConsumedCapacity: "TOTAL",
		ExpressionAttributeValues: containsValues
	};
	console.log("ddb query: " + JSON.stringify(params));
	try {
		var data = await ddbClient.query(params);
		console.log("queryRaceConfig: " + data);           // successful response
		console.log("queryRaceConfig: " + JSON.stringify(data));           // successful response
		const rc = {};
		for (var i = 0; i < data.Items.length; i++) {
			var unmarshalled = AWS.DynamoDB.Converter.unmarshall(data.Items[i]);
			rc[unmarshalled.SK] = unmarshalled;
		}


		return rc;
	}
	catch (err) {
		console.log("queryRaceConfig failed: ", err, err.stack); // an error occurred
	}
	return { error: "Query Failed" };
}
const ddbQueryRsContains = async (json) => {
	var containsFilters = [];
	var containsValues = {};
	var i;
	for (i = 0; i < json.cn.length; i++) {
		containsFilters[i] = "contains (cn, :cn" + i + ")";
		containsValues[":cn" + i] = { S: json.cn[i] };
	}
	containsValues[":pk"] = { S: json.orgId + ":RS" };

	var params = {
		TableName: process.env.DynamoDbTable,

		KeyConditionExpression: "PK = :pk",
		FilterExpression: containsFilters.join(" OR "),
		ReturnConsumedCapacity: "TOTAL",
		ExpressionAttributeValues: containsValues
	};
	console.log("ddb query: " + JSON.stringify(params));

	try {
		var data = await ddbClient.query(params);
		console.log("queryRsContains: " + data);           // successful response
		console.log("queryRsContains: " + JSON.stringify(data));           // successful response
		return data.Count;
	}
	catch (err) {
		console.log("queryRsContains failed: ", err, err.stack); // an error occurred
	}
	return 99;
}



const fmtBulkPut = (json1) => {
	const myP = entityFactory.build(json1);

	if (myP) {
		myP.preWrite();
		console.log(myP);
		var marshalled = AWS.DynamoDB.Converter.marshall(myP);
		console.log(marshalled);
		const putRequest = {
			PutRequest: {
				Item: marshalled
			}
		}
		const uk = myP.partitionKey + ":" + myP.sortKey;
		return [uk, putRequest];
	}
	else {
		console.log("addBulk ignored invalid:" + JSON.stringify(json1));
		return [null, null];
	}
};
const flushBulkRequests = async (requests) => {
	if (requests.length > 0) {
		var params = {
			RequestItems: {
				[process.env.DynamoDbTable]: requests
			},
			ReturnConsumedCapacity: "TOTAL"
		}
		try {
			var data = await ddbClient.batchWriteItem(params);

			console.log("Added Bulk: " + JSON.stringify(data));           // successful response
			return requests.length;// TODO get from TotalProcessed;
		}
		catch (err) {
			console.log(err, err.stack); // an error occurred
			return 0;
		}
	}
}
const addBulk = async (json) => {
	var requests = {}; // keyed by unique pk/sk to elimate duplicates.
	var totalProcessed = 0;
	for (var i = 0; i < json.length; i++) {
		console.log("addBulk: " + i);
		const [uk, putRequest] = fmtBulkPut(json[i]);
		if (putRequest && uk) {
			requests[uk] = putRequest;
		}
		if (Object.keys(requests).length > 20) {
			totalProcessed += await flushBulkRequests(Object.values(requests));
			requests = {};
		}
	}
	totalProcessed += await flushBulkRequests(Object.values(requests));
	return { status: "ok", detail: "BulkProcessed", count: totalProcessed };
}
const addSingle = async (json) => {
	const [uk, putRequest] = fmtBulkPut(json);
	if (putRequest && uk) {
		await flushBulkRequests([putRequest]);
		return { status: "ok" };
	}
	return { error: "Invalid Request" };
}
const addPending2 = async (json) => {

	console.log("addPending2: " + JSON.stringify(json));
	json.PK = ":RS";  // force RaceStanding


	const alreadyExists = await ddbQueryRsContains(json);
	if (alreadyExists > 0) {
		return { error: "Pending2 already exists" };
	}

	const cfg=await getConfig(json.orgId);
	if(cfg && cfg.lcl1){  //low car lane 1?
		json.cn.sort();
		console.log("addPending2: sorted: " , json.cn);
	}
	else{
		console.log("addPending2: unsorted: " , json.cn);

	}
	return await addSingle(json);

};

const addEventConfig = async (json, priorTtl) => {

	console.log("addEventConfig: " + JSON.stringify(json));
	json.PK = "EventConfig";  // force 
	json.SK = json.orgId;  // force 

	// use prior ttl if found (API cannot change ttl of in progress event!)
	const newTtl = priorTtl ? priorTtl :
		Math.round((new Date().getTime() / 1000)) + (3600 * 24 * 1);

	json.TTL = newTtl;

	const by = entityFactory.propOverrides.by;
	entityFactory = new EntityFactory({ orgId: json.orgId, by: by, TTL: json.TTL });




	return await addSingle(json);

};
const addParticipant2 = async (json) => {

	console.log("addParticipant2: " + JSON.stringify(json));
	json.PK = ":PTCP";  // force Participant
	return await addSingle(json);
};
const getOrgId = (event) => {
	if (event.body) {
		return JSON.parse(event.body).orgId;
	}
	if (event.queryStringParameters) {
		return event.queryStringParameters.orgId;
	}
	return null;
}

exports.handler = async (event) => {

	const dbArn = process.env.DynamoDbArn
	var jsonRC = {};

	// Allow Cors
	if (event.httpMethod === "OPTIONS") {
		var response = {
			statusCode: 200,
			headers: {
				'Content-Type': 'text/html; charset=utf-8',
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Headers": "*",
				"Access-Control-Allow-Methods": "POST, GET, OPTIONS"
			}
		}
		callback(null, response)
		return;
	}
	const decoded = jwt.decode(event.headers.Authorization);
	const orgId = getOrgId(event);
	//const orgConfig = await getConfig(orgId);
	const defaultTTL = await getTtl(orgId);

	entityFactory = new EntityFactory({ orgId: orgId, by: decoded.email, TTL: defaultTTL });
	console.log(event);
	const routePath = event.path.replace(/^\/app/, "");
	var cacheControl = "no-cache";
	if (false) { }
	else if (routePath === "/getRaceConfig") {
		var qr = await ddbQueryRaceConfig();
		jsonRC = qr;
		cacheControl = 'max-age=7207'
	}
	else if (!orgId) {
		jsonRC = { error: "Unable to determine orgId" };
	}
	else if (routePath === "/addEventConfig") {
		//var [qr, cacheMaxSeconds] = await ddbQueryRaceHistory(event.queryStringParameters);
		jsonRC = await addEventConfig(JSON.parse(event.body), defaultTTL);
	}
	else if (!defaultTTL) {
		jsonRC = { error: "Unable to determine default TTL" };

	}
	else if (routePath === "/addParticipant") {
		jsonRC = await addParticipant2(JSON.parse(event.body));
	}
	else if (routePath === "/addPending") {
		jsonRC = await addPending2(JSON.parse(event.body));
	}
	else if (routePath === "/addBulk") {
		jsonRC = await addBulk(JSON.parse(event.body));
	}
	else if (routePath === "/ddbQuery") {
		var qr = await ddbQueryRsContains(JSON.parse(event.body));
		console.log("ddbQuery: " + qr);
		jsonRC = { Count: qr };
	}

	else if (routePath === "/getRaceHistory") {
		var [qr, cacheMaxSeconds] = await ddbQueryRaceHistory(event.queryStringParameters);
		jsonRC = qr;
		cacheControl = 'max-age=' + cacheMaxSeconds;
	}

	else {
		console.log("Unhandled Path: " + routePath + " ep: " + event.path);
		jsonRC = { error: "Unhandled" };
	}

	console.log(JSON.stringify(event));
	var response = {
		statusCode: 200,
		headers: {
			'Content-Type': 'application/json; charset=utf-8',
			'Cache-Control': cacheControl
		},
		body: JSON.stringify(jsonRC)
	}
	//callback(null, response)
	return response;
}
