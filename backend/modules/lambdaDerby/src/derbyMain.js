"use strict";
const EntityFactory = require("./shared/EntityFactory.js");
const { permissionMap } = require("./shared/permissionLits.js");
const { hasServerRoutePath } = require("./shared/PermissionLookup.js");
const AWS = require("aws-sdk");
const { DynamoDB } = require("@aws-sdk/client-dynamodb-v2-node");
const ddbClient = new DynamoDB({ region: process.env.AwsRegion });
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
var jwt = require("jsonwebtoken");
const TmpCache = require("./tmpCache.js");
const configMap = {};

const s3QueryChartTypes = async () => {
    var params = {
        Bucket: process.env.ChartS3BucketName,
        Prefix: "data/brackets",
    };
    try {
        const data = await s3.listObjectsV2(params).promise();
        return data;
    } catch (err) {
        console.log("s3 list Error", err);
        return { error: "s3 list buckets Failed" };
    }
};

const requestCCA = async (qsp, data) => {
    var params = {
        MessageGroupId: "orgId:" + qsp.orgId,
        MessageBody: JSON.stringify(qsp),
        // MessageId: "Group1",  // Required for FIFO queues
        QueueUrl: process.env.CcaQueueId,
        MessageDeduplicationId: create_UUID(),
    };
    try {
        console.log("SQS sending:", qsp);
        const sent = await sqs.sendMessage(params).promise();
        console.log("SQS send Success", sent.MessageId);
    } catch (err) {
        console.log("SQS send Error", err);
    }
};
const getConfig = async (eventKey) => {
    if (configMap[eventKey]) {
        return configMap[eventKey];
    }

    var eConfig = await ddbQueryEventConfig(eventKey);
    if (eConfig[eventKey]) {
        configMap[eventKey] = eConfig[eventKey];
        return eConfig[eventKey];
    }

    return undefined;
};
const getTtl = async (eventKey) => {
    const config = await getConfig(eventKey);
    if (config) {
        return config.TTL;
    }
    return null;
    //return Math.round((new Date().getTime() / 1000) + config.ttlIncrement);
};
var entityFactory;

const create_UUID = () => {
    var dt = new Date().getTime();
    var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
        /[xy]/g,
        function (c) {
            var r = (dt + Math.random() * 16) % 16 | 0;
            dt = Math.floor(dt / 16);
            return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
        }
    );
    return uuid;
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
const unmarshallResultsToObject = (data, key, factory) => {
    const rc = {};

    for (var i = 0; i < data.Items.length; i++) {
        var unmarshalled = AWS.DynamoDB.Converter.unmarshall(data.Items[i]);
        unmarshalled = promoteToObject(unmarshalled, factory);
        if (unmarshalled) {
            rc[unmarshalled[key]] = unmarshalled;
        }
    }
    return rc;
};

const ddbQueryRaceHistory = async (qsp) => {
    if (!qsp) {
        qsp = {};
    }
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
        KeyConditionExpression:
            "DP = :dp and DS BETWEEN :loMicros  and :hiMicros",
        ReturnConsumedCapacity: "TOTAL",
        Limit: limit,
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

        if (cc > 0.5 || data.Count >= limit) {
            console.log("queryRaceHistory: requesting CCA: ", cc);
            await requestCCA(qsp, data);
        } else {
            console.log("queryRaceHistory: skipping CCA: ", cc);
        }

        return [rc, cacheMaxSeconds];
    } catch (err) {
        console.log("queryRaceHistory failed: ", err, err.stack); // an error occurred
    }
    return [{ error: "Query History Failed" }, cacheMaxSeconds];
};
const ddbQueryEventConfig = async (eventKey) => {
    var containsValues = {};
    containsValues[":pk"] = { S: "EventConfig" };
    containsValues[":sk"] = { S: eventKey };
    var params = {
        TableName: process.env.DynamoDbTable,
        KeyConditionExpression: "PK = :pk" + " and  SK = :sk",
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddb query: " + JSON.stringify(params));
    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryEventConfig: ", data); // successful response
        return unmarshallResultsToObject(data, "SK");
    } catch (err) {
        console.log("ddbQueryEventConfig failed: ", err, err.stack); // an error occurred
    }
    return { error: "Query Failed" };
};
const ddbListEventConfigByOrg = async (orgIz) => {
    var containsValues = {};
    containsValues[":pk"] = { S: "EventConfig" };
    containsValues[":sk"] = { S: orgIz + ":" };
    var params = {
        TableName: process.env.DynamoDbTable,
        KeyConditionExpression: "PK = :pk" + " and  begins_with (SK, :sk)",
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddb query: " + JSON.stringify(params));
    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryEventConfig: ", data); // successful response
        return unmarshallResultsToObject(data, "SK");
    } catch (err) {
        console.log("ddbQueryEventConfig failed: ", err, err.stack); // an error occurred
    }
    return { error: "Query Failed" };
};
const ddbQueryOrgConfig = async () => {
    var containsValues = {};
    containsValues[":pk"] = { S: "OrgConfig" };
    var params = {
        TableName: process.env.DynamoDbTable,
        KeyConditionExpression: "PK = :pk",
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddbQueryOrgConfig query : " + JSON.stringify(params));
    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryOrgConfig: ", data); // successful response
        return unmarshallResultsToObject(data, "SK");
    } catch (err) {
        console.log("ddbQueryOrgConfig failed: ", err, err.stack); // an error occurred
    }
    return { error: "Query OrgFailed" };
};
/*
 ** Lookup RP by exact PK/SK
 */
const ddbQueryRsByKey = async (json) => {
    const containsValues = {};
    const keyCondition = buildKeyCondition(json.orgId + ":RS", containsValues);
    containsValues[":sk"] = { S: json.SK };

    var params = {
        TableName: process.env.DynamoDbTable,
        Limit: 20,
        ScanIndexForward: false, // sort descending
        KeyConditionExpression: keyCondition + " and  SK = :sk",
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddbQueryRsByKey query: " + JSON.stringify(params));

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryRsByKey: ", data); // successful response

        const udata = unmarshallResultsToArray(data, new EntityFactory({}));

        return udata;
    } catch (err) {
        console.log("ddbQueryRsByKey failed: ", err, err.stack); // an error occurred
        throw err;
    }
};
/*
 ** Lookup RP by exact PK/SK
 */
const ddbQueryRpByKey = async (json) => {
    const containsValues = {};
    const keyCondition = buildKeyCondition(json.orgId + ":RP", containsValues);
    containsValues[":sk"] = { S: json.SK };

    var params = {
        TableName: process.env.DynamoDbTable,
        Limit: 20,
        ScanIndexForward: false, // sort descending
        KeyConditionExpression: keyCondition + " and  SK = :sk",
        FilterExpression: " attribute_not_exists (phr) ",
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddbQueryRpByKey query: " + JSON.stringify(params));

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryRpByKey: ", data); // successful response

        const udata = unmarshallResultsToArray(data, new EntityFactory({}));

        return udata.filter((rp) => !rp.phaseResults); // only return entries w/o results
    } catch (err) {
        console.log("ddbQueryRpByKey failed: ", err, err.stack); // an error occurred
        throw err;
    }
};
/*
 **
 */
const ddbQueryRpNextOnBlocks = async (json) => {
    const containsValues = {};
    const keyCondition = buildKeyCondition(json.orgId + ":RP", containsValues);

    var params = {
        TableName: process.env.DynamoDbTable,
        Limit: 20,
        ScanIndexForward: false, // sort descending
        KeyConditionExpression: keyCondition,
        FilterExpression: " attribute_not_exists (phr) ",
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddbQueryRpNextOnBlocks query: " + JSON.stringify(params));

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryRpNextOnBlocks: ", data); // successful response

        const udata = unmarshallResultsToArray(data, new EntityFactory({}));

        return udata.filter((rp) => !rp.phaseResults).reverse(); // only return entries w/o results
    } catch (err) {
        console.log("ddbQueryRpNextOnBlocks failed: ", err, err.stack); // an error occurred
        throw err;
    }
};
/*
 ** Any given car should have at most one entry "on the blocks"
 */
const ddbQueryRpDuplicateCheck = async (json) => {
    const containsValues = {};
    const carFIlterString = buildDdbCarFilter(json.cn, containsValues, " OR ");
    const keyCondition = buildKeyCondition(json.orgId + ":RP", containsValues);

    //TODO: verify interaction of limit and filter. is it desirable?  tolerable?
    var params = {
        TableName: process.env.DynamoDbTable,
        Limit: 20,
        ScanIndexForward: false, // sort descending
        KeyConditionExpression: keyCondition,
        FilterExpression: carFIlterString + " AND attribute_not_exists (phr) ",
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddbQueryRpDuplicateCheck query: " + JSON.stringify(params));

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryRpDuplicateCheck: ", data); // successful response

        const udata = unmarshallResultsToArray(data, new EntityFactory({}));

        return udata.filter((rp) => !rp.phaseResults); // only return entries w/o results
    } catch (err) {
        console.log("ddbQueryRpDuplicateCheck failed: ", err, err.stack); // an error occurred
        throw err;
    }
};
const ddbQueryPkSk = async (pk, sk) => {
    const containsValues = {};
    containsValues[":pk"] = { S: pk };
    containsValues[":sk"] = { S: sk };
    const keyCondition = "PK = :pk and SK = :sk";

    var params = {
        TableName: process.env.DynamoDbTable,
        KeyConditionExpression: keyCondition,
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddbQueryPkSk query: " + JSON.stringify(params));

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryPkSk: ", data); // successful response
        const udata = unmarshallResultsToArray(data, new EntityFactory({}));

        if (udata && udata[0]) {
            return udata[0]; // exact key lookup should not get multipe entries
        } else {
            return null;
        }
    } catch (err) {
        console.log("ddbQueryPkSk failed: ", err, err.stack); // an error occurred
        throw err;
    }
};

//TODO: use ddbQueryPkSk
const ddbQueryBracketMdExistsCheck = async (json) => {
    const containsValues = {};
    containsValues[":pk"] = { S: json.orgId + ":Bmd" };
    containsValues[":sk"] = { S: json.SK };
    const keyCondition = "PK = :pk and SK = :sk";
    //const filterString = buildDdbCarFilter(json.cn, containsValues, " AND ");
    //const keyCondition = buildKeyCondition(json.orgId + ":Bmd", containsValues);

    var params = {
        TableName: process.env.DynamoDbTable,
        KeyConditionExpression: keyCondition,
        //FilterExpression: filterString,
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log(
        "ddbQueryBracketMdExistsCheck query: " + JSON.stringify(params)
    );

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryBracketMdExistsCheck: ", data); // successful response
        const udata = unmarshallResultsToArray(data, new EntityFactory({}));

        return udata;
    } catch (err) {
        console.log("ddbQueryBracketMdExistsCheck failed: ", err, err.stack); // an error occurred
        throw err;
    }
};
const ddbQueryRsExistsAndPendingCheck = async (json) => {
    const containsValues = {};
    const filterString = buildDdbCarFilter(json.cn, containsValues, " AND ");
    const keyCondition = buildKeyCondition(json.orgId + ":RS", containsValues);

    var params = {
        TableName: process.env.DynamoDbTable,

        KeyConditionExpression: keyCondition,
        FilterExpression: filterString,
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log(
        "ddbQueryRsExistsAndPendingCheck query: " + JSON.stringify(params)
    );

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryRsExistsAndPendingCheck: ", data); // successful response
        const udata = unmarshallResultsToArray(data, new EntityFactory({}));

        return udata.filter((rs) => rs.nextRace()); // only return entries that need to race
    } catch (err) {
        console.log("ddbQueryRsExistsAndPendingCheck failed: ", err, err.stack); // an error occurred
        throw err;
    }
};
/*
 cnList: input carNumber list
 containsValues: object that will have car number values added to 
 qualifier: s/b " AND " or " OR "
 */
const buildDdbCarFilter = (cnList, containsValues, qualifier = " OR ") => {
    var containsFilters = [];
    var skipDeleteFilter = "attribute_not_exists(del) ";
    if (!cnList || cnList.length == 0) {
        return skipDeleteFilter;
    }
    var i;
    for (i = 0; i < cnList.length; i++) {
        containsFilters[i] = "contains (cn, :cn" + i + ")";
        containsValues[":cn" + i] = { S: cnList[i] };
    }

    return skipDeleteFilter + " AND (" + containsFilters.join(qualifier) + ")";
};
const buildKeyCondition = (pk, containsValues) => {
    containsValues[":pk"] = { S: pk };
    return "PK = :pk";
};
/*
 **
 */
const ddbQueryRsAlreadyPending = async (json) => {
    const containsValues = {};
    const filterString = buildDdbCarFilter(json.cn, containsValues, " OR ");
    const filterPendingString =
        filterString + " AND attribute_not_exists(ph2) ";
    const keyCondition = buildKeyCondition(json.orgId + ":RS", containsValues);

    console.log("containsValues:", containsValues);
    var params = {
        TableName: process.env.DynamoDbTable,

        KeyConditionExpression: keyCondition,
        FilterExpression: filterPendingString,
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddb ddbQueryRsAlreadyPending: " + JSON.stringify(params));

    try {
        var data = await ddbClient.query(params);
        console.log("ddbQueryRsAlreadyPending: " + data); // successful response
        console.log("ddbQueryRsAlreadyPending: " + JSON.stringify(data)); // successful response
        return data.Count;
    } catch (err) {
        console.log("queryRsAlreadyPending failed: ", err, err.stack); // an error occurred
    }
    return 99;
};
/*
 **
 */
const ddbQueryRsContains = async (json) => {
    const containsValues = {};
    const filterString = buildDdbCarFilter(json.cn, containsValues, " OR ");
    const keyCondition = buildKeyCondition(json.orgId + ":RS", containsValues);

    console.log("containsValues:", containsValues);
    var params = {
        TableName: process.env.DynamoDbTable,

        KeyConditionExpression: keyCondition,
        FilterExpression: filterString,
        ReturnConsumedCapacity: "TOTAL",
        ExpressionAttributeValues: containsValues,
    };
    console.log("ddb query: " + JSON.stringify(params));

    try {
        var data = await ddbClient.query(params);
        console.log("queryRsContains: " + data); // successful response
        console.log("queryRsContains: " + JSON.stringify(data)); // successful response
        return data.Count;
    } catch (err) {
        console.log("queryRsContains failed: ", err, err.stack); // an error occurred
    }
    return 99;
};

const fmtBulkPut = (json1) => {
    const myP = entityFactory.build(json1);

    if (myP) {
        myP.preWrite();
        console.log("addBulk pw:", myP);
        var marshalled = AWS.DynamoDB.Converter.marshall(myP);
        console.log("addBulk mar:", marshalled);
        const putRequest = {
            PutRequest: {
                Item: marshalled,
            },
        };
        const uk = myP.partitionKey + ":" + myP.sortKey;
        return [uk, putRequest, myP];
    } else {
        console.log("addBulk ignored invalid:" + JSON.stringify(json1));
        return [null, null];
    }
};

const flushBulkRequests = async (requests) => {
    if (requests.length > 0) {
        var params = {
            RequestItems: {
                [process.env.DynamoDbTable]: requests,
            },
            ReturnConsumedCapacity: "TOTAL",
        };
        try {
            var data = await ddbClient.batchWriteItem(params);

            console.log("Added Bulk: " + JSON.stringify(data)); // successful response
            return requests.length; // TODO get from TotalProcessed;
        } catch (err) {
            console.log(err, err.stack); // an error occurred
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
    const [uk, putRequest, entity] = fmtBulkPut(json);
    if (putRequest && uk) {
        await flushBulkRequests([putRequest]);
        return { status: "ok", entity: entity };
    }
    return { error: "Invalid Request" };
};

const addPending2 = async (event) => {
    const eventKey = getEventKey(event);
    const cfg = await getConfig(eventKey);
    if (!cfg) {
        return {
            status: "error",
            error: "No Event config found.",
        };
    }

    const json = JSON.parse(event.body);
    console.log("BEGIN: addPending2: " + JSON.stringify(json));
    json.PK = ":RS"; // force RaceStanding

    const alreadyExists = await ddbQueryRsAlreadyPending(json);
    if (alreadyExists > 0) {
        return { error: "Pending2 already exists", status: "error" };
    }

    if (stringIsTrue(cfg.lcl1)) {
        //low car lane 1?
        json.cn.sort();
        console.log("addPending2: sorted: ", json.cn);
    } else {
        console.log("addPending2: unsorted: ", json.cn);
    }
    return await addSingle(json);
};
const stringIsTrue = (stringValue) => {
    return stringValue.toLowerCase() == "true" ? true : false;
};

const applyFinishTime = async (json) => {
    console.log("applyFinishTime 413: " + JSON.stringify(json));
    const tgtRpList = await ddbQueryRpByKey(json);
    if (tgtRpList.length == 0) {
        return {
            status: "error",
            error: "No eligible target for update.",
        };
    }
    const tgtRp = tgtRpList[0];
    tgtRp.phr = json.phr; //TODO: verify client sent array of ints in "phr"
    const rsPromise = ddbQueryRsByKey({ orgId: tgtRp.orgId, SK: tgtRp.rs });
    const rpUpdatePromise = addSingle(tgtRp);
    const [rsFoundList, rpUpdate] = await Promise.all([
        rsPromise,
        rpUpdatePromise,
    ]);

    console.log("applyFinishTime 413 rsFoundList: ", rsFoundList);

    if (rsFoundList.length > 0) {
        const tgtRs = rsFoundList[0];
        // match means A phase.
        const phase = tgtRp.phaseLiteral;
        console.log("applyFinishTime 413 phase: ", phase);

        if (phase === "A") {
            tgtRs.phase1Results = json.phr;
        } else {
            tgtRs.phase2Results = json.phr.reverse();
        }
        await addSingle(tgtRs);

        if (tgtRs.isComplete()) {
            if (tgtRs.isOverallTie()) {
                await cloneRs(tgtRs);
            } else {
                await advanceChartPos(tgtRs);
            }
        }
    } else {
        return {
            status: "error",
            error: "No raceStanding found!",
        };
    }

    return {
        status: "ok",
    };
};

// srcRs / bracketPos can be null.  Not both.
const advanceChartPos = async (srcRs, bracketPos) => {
    console.log("BEGIN: advanceChartPos");
    if (!srcRs && bracketPos) {
        //populate srcRS
        srcRs = await loadRaceStandingFromBracketPos(bracketPos);
        console.log("advanceChartPos loaded srcRS:", srcRs);
    } else if (srcRs && !bracketPos) {
        //populate bracketPos
        if (!srcRs.Bp) {
            console.log("advanceChartPos: not a raceBracket RS");
            return;
        }
        bracketPos = await loadBracketPosFromRaceStanding(srcRs);
        console.log("advanceChartPos loaded bracketPos:", bracketPos);
    }

    if (!srcRs && bracketPos.isReadyToAddPending) {
        await addPendingFromChartPos(srcRs, bracketPos);
        // new pending with participants won't need to advance.
        // fall thru to advance anyway to handle bye/forfeit.
    }

    console.log("advanceChartPos: Bp:", bracketPos.SK);
    const chartId = bracketPos.SK.replace(/:.*/, "");
    const heatNumber = bracketPos.SK.replace(/.*:/, "");
    const [bmd, combined] = await getCachedBmd(bracketPos.orgId, chartId);
    if (!combined) {
        console.log("advanceChartPos: missing combined json");
        return;
    }
    console.log("advanceChartPos: combined:", combined);
    if (!combined.progress) {
        console.log("advanceChartPos: missing combined json progress");
        return;
    }
    if (!combined.progress[heatNumber]) {
        console.log(
            "advanceChartPos: missing combined json progress for heat: ",
            heatNumber
        );
        return;
    }

    const progress = combined.progress[heatNumber];
    console.log("advanceChartPos: applying progress using: ", progress);
    const winnerDest = progress.WinnerDest;
    const loserDest = progress.LoserDest;
    let winnerPtcpObj = "";
    let loserPtcpObj = "";
    let winCount = 0;
    const readyToCede = bracketPos.isReadyToCedeUncontested;
    if (readyToCede) {
        console.log("advanceChartPos: readyToCede : ", readyToCede);

        await applyPtcpToChartPos(true, readyToCede.winner, winnerDest, bmd);
        await applyPtcpToChartPos(false, readyToCede.loser, loserDest, bmd);
        return;
    }

    if (!srcRs) {
        return;
    }

    if (srcRs.isComplete && srcRs.isWinner(1, 0)) {
        //  the car that started in l1 for phase1 won overall.
        winnerPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[0]);
        loserPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[1]);
        winCount++;
    }

    if (srcRs.isComplete && srcRs.isWinner(2, 0)) {
        //  the car that started in l2 for phase1 won overall.
        winnerPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[1]);
        loserPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[0]);
        winCount++;
    }

    // winCount will be 2 if there is overall tie.   don't advance.
    if (winCount === 1) {
        await applyPtcpToChartPos(true, winnerPtcpObj, winnerDest, bmd);
        await applyPtcpToChartPos(false, loserPtcpObj, loserDest, bmd);
    }
};

const loadRaceStandingFromBracketPos = async (bracketPos) => {
    //TODO: override RS add to use bracketPos SK for RS SK
    return await ddbQueryPkSk(`${bracketPos.orgId}:RS`, bracketPos.SK);
};
const loadBracketPosFromRaceStanding = async (rs) => {
    return await ddbQueryPkSk(`${rs.orgId}:Bp`, rs.Bp);
};

const addPendingFromChartPos = async (rs, bracketPos) => {
    if (rs) {
        console.log("addPendingFromChartPos: standing down, rs exists.");
        return;
    }

    console.log(
        "BEGIN addPendingFromChartPos: isReadyToAddPending:",
        bracketPos.isReadyToAddPending
    );
    if (bracketPos.isReadyToAddPending) {
        console.log("isReadyToAddPending Bp:", bracketPos);
        await addPending2({
            body: JSON.stringify({
                orgId: bracketPos.orgId,
                orgIz: bracketPos.orgId.replace(/\..*/, ""), // TODO: unhack orgIz
                Bp: bracketPos.SK,
                //TODO: what about tie->rerace key??
                SK: bracketPos.SK, // common SK for loadRaceStandingFromBracketPos
                cn: [
                    bracketPos.getPtcpNumber("A"),
                    bracketPos.getPtcpNumber("B"),
                ],
            }),
        });
        //TODO: leave some footprints in the butter so that the user knows what happened!
    }
};

const getChartDestination = (destinationChartPos, srcHeatLetter, didWin) => {
    //allow syntax like:
    //WinnerDest: '(AWINS?Place1:11B)',
    //LoserDest: '(AWINS?Place2:11A)'
    const aWins = srcHeatLetter === "A" ? didWin : !didWin;

    if (destinationChartPos.match(/AWINS?/)) {
        destinationChartPos = destinationChartPos.replace("(", "");
        destinationChartPos = destinationChartPos.replace(")", "");
        destinationChartPos = destinationChartPos.replace("AWINS?", "");
        const [aWinDest, bWinDest] = destinationChartPos.split(":");
        //TODO: consider actual winner instead of just src!
        if (aWins) {
            destinationChartPos = aWinDest;
        } else {
            destinationChartPos = bWinDest;
        }
        console.log(
            "getChartDestination resolved conditional as: ",
            destinationChartPos,
            " srcHeatLetter: ",
            srcHeatLetter,
            " aWins: ",
            aWins
        );
    }
    const destHeatLetter = destinationChartPos.replace(/^[0-9]*/, "");
    const destHeatNumber = destinationChartPos.replace(/[a-zA-Z]*$/, "");

    return [destHeatNumber, destHeatLetter];
};
const applyPtcpToChartPos = async (
    didWin,
    ptcpObject,
    destinationChartPos,
    bmd
) => {
    const srcHeatLetter = ptcpObject.heatLetter;
    delete ptcpObject.heatLetter;

    const [destHeatNumber, destHeatLetter] = getChartDestination(
        destinationChartPos,
        srcHeatLetter,
        didWin
    );

    const sk = `${bmd.SK}:${destHeatNumber}`;
    console.log(
        "BEGIN: applyPtcpToChartPos: ptcp:",
        ptcpObject,
        " destinationChartPos: ",
        destinationChartPos
    );
    //const tgtBracketPos = await ddbQueryPkSk(`${bmd.orgId}:Bp`, sk);
    //console.log("applyPtcpToChartPos: found:", tgtBracketPos);
    const tgtBracketPos = {
        orgId: bmd.orgId,
        orgIz: bmd.orgId.replace(/\..*/, ""), // TODO: unhack orgIz
        chartId: bmd.SK,
        pos: {},
        heatNumber: destHeatNumber,
    };
    tgtBracketPos.pos[destHeatLetter] = ptcpObject;
    // this may recurse... (consider bye/forfeit/2nd racer advances, needs pending)
    console.log(
        "applyPtcpToChartPos: potential recursion into addOrUpdateChartPosition:",
        tgtBracketPos
    );
    await addOrUpdateChartPosition(tgtBracketPos);
};

const cloneRs = async (srcRs) => {
    const clone = {
        PK: ":RS", // force RacePhase
        cn: srcRs.cn,
        orgId: srcRs.orgId,
        by: srcRs.by,
    };
    console.log("cloneRs: ", JSON.stringify(clone));
    return await addSingle(clone);
};

const deleteRacePhase = async (json) => {
    console.log("deleteRacePhase: " + JSON.stringify(json));
    const rpFound = await ddbQueryPkSk(`${json.orgId}:RP`, json.SK);
    console.log("rpFound", rpFound);

    //only allow delete on blocks.  no deleting historical data
    if (!rpFound) {
        return {
            status: "error",
            error: "Cannot delete RacePhase. Not found.",
        };
    }
    if (rpFound.phr) {
        return {
            status: "error",
            error: "Cannot delete RacePhase with results.",
        };
    }
    rpFound.del = true;
    return await addSingle(rpFound);
};
const deleteRaceStanding = async (json) => {
    console.log("deleteRaceStanding: " + JSON.stringify(json));
};
const addBlocks = async (json) => {
    console.log("addBlocks: " + JSON.stringify(json));
    json.PK = ":RP"; // force RacePhase

    const waitRp = ddbQueryRpDuplicateCheck(json);
    const waitRs = ddbQueryRsExistsAndPendingCheck(json);
    const [rpFound, rsFound] = await Promise.all([waitRp, waitRs]);
    console.log("rpFound", rpFound);
    console.log("rsFound", rsFound);
    if (rsFound.length == 0) {
        return {
            status: "error",
            error: "No Pending race found",
        };
    }
    if (rsFound[0].nextRace().toString() == json.cn.toString()) {
    } else {
        return {
            status: "error",

            error: "Cars in wrong lane(s)",
            expected: rsFound[0].nextRace().toString(),
            requested: json.cn.toString(),
        };
    }
    if (rpFound.length > 0) {
        return {
            status: "error",
            error:
                "Car(s) already loaded on blocks:" +
                rpFound[0].carNumbers.toString(),
        };
    }

    // link racePhase to RaceStanding!
    json["rs"] = rsFound[0].SK;

    json["pl"] = rsFound[0].getPhaseLiteral(json.cn);
    if (rsFound[0].Bp) json["Bp"] = rsFound[0].Bp;

    return await addSingle(json);
};

const addChartMetaData = async (json) => {
    console.log("addChartMetaData: " + JSON.stringify(json));
    json.PK = ":Bmd"; // force BracketMetaData
    if (!json.SK) {
        const uu6 = create_UUID().substring(0, 6);
        json.SK = uu6;
    }

    const bmdFound = await ddbQueryBracketMdExistsCheck(json);
    console.log("bmdFound", bmdFound);
    if (bmdFound.length == 0) {
        console.log("addChartMetaData add needed:", bmdFound);
        // fall thru to  Add
    } else {
        console.log("addChartMetaData update needed:", bmdFound);
        // update name.  TODO:  actual db update needed?
    }

    const rc = await addSingle(json);

    rc.chartId = json.SK.replace(/:.*/, "");
    console.log("addChartMetaData returning: ", rc);
    return rc;
};
const getCachedBmd = async (orgId, chartId) => {
    const tmpCache = new TmpCache(AWS, ddbClient, s3);

    const bmd = await tmpCache.getObject({
        //PK: `${json.orgId}:Bmd`,
        //SK: posRC.entity.chartId,
        PK: `${orgId}:Bmd`,
        SK: chartId,
    });
    console.log("found cached bmd:", bmd);
    if (bmd) {
        const combinedJson = await tmpCache.getObject({
            Bucket: process.env.ChartS3BucketName,
            Key: "data/brackets" + "/" + bmd.jsonPath,
        });
        console.log("found cached combined:", combinedJson);
        return [bmd, combinedJson];
    }
    return [];
};
const addOrUpdateChartPosition = async (json) => {
    console.log("BEGIN: addOrUpdateChartPosition: " + JSON.stringify(json));

    json.PK = ":Bp"; // force BracketPosition
    if (!json.SK) {
        json.SK = `${json.chartId}:${json.heatNumber}`;
    }

    const posFound = await ddbQueryPkSk(`${json.orgId}:Bp`, json.SK);
    console.log("posFound", posFound);
    if (!posFound) {
        console.log("addOrUpdateChartPosition add needed:", posFound);
        // Add
        //return await addSingle(json);
    } else {
        console.log("addOrUpdateChartPosition update needed:", posFound);
        const mergedPos = Object.assign(posFound.pos, json.pos);
        console.log("addOrUpdateChartPosition mergedPos:", mergedPos);
        json = posFound;
        json.pos = mergedPos;
    }

    const posRC = await addSingle(json);

    if (posRC.status == "ok" && posRC.entity) {
        const posE = posRC.entity;
        await advanceChartPos(null, posE);
    }
    return posRC;
};

const addOrgConfig = async (json) => {
    console.log("addOrgConfig: " + JSON.stringify(json));
    json.PK = "OrgConfig"; // force
    json.SK = json.orgIz; // force
    const by = entityFactory.propOverrides.by;
    entityFactory = new EntityFactory({ orgIz: json.orgIz, by: by });

    return await addSingle(json);
};
const addEventConfig = async (json, priorTtl) => {
    console.log("addEventConfig: " + JSON.stringify(json));
    if (!json.orgIz) {
        return { error: "Missing orgIz" };
    }
    if (!json.orgId) {
        return { error: "Missing orgId" };
    }

    json.PK = "EventConfig"; // force
    json.SK = json.orgIz + ":" + json.orgId; // force

    // use prior ttl if found (API cannot change ttl of in progress event!)
    const newTtl = priorTtl
        ? priorTtl
        : Math.round(new Date().getTime() / 1000) + 3600 * 24 * 1;

    json.TTL = newTtl;

    const by = entityFactory.propOverrides.by;
    entityFactory = new EntityFactory({
        orgId: json.orgId,
        by: by,
        TTL: json.TTL,
    });

    return await addSingle(json);
};
const addParticipant2 = async (json) => {
    console.log("addParticipant2: " + JSON.stringify(json));
    json.PK = ":PTCP"; // force Participant
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
};
const getOrgIz = (event) => {
    if (event.body) {
        return JSON.parse(event.body).orgIz;
    }
    if (event.queryStringParameters) {
        return event.queryStringParameters.orgIz;
    }
    return null;
};
const getEventKey = (event) => {
    return getOrgIz(event) + ":" + getOrgId(event);
};
const routeMap = {
    "/addParticipant": {
        h: async (event) => {
            return buildResponse(await addParticipant2(JSON.parse(event.body)));
        },
    },
    "/addPending": {
        h: async (event) => {
            return buildResponse(await addPending2(event));
        },
    },
    "/addBlocks": {
        h: async (event) => {
            return buildResponse(await addBlocks(JSON.parse(event.body)));
        },
    },
    "/deleteRacePhase": {
        h: async (event) => {
            return buildResponse(await deleteRacePhase(JSON.parse(event.body)));
        },
    },
    "/deleteRaceStanding": {
        h: async (event) => {
            return buildResponse(
                await deleteRaceStanding(JSON.parse(event.body))
            );
        },
    },
    "/addChart": {
        h: async (event) => {
            return buildResponse(
                await addChartMetaData(JSON.parse(event.body))
            );
        },
    },
    "/addChartPosition": {
        h: async (event) => {
            return buildResponse(
                await addOrUpdateChartPosition(JSON.parse(event.body))
            );
        },
    },
    "/doApplyFinishTime": {
        h: async (event) => {
            return buildResponse(await applyFinishTime(JSON.parse(event.body)));
        },
    },
    "/addBulk": {
        h: async (event) => {
            return buildResponse(await addBulk(JSON.parse(event.body)));
        },
    },
    "/ddbQuery": {
        h: async (event) => {
            var qr = await ddbQueryRsContains(JSON.parse(event.body));
            console.log("ddbQuery: " + qr);
            return buildResponse({ Count: qr });
        },
    },
    "/getNextOnBlocks": {
        h: async (event) => {
            const nob = await ddbQueryRpNextOnBlocks(
                event.queryStringParameters
            );
            return buildResponse(nob);
        },
    },
    "/getRaceHistory": {
        h: async (event) => {
            var [qr, cacheMaxSeconds] = await ddbQueryRaceHistory(
                event.queryStringParameters
            );
            const cacheControl = "max-age=" + cacheMaxSeconds;
            return buildResponse(qr, cacheControl);
        },
    },
    "/listChartTypes": {
        h: async (event) => {
            var chartTypes = await s3QueryChartTypes();
            const cacheControl = "max-age=" + 3600 * 24 * 7;
            return buildResponse(chartTypes, cacheControl);
        },
    },
};

const buildResponse = (jsonObj, cacheControl = "no-cache") => {
    if (jsonObj && jsonObj.error) {
        console.log("buildResponse: error:  ", jsonObj);
    }
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": cacheControl,
        },
        body: JSON.stringify(jsonObj),
    };
};

exports.handler = async (event) => {
    const dbArn = process.env.DynamoDbArn;

    // Allow Cors
    /*
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
	*/

    console.log("event.path: ", event.path);

    const routePath = event.path.replace(/^\/app/, "");
    if (routePath === "/listOrgEvents") {
        const qr = await ddbListEventConfigByOrg(getOrgIz(event));
        console.log("getEventConfig 23232:", qr);
        return buildResponse(qr, "max-age=307");
    }
    if (routePath === "/listOrgConfig") {
        const qr = await ddbQueryOrgConfig();
        console.log("listOrgConfig :", qr);
        return buildResponse(qr, "max-age=1807");
    }

    const decoded = jwt.decode(event.headers.Authorization);
    const eventKey = getEventKey(event);
    const orgId = getOrgId(event);
    const orgIz = getOrgIz(event);
    const defaultTTL = await getTtl(eventKey);

    entityFactory = new EntityFactory({
        orgId: orgId,
        by: decoded.email,
        TTL: defaultTTL,
    });
    console.log("Begin event", event);

    const email = decoded.email;
    if (email && hasServerRoutePath(email, routePath)) {
        console.log(`allowing access to ${routePath} for [${email}]`);
    } else {
        console.log(`prohibiting access to ${routePath} for [${email}]`);
        return buildResponse({ error: "unauthorized" });
    }

    if (false) {
    } else if (!orgId) {
        const qr = { error: "Unable to determine orgId" };
        return buildResponse(qr);
    } else if (!orgIz) {
        const qr = { error: "Unable to determine orgIz" };
        return buildResponse(qr);
    } else if (routePath === "/addEventConfig") {
        //var [qr, cacheMaxSeconds] = await ddbQueryRaceHistory(event.queryStringParameters);
        const jsonRC = await addEventConfig(JSON.parse(event.body), defaultTTL);
        return buildResponse(jsonRC);
    }
    //else if (routePath === "/addOrgConfig") {
    //	const jsonRC = await addOrgConfig(JSON.parse(event.body) );
    //	return buildResponse(jsonRC);
    //}
    else if (!defaultTTL) {
        const qr = { error: "Unable to determine default TTL" };
        return buildResponse(qr);
    } else if (routeMap[routePath] && routeMap[routePath].h) {
        console.log(
            "ph routeMap handling: " + routePath,
            " object:",
            routeMap[routePath]
        );

        const phandler = routeMap[routePath].h;
        console.log("routeMap handling: " + phandler);

        return await phandler(event);
        console.log("routeMap handled: " + routePath);
    }

    console.log("Unhandled Path: " + routePath + " ep: " + event.path);
    return buildResponse({
        status: "unhandled",
        error: "Unhandled",
    });
};

// changed.
