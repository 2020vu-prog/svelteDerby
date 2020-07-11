"use strict";
const { v4: uuidv4 } = require("uuid");
const debug = false;
const AWS = require("aws-sdk");
const documentDb = new AWS.DynamoDB.DocumentClient();
const CalcFinish = require("./calcFinish.js");
const registeredDurationSeconds = 600;
const registeredMacCache = {};
const recentWinCache = {}; // filter out known duplicates

async function ddbPut(item) {
    var rc = "Pending";
    const dbItem = {
        TableName: process.env.DERBY_TIMER_TABLE,
        Item: item,
    };
    try {
        await documentDb.put(dbItem).promise();

        console.log("Added dbItem: " + JSON.stringify(dbItem));
        rc = "OK";
    } catch (err) {
        console.log(err, err.stack); // an error occurred
        rc = "Error";
    }
    return rc;
}

/*
 *  lambda doesn't stay up long enough for this to become a concern...
 *  Not used for now.
 * If revived, deal with orgId in key path
 */
function enforceRecentWinCache(lane1noseMicros) {
    const pt3minutes = 1000 * 1000 * 180;
    const flushPrior = lane1noseMicros - pt3minutes; //flush older than 3 minutes (180 seconds);
    const purgeKeys = Object.keys(recentWinCache).filter(
        (oldNose) => oldNose < flushPrior
    );
    purgeKeys.forEach((purgeKey) => delete recentWinCache[purgeKeys]);
}

function shouldPublish(timerConfig, winnerDeltas) {
    const orgId = timerConfig.orgId;
    if (!recentWinCache[orgId]) {
        recentWinCache[orgId] = {};
    }

    if (winnerDeltas.length == 0) {
        console.log("shouldPublish: skip empty");
        return false;
    }

    if (winnerDeltas && winnerDeltas[0].valid) {
        // ok
    } else {
        console.log("shouldPublish: skip invalid");
        return false;
    }
    if (
        winnerDeltas &&
        winnerDeltas[0] &&
        winnerDeltas[0].lanes &&
        winnerDeltas[0].lanes.lane1 &&
        winnerDeltas[0].lanes.lane1.noseMicros
    ) {
        const lane1noseMicros = winnerDeltas[0].lanes.lane1.noseMicros;
        //enforceRecentWinCache(lane1noseMicros);
        if (recentWinCache[orgId][lane1noseMicros]) {
            console.log("shouldPublish: skip duplicate");
            return false;
        }
        recentWinCache[orgId][lane1noseMicros] = lane1noseMicros;
    }

    console.log("shouldPublish: allow");
    return true;
}
async function putWinnerSns(timerConfig, winnerDeltas) {
    const payload = {
        timerConfig: timerConfig,
        deltas: winnerDeltas,
    };
    // Create publish parameters
    var params = {
        Message: JSON.stringify(payload),
        TopicArn: process.env.TimerWinDeltaSns,
    };

    // Create promise and SNS service object

    try {
        console.log("SNS sending TimerWinDeltaQ:", params);
        const sent = await new AWS.SNS({ apiVersion: "2010-03-31" })
            .publish(params)
            .promise();
        console.log("SNS send Success", sent);
    } catch (err) {
        console.log("SNS send Error", err);
    }
}
async function doCalcTimes(uuidPk, newItem) {
    const consolidated = [newItem];
    const priorRc = await ddbGetRecent(uuidPk);
    if (priorRc && priorRc.Items) {
        consolidated.push(...priorRc.Items);
    }
    debug && console.log("consolidated:", consolidated);

    const eventList = consolidated.filter(
        (item) => item && item.SK && item.SK.startsWith("^")
    );
    debug && console.log("eventList: ", eventList);
    if (eventList.length == 0) {
        console.log("No registered events for timer");
        return;
    }

    const rawFinishData = consolidateAndDeduplicateTimerData(consolidated);
    const snsPromiseList = [];
    eventList.forEach((timerConfig) => {
        const calcFinish = new CalcFinish(timerConfig);
        const winnerDeltas = calcFinish.calcFinishMain(rawFinishData);
        console.log(`winnerData for ${timerConfig.orgId} :`, winnerDeltas);
        if (shouldPublish(timerConfig, winnerDeltas)) {
            // collect the promise(s)
            snsPromiseList.push(putWinnerSns(timerConfig, winnerDeltas));
        }
    });
    await Promise.all(snsPromiseList);
}
function consolidateAndDeduplicateTimerData(consolidated) {
    const deDup = {};
    consolidated.forEach((item) => {
        if (item && item.SK && item.SK.startsWith("20")) {
            deDup[item.SK] = item;
        }
    });

    const skList = Object.keys(deDup);
    skList.sort();

    debug && console.log("timerData SK skList: ", skList);

    const finishData = [];
    skList.forEach((key) => {
        const dataList = deDup[key].dataList;
        finishData.push(...dataList);
    });
    console.log("finishData length: ", finishData.length);
    debug && console.log("finishData json: ", JSON.stringify(finishData));

    return finishData;
}
function getNowSeconds() {
    return Math.floor(new Date().getTime() / 1000);
}
async function getRegisteredByMac(mac) {
    var prevReg = {};
    if (registeredMacCache[mac]) {
        prevReg = registeredMacCache[mac];
    } else {
        console.log("getRegisteredByMac: reading:", mac);
        const reg = await ddbGetPkSk("registered", mac.toString());
        if (reg && reg.Items && reg.Items[0]) {
            prevReg = reg.Items[0];
            registeredMacCache[mac] = prevReg; // cache it!
        } else {
            console.log("getRegisteredByMac: MISSING:", mac);
        }
    }
    return prevReg;
}
async function refreshRegistration(mac) {
    var prevReg = await getRegisteredByMac(mac);
    if (!prevReg.TTL) {
        console.log("FATAL refresh error: TTL missing.", prevReg);
        return;
    }

    if (prevReg.TTL > getNowSeconds() + 120) {
        console.log("refreshRegistration: not needed: ", prevReg);
        return;
    }
    console.log("refreshRegistration: proceed: ", prevReg);

    // delete cache and refresh before TTL update (in case uuid changed)!
    delete registeredMacCache[mac];
    prevReg = await getRegisteredByMac(mac);

    prevReg.TTL = getNowSeconds() + registeredDurationSeconds;

    await ddbPut(prevReg);
    registeredMacCache[mac] = prevReg; // update cache
}
async function ddbGetPkSk(pk, sk) {
    const containsValues = {};
    containsValues[":pk"] = pk;
    containsValues[":sk"] = sk;
    const keyCondition = "PK = :pk AND SK = :sk";

    const tableName = process.env.DERBY_TIMER_TABLE;
    var queryParams = {
        TableName: tableName,
        KeyConditionExpression: keyCondition,
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };

    try {
        console.log("ddbGetPkSk query begin: " + JSON.stringify(queryParams));
        const recent = await documentDb.query(queryParams).promise();

        console.log("ddbGetPkSk query gave: " + JSON.stringify(recent));
        return recent;
    } catch (err) {
        console.log(err, err.stack); // an error occurred
        return err;
    }
}
async function ddbGetRecent(uuidPk) {
    const skMinMS = new Date().getTime() - 30000;
    const skMinIso = new Date(skMinMS).toISOString();

    const containsValues = {};
    containsValues[":pk"] = uuidPk;
    containsValues[":sk"] = skMinIso;
    const keyCondition = "PK = :pk AND SK > :sk";

    const tableName = process.env.DERBY_TIMER_TABLE;
    var queryParams = {
        TableName: tableName,
        KeyConditionExpression: keyCondition,
        ReturnConsumedCapacity: "TOTAL",
        ScanIndexForward: false, // sort descending
        ExpressionAttributeValues: containsValues,
    };

    try {
        console.log("query begin: " + JSON.stringify(queryParams));
        const recent = await documentDb.query(queryParams).promise();

        console.log("query gave: " + JSON.stringify(recent));
        return recent;
    } catch (err) {
        console.log(err, err.stack); // an error occurred
        return err;
    }
}

function formatTimerInfo(PK, dataList) {
    const timestamp = new Date().getTime();
    return {
        PK: PK,
        SK: new Date().toISOString(),
        dataList: dataList,
        TTL: Math.floor(new Date().getTime() / 1000) + 6 * 3600,
    };
}

module.exports.getUuid = async (event, context, callback) => {
    console.log("getUuid: " + JSON.stringify(event));
    const uuid = uuidv4();
    const newReg = {
        PK: "registered",
        SK: event.queryStringParameters.mac,
        uuid: uuid,
        hostname: event.queryStringParameters.hostname,
        TTL:
            Math.floor(new Date().getTime() / 1000) + registeredDurationSeconds,
    };
    await ddbPut(newReg);
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

    const timerInfo = formatTimerInfo(requestBody.PK, requestBody.dataList);
    var putPromise = ddbPut(timerInfo);
    var recentPromise = doCalcTimes(requestBody.PK, timerInfo);
    var refreshRegistrationPromise = refreshRegistration(requestBody.mac);
    const [putRc, recentRc, refreshRc] = await Promise.all([
        putPromise,
        recentPromise,
        refreshRegistrationPromise,
    ]);
    const response = {
        statusCode: 200,
        body: JSON.stringify({
            message: "Go Serverless v1.0! sumbitted!",
            rc: putRc,
            put: timerInfo,
            input: event,
        }),
    };

    callback(null, response);
};
