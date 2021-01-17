"use strict";
const AWS = require("aws-sdk");
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
const fs = require("fs");
const { DynamoDB } = require("@aws-sdk/client-dynamodb-v2-node");
const ddbClient = new DynamoDB({ region: process.env.AwsRegion });
var StringDecoder = require("string_decoder").StringDecoder;

const flushBulkRequests = async (requests) => {
    if (requests.length > 0) {
        var params = {
            RequestItems: {
                [process.env.DistDbTable]: requests,
            },
            ReturnConsumedCapacity: "TOTAL",
        };
        try {
            var data = await ddbClient.batchWriteItem(params);

            console.log("flushBulk: " + JSON.stringify(data)); // successful response
            return requests.length; // TODO get from TotalProcessed;
        } catch (err) {
            console.log("flushBulk:", err, err.stack); // an error occurred
            return 0;
        }
    }
};
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
};
const addSingle = async (json) => {
    const [uk, putRequest] = fmtBulkPut(json);
    if (putRequest && uk) {
        await flushBulkRequests([putRequest]);
        return { status: "ok" };
    }
    return { error: "Invalid Request" };
};
const fmtBulkPut = (json1) => {
    if (json1) {
        console.log("fmtBulkPut pw:", json1);
        var marshalled = AWS.DynamoDB.Converter.marshall(json1);
        console.log("fmtBulkPut mar:", marshalled);
        const putRequest = {
            PutRequest: {
                Item: marshalled,
            },
        };
        const uk = json1.DP + ":" + json1.DS;
        return [uk, putRequest];
    } else {
        console.log("fmtBulkPut ignored invalid:" + JSON.stringify(json1));
        return [null, null];
    }
};
const fmtBulkDelete = (json1) => {
    if (json1) {
        console.log("fmtBulkDelete raw:", json1);
        const jsonKey = {
            DP: json1.DP,
            DS: json1.DS,
        };
        var marshalled = AWS.DynamoDB.Converter.marshall(jsonKey);
        console.log("fmtBulkDelete marsh:", marshalled);
        const putRequest = {
            DeleteRequest: {
                Key: marshalled,
            },
        };
        const uk = json1.DP + ":" + json1.DS;
        return [uk, putRequest];
    } else {
        console.log("fmtBulkDelete ignored invalid:" + JSON.stringify(json1));
        return [null, null];
    }
};

const promoteToObject = (unmarshalled, factory) => {
    if (factory) {
        return factory.build(unmarshalled);
    } else {
        return unmarshalled;
    }
};

const unmarshallResultsToArray = (data, factory) => {
    const rc = [];
    for (var i = 0; i < data.Items.length; i++) {
        var unmarshalled = AWS.DynamoDB.Converter.unmarshall(data.Items[i]);
        unmarshalled = promoteToObject(unmarshalled, factory);
        if (unmarshalled) {
            rc.push(unmarshalled);
        }
    }
    return rc;
};
async function ddbQueryRaceHistory(qsp) {
    var containsValues = {};
    containsValues[":dp"] = { S: qsp.orgId };
    var params = {
        TableName: process.env.DistDbTable,
        KeyConditionExpression: "DP = :dp ",
        ReturnConsumedCapacity: "TOTAL",
        ScanIndexForward: false, // sort descending
        ExpressionAttributeValues: containsValues,
    };
    console.log("history query: " + JSON.stringify(params));
    try {
        var data = await ddbClient.query(params);
        const cc = data.ConsumedCapacity.CapacityUnits;
        console.log("queryRaceHistory cc: ", cc); // successful response
        console.log("queryRaceHistory: ", data); // successful response
        console.log("queryRaceHistory: " + JSON.stringify(data)); // successful response
        const rc = unmarshallResultsToArray(data);

        return rc;
    } catch (err) {
        console.log("queryRaceHistory failed: ", err, err.stack); // an error occurred
    }
    return [{ error: "Query History Failed" }, cacheMaxSeconds];
}
function getPutObjectName(msg) {
    if (msg.ccType === "CCF") {
        return "archive/" + msg.orgIz + "/" + msg.orgId + "/archive.json";
    } else {
        return "archive/" + msg.orgIz + "/" + msg.orgId + "/" + now + ".json";
    }
}
async function putS3(msg, items) {
    const now = new Date().getTime();
    const putObjectName = getPutObjectName(msg);
    var params = {
        Body: JSON.stringify(items),
        Key: putObjectName,
        Bucket: process.env.DstBucket,
    };
    try {
        console.log("puts3 to :", putObjectName); // successful response
        const didPut = await s3.putObject(params).promise();
        console.log("puts3:", didPut); // successful response

        const newCCA = {
            DP: msg.orgId,
            DS: now * 1000,
            PK: "CCA",
            s3: putObjectName,
            orgId: msg.orgIz, // name mismatch, allow!
        };
        console.log("db adding:", newCCA); // successful response
        await addSingle(newCCA);
        console.log("db added:", newCCA); // successful response
        await doBulkCleanup(items);
    } catch (err) {
        console.log("s3put failed:", err); // successful response
    }
}
const getS3 = async (keys) => {
    //TODO: handle multiple keys and concatenate??  (shouldn't happen)
    if (keys && keys.length > 0) {
        return await getS3Json(keys[0]);
    } else {
        return [];
    }
};
const getS3Json = async (key) => {
    var params = {
        Key: key,
        Bucket: process.env.DstBucket,
    };
    try {
        const didGet = await s3.getObject(params).promise();
        console.log("gets3:", didGet);

        const d = new StringDecoder("utf8");
        const rc = d.write(didGet.Body);
        return JSON.parse(rc);
    } catch (err) {
        console.log("s3get failed:", err); // successful response
        return [];
    }
};
const doBulkCleanup = async (items) => {
    var requests = [];
    for (let index = 0; index < items.length; index++) {
        const [uk, deleteRequest] = fmtBulkDelete(items[index]);
        requests.push(deleteRequest);
        if (requests.length >= 24) {
            await flushBulkRequests(requests);
            requests = [];
        }
    }
    if (requests.length > 0) {
        await flushBulkRequests(requests);
    }
};
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
}
const getKeyNames = (items) => {
    const rc = [];
    if (!items) return rc;
    items.forEach((item) => {
        if (item.PK === "CCA") {
            rc.push(item.s3);
        }
    });
    return rc;
};

exports.handler = async function (event, context) {
    await asyncForEach(event.Records, async (record) => {
        const { body } = record;
        console.log("sqs b4PutAndGet:", body);
        try {
            const parsedQsp = JSON.parse(body);
            const items = await ddbQueryRaceHistory(parsedQsp);

            const keys = getKeyNames(items);
            const oldItems = await getS3(keys);
            await putS3(parsedQsp, [...items, ...oldItems]);
        } catch (err) {
            console.log("s3 error:", err);
        }
    });

    return {};
};
