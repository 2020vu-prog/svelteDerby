"use strict";
const { v4: uuidv4 } = require("uuid");

const AWS = require("aws-sdk");
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const ddbPut = async (item) => {
    var rc = "Pending";
    const dbItem = {
        TableName: process.env.DERBY_TIMER_TABLE,
        Item: item,
    };
    try {
        await dynamoDb.put(dbItem).promise();

        console.log("Added dbItem: " + JSON.stringify(dbItem));
        rc = "OK";
    } catch (err) {
        console.log(err, err.stack); // an error occurred
        rc = "Error";
    }
    return rc;
};
const getTimerInfo = (PK, dataList) => {
    const timestamp = new Date().getTime();
    return {
        PK: PK,
        SK: new Date().getTime(),
        dataList: dataList,
        TTL: Math.floor(new Date().getTime() / 1000) + 6 * 3600,
    };
};

module.exports.getUuid = async (event, context, callback) => {
    console.log("getUuid: " + JSON.stringify(event));
    const uuid = uuidv4();
    await ddbPut({
        PK: "registered",
        SK: parseInt(event.queryStringParameters.mac),
        uuid: uuid,
        hostname: event.queryStringParameters.hostname,
        TTL: Math.floor(new Date().getTime() / 1000) + 6 * 3600,
    });
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            uuid: uuid,
        }),
    };

    callback(null, response);
};
module.exports.submit = async (event, context, callback) => {
    const requestBody = JSON.parse(event.body);

    const timerInfo = getTimerInfo(requestBody.PK, requestBody.dataList);
    var rc = await ddbPut(timerInfo);

    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: "Go Serverless v1.0! sumbitted!",
            rc: rc,
            put: timerInfo,
            input: event,
        }),
    };

    callback(null, response);
};
