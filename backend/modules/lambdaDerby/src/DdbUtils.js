const EntityFactory = require("./shared/EntityFactory.js");
const log = require("loglevel");
const requestContext = require("./RequestContext");
const {
    BatchWriteItemCommand,
    QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { SendMessageCommand } = require("@aws-sdk/client-sqs");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const skipDeleteFilter = "attribute_not_exists(del) ";
var configMap = {};

class DdbUtils {
    ddbClient = null;
    ddocClient = null;
    sqs = null;

    constructor(ddbClient, sqs, documentClient) {
        this.ddbClient = ddbClient;
        this.sqs = sqs;
        this.ddocClient =
            documentClient ||
            DynamoDBDocumentClient.from(ddbClient, {
                marshallOptions: {
                    convertClassInstanceToMap: true,
                    removeUndefinedValues: true,
                },
            });
    }
    getEntityFactory() {
        return requestContext.getEntityFactory();
    }
    /*
     ** sometimes we'll get just event id without org id.
     **   infer org id from event key and build the full key
     */
    expandEventKey(eventKey) {
        if (eventKey.includes(":")) {
            return eventKey; // don't mess with it.
        }
        const org = eventKey.replace(/\..*/, "");

        return `${org}:${eventKey}`;
    }
    flushEventCache() {
        //configMap.clear();
        configMap = {};
    }

    /*
     * browser should always send it's config timestamp in a header.
     * if lambda gets a newer timestamp than is cached, consider cache stale and delete it
     */
    potentialFlushStaleCache(eventKey, eventHeaders) {
        if (!eventHeaders) eventHeaders = {};

        log.debug(
            `potentialFlushStaleCache cache keys: `,
            JSON.stringify(Object.keys(configMap))
        );
        log.debug(
            `potentialFlushStaleCache headers: `,
            JSON.stringify(Object.keys(eventHeaders))
        );
        if (configMap[eventKey] && eventHeaders["x-event-ts"]) {
            var cachedAt = parseInt(configMap[eventKey].at);
            var browserAt = parseInt(eventHeaders["x-event-ts"]);
            log.debug(
                `potentialFlushStaleCache cache potential: [${cachedAt}] [${browserAt}] `
            );

            if (cachedAt && browserAt && browserAt > cachedAt) {
                log.debug(
                    "potentialFlushStaleCache deleting stale: " + eventKey
                );
                delete configMap[eventKey];
            } else {
                log.debug("potentialFlushStaleCache cache good: " + eventKey);
            }
        } else {
            log.debug("potentialFlushStaleCache cache miss: " + eventKey);
        }
    }

    async getEventConfig(eventKey, eventHeaders) {
        eventKey = this.expandEventKey(eventKey);
        this.potentialFlushStaleCache(eventKey, eventHeaders);
        if (configMap[eventKey]) {
            return configMap[eventKey];
        }

        var eConfig = await this.ddbQueryEventConfig(eventKey);
        if (eConfig[eventKey]) {
            configMap[eventKey] = eConfig[eventKey];
            return eConfig[eventKey];
        }

        return undefined;
    }
    async ddbPut(item, tableName = process.env.DynamoDbTable) {
        var rc = "Pending";
        const dbItem = {
            TableName: tableName,
            Item: item,
        };
        try {
            await this.ddocClient.send(new PutCommand(dbItem));

            log.debug("Added dbItem: " + JSON.stringify(dbItem));
            rc = "OK";
        } catch (err) {
            log.debug(err, err.stack); // an error occurred
            rc = "Error";
        }
        return rc;
    }
    async ddbQueryRawPkSk(pk, sk, tableName = process.env.DynamoDbTable) {
        const containsValues = {};
        containsValues[":pk"] = { S: pk };
        containsValues[":sk"] = { S: sk };
        const keyCondition = "PK = :pk and SK = :sk";

        var params = {
            TableName: tableName,
            KeyConditionExpression: keyCondition,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryPkSk query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryRawPkSk: ", data); // successful response
            return data;
        } catch (err) {
            log.debug("ddbQueryRawPkSk failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }
    async ddbQueryPkSk(pk, sk, tableName = process.env.DynamoDbTable) {
        try {
            const data = await this.ddbQueryRawPkSk(pk, sk, tableName);
            var factory = new EntityFactory({});
            if (process.env.ElapsedTempDbTable === tableName) {
                factory = null;
            }
            const udata = this.unmarshallResultsToArray(data, factory);

            if (udata && udata[0]) {
                return udata[0]; // exact key lookup should not get multipe entries
            } else {
                return null;
            }
        } catch (err) {
            log.debug("ddbQueryPkSk failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }

    async ddbQueryPkAll(pk, tableName = process.env.DynamoDbTable) {
        const containsValues = {};
        containsValues[":pk"] = { S: pk };
        const keyCondition = "PK = :pk ";

        var params = {
            TableName: tableName,
            KeyConditionExpression: keyCondition,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryPkAll query: " + JSON.stringify(params));

        const factory =
            tableName === process.env.DynamoDbTable
                ? new EntityFactory({})
                : undefined;
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryPkAll: raw:", data); // successful response
            const udata = this.unmarshallResultsToArray(data, factory);
            log.debug("ddbQueryPkAll: unmar ", udata); // successful response
            return udata;
        } catch (err) {
            log.debug("ddbQueryPkAll failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }
    promoteToObject(unmarshalled, factory) {
        if (factory) {
            return factory.build(unmarshalled);
        } else {
            return unmarshalled;
        }
    }
    unmarshallResults(data, factory) {
        const results = [];
        for (var i = 0; i < data.Items.length; i++) {
            var unmarshalled = unmarshall(data.Items[i]);
            // Callers pass no factory for timerDB rows; those should remain plain objects.
            unmarshalled = this.promoteToObject(unmarshalled, factory);
            if (unmarshalled) {
                results.push(unmarshalled);
            }
        }
        return results;
    }
    unmarshallResultsToArray(data, factory) {
        return this.unmarshallResults(data, factory);
    }
    unmarshallResultsToObject(data, key, factory) {
        const rc = {};

        for (const unmarshalled of this.unmarshallResults(data, factory)) {
            rc[unmarshalled[key]] = unmarshalled;
        }
        return rc;
    }

    async getTimerConfigByOrgId(orgId) {
        const timerConfig = await this.ddbQueryPkSk(
            `${orgId}:TimerConfig`,
            "TimerConfig"
        );
        return timerConfig;
    }
    async ddbQueryTimerPbHistory(timerName, loIso, hiIso) {
        var containsValues = {};
        containsValues[":pk"] = { S: `T:${timerName}` };
        containsValues[":loIso"] = { S: loIso };
        containsValues[":hiIso"] = { S: hiIso };
        var params = {
            TableName: process.env.TimerProtobufDbTable,
            KeyConditionExpression:
                "PK = :pk and SK BETWEEN :loIso  and :hiIso",
            ReturnConsumedCapacity: "TOTAL",
            ScanIndexForward: false, // sort descending
            ExpressionAttributeValues: containsValues,
        };
        log.debug("history query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            const cc = data.ConsumedCapacity.CapacityUnits;
            log.debug("ddbQueryTimerPbHistory cc: ", cc); // successful response
            log.debug("ddbQueryTimerPbHistory: ", data); // successful response
            log.debug("ddbQueryTimerPbHistory: " + JSON.stringify(data)); // successful response
            const rc = this.unmarshallResultsToArray(data);
            for (const item of rc) {
                if (item.data) {
                    //Buffer->JSON Sucks (large/verbose)
                    item.data64 = Buffer.from(item.data).toString("base64");
                    delete item.data;
                }
            }

            return rc;
        } catch (err) {
            log.debug("ddbQueryTimerPbHistory failed: ", err, err.stack); // an error occurred
        }
        return {
            error: "ddbQueryTimerPbHistory Failed",
        };
    }
    async ddbQueryTimerHistoryByUuid(uuid) {
        var containsValues = {};
        containsValues[":pk"] = { S: uuid };
        const loIso = new Date(
            new Date().getTime() - 1000 * 3600 * 10
        ).toISOString();
        containsValues[":loIso"] = { S: loIso };
        var params = {
            TableName: process.env.TimerDbTable,
            KeyConditionExpression: "PK = :pk and SK > :loIso  ",
            ReturnConsumedCapacity: "TOTAL",
            ScanIndexForward: false, // sort descending
            ExpressionAttributeValues: containsValues,
        };
        log.debug("history query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            const cc = data.ConsumedCapacity.CapacityUnits;
            log.debug("ddbQueryTimerHistoryByUuid cc: ", cc); // successful response
            log.debug("ddbQueryTimerHistoryByUuid: ", data); // successful response
            log.debug("ddbQueryTimerHistoryByUuid: " + JSON.stringify(data)); // successful response
            const rc = this.unmarshallResultsToArray(data);

            return rc;
        } catch (err) {
            log.debug("ddbQueryTimerHistoryByUuid failed: ", err, err.stack); // an error occurred
        }
        return {
            error: "ddbQueryTimerHistoryByUuid Failed",
        };
    }

    // Migrated july 3 2020
    async ddbQueryRaceHistory(qsp) {
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
            cacheMaxSeconds = 7; // would prefer longer, pending resolution of mqtt issues.
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
            //Limit: limit,
            ScanIndexForward: false, // sort descending
            ExpressionAttributeValues: containsValues,
        };
        log.debug("history query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            const cc = data.ConsumedCapacity.CapacityUnits;
            log.debug("queryRaceHistory cc: ", cc); // successful response
            log.debug("queryRaceHistory: ", data); // successful response
            log.debug("queryRaceHistory: " + JSON.stringify(data)); // successful response
            const rc = this.unmarshallResultsToArray(data);

            if (cc > 0.5 || data.Count >= limit) {
                log.debug("queryRaceHistory: requesting CCA: ", cc);
                await this.requestCC(qsp, "CCA");
            } else {
                log.debug("queryRaceHistory: skipping CCA: ", cc);
            }

            return [rc, cacheMaxSeconds];
        } catch (err) {
            log.debug("queryRaceHistory failed: ", err, err.stack); // an error occurred
        }
        return [{ error: "Query History Failed" }, 5];
    }
    async ddbQueryEventConfig(eventKey) {
        var containsValues = {};
        containsValues[":pk"] = { S: "EventConfig" };
        containsValues[":sk"] = { S: eventKey };
        var params = {
            TableName: process.env.DynamoDbTable,
            KeyConditionExpression: "PK = :pk" + " and  SK = :sk",
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddb query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryEventConfig: ", data); // successful response
            return this.unmarshallResultsToObject(data, "SK");
        } catch (err) {
            log.debug("ddbQueryEventConfig failed: ", err, err.stack); // an error occurred
        }
        return { error: "Query Failed" };
    }
    async ddbListEventConfigByOrg(orgIz) {
        var containsValues = {};
        containsValues[":pk"] = { S: "EventConfig" };
        containsValues[":sk"] = { S: orgIz + ":" };
        var params = {
            TableName: process.env.DynamoDbTable,
            KeyConditionExpression: "PK = :pk" + " and  begins_with (SK, :sk)",
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddb query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryEventConfig: ", data); // successful response
            return this.unmarshallResultsToObject(data, "SK");
        } catch (err) {
            log.debug("ddbQueryEventConfig failed: ", err, err.stack); // an error occurred
        }
        return { error: "Query Failed" };
    }
    async ddbQueryOrgPerms(json) {
        const containsValues = {};
        const keyCondition = this.buildKeyCondition(
            json.orgIz + ":OrgPerm",
            containsValues
        );
        //containsValues[":sk"] = { S: json.SK };
        var params = {
            TableName: process.env.DynamoDbTable,
            KeyConditionExpression: keyCondition,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryOrgPerms query : " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryOrgPerms: ", data); // successful response
            var candidates = this.unmarshallResultsToObject(data, "SK");
            candidates = Object.values(candidates);
            const nowEpochSeconds = Math.round(new Date().getTime() / 1000);

            // remove expired candidates
            candidates = candidates.filter(
                (ouser) => !(ouser.TTL && ouser.TTL < nowEpochSeconds)
            );
            return candidates;
        } catch (err) {
            log.debug("ddbQueryOrgPerms failed: ", err, err.stack); // an error occurred
        }
        return { error: "Query OrgPerms Failed" };
    }
    async ddbQueryOrgConfig() {
        var containsValues = {};
        containsValues[":pk"] = { S: "OrgConfig" };
        var params = {
            TableName: process.env.DynamoDbTable,
            KeyConditionExpression: "PK = :pk",
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryOrgConfig query : " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryOrgConfig: ", data); // successful response
            return this.unmarshallResultsToObject(data, "SK");
        } catch (err) {
            log.debug("ddbQueryOrgConfig failed: ", err, err.stack); // an error occurred
        }
        return { error: "Query OrgFailed" };
    }
    /*
     ** Lookup RP by exact PK/SK
     */
    async ddbQueryRsByKey(json) {
        const containsValues = {};
        const keyCondition = this.buildKeyCondition(
            json.orgId + ":RS",
            containsValues
        );
        containsValues[":sk"] = { S: json.SK };

        var params = {
            TableName: process.env.DynamoDbTable,
            Limit: 20,
            ScanIndexForward: false, // sort descending
            KeyConditionExpression: keyCondition + " and  SK = :sk",
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryRsByKey query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryRsByKey: ", data); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata;
        } catch (err) {
            log.debug("ddbQueryRsByKey failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }
    /*
     ** Lookup RP by exact PK/SK
     */
    async ddbQueryRpByKey(json) {
        const containsValues = {};
        const keyCondition = this.buildKeyCondition(
            json.orgId + ":RP",
            containsValues
        );
        containsValues[":sk"] = { S: json.SK };

        var params = {
            TableName: process.env.DynamoDbTable,
            Limit: 20,
            ScanIndexForward: false, // sort descending
            KeyConditionExpression: keyCondition + " and  SK = :sk",
            FilterExpression: ` ${skipDeleteFilter} AND attribute_not_exists (phr) `,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryRpByKey query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryRpByKey: ", data); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rp) => !rp.phaseResults); // only return entries w/o results
        } catch (err) {
            log.debug("ddbQueryRpByKey failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }
    /*
     **
     */
    async ddbQueryRpNextOnBlocks(json) {
        const containsValues = {};
        const keyCondition = this.buildKeyCondition(
            json.orgId + ":RP",
            containsValues
        );

        var params = {
            TableName: process.env.DynamoDbTable,
            Limit: 20,
            ConsistentRead: true, // consistent for timer apply safety!
            ScanIndexForward: false, // sort descending
            KeyConditionExpression: keyCondition,
            FilterExpression: `${skipDeleteFilter} AND attribute_not_exists (phr) `,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryRpNextOnBlocks query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryRpNextOnBlocks: ", JSON.stringify(data)); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rp) => !rp.phaseResults).reverse(); // only return entries w/o results
        } catch (err) {
            log.debug("ddbQueryRpNextOnBlocks failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }
    /*
     ** Any given car should have at most one entry "on the blocks"
     */
    async ddbQueryRpDuplicateCheck(json) {
        const containsValues = {};
        const carFIlterString = this.buildDdbCarFilter(
            json.cn,
            containsValues,
            " OR "
        );
        const keyCondition = this.buildKeyCondition(
            json.orgId + ":RP",
            containsValues
        );

        //TODO: verify interaction of limit and filter. is it desirable?  tolerable?
        var params = {
            TableName: process.env.DynamoDbTable,
            Limit: 20,
            ScanIndexForward: false, // sort descending
            KeyConditionExpression: keyCondition,
            FilterExpression:
                carFIlterString + " AND attribute_not_exists (phr) ",
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddbQueryRpDuplicateCheck query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryRpDuplicateCheck: ", data); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rp) => !rp.phaseResults); // only return entries w/o results
        } catch (err) {
            log.debug("ddbQueryRpDuplicateCheck failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }

    //TODO: use ddbQueryPkSk
    async ddbQueryBracketMdExistsCheck(json) {
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
        log.debug(
            "ddbQueryBracketMdExistsCheck query: " + JSON.stringify(params)
        );

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryBracketMdExistsCheck: ", data); // successful response
            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata;
        } catch (err) {
            log.debug("ddbQueryBracketMdExistsCheck failed: ", err, err.stack); // an error occurred
            throw err;
        }
    }
    async ddbQueryRsExistsAndPendingCheck(json) {
        const containsValues = {};
        const filterString = this.buildDdbCarFilter(
            json.cn,
            containsValues,
            " AND "
        );
        const keyCondition = this.buildKeyCondition(
            json.orgId + ":RS",
            containsValues
        );

        var params = {
            TableName: process.env.DynamoDbTable,

            KeyConditionExpression: keyCondition,
            FilterExpression: filterString,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug(
            "ddbQueryRsExistsAndPendingCheck query: " + JSON.stringify(params)
        );

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryRsExistsAndPendingCheck: ", data); // successful response
            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rs) => rs.nextRace()); // only return entries that need to race
        } catch (err) {
            log.debug(
                "ddbQueryRsExistsAndPendingCheck failed: ",
                err,
                err.stack
            ); // an error occurred
            throw err;
        }
    }
    /*
     cnList: input carNumber list
     containsValues: object that will have car number values added to 
     qualifier: s/b " AND " or " OR "
     */
    buildDdbCarFilter(cnList, containsValues, qualifier = " OR ") {
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

        return (
            skipDeleteFilter + " AND (" + containsFilters.join(qualifier) + ")"
        );
    }
    buildKeyCondition(pk, containsValues) {
        containsValues[":pk"] = { S: pk };
        return "PK = :pk";
    }
    /*
     **
     */
    async ddbQueryRsAlreadyPending(json, pendingRule) {
        // legacy check is " OR " (car can only be in 1Race at a time) --default
        // new feature is " AND " (car can only be in 1Pair at a time)
        const conjuction = pendingRule === "1Pair" ? " AND " : " OR ";
        const containsValues = {};
        const filterString = this.buildDdbCarFilter(
            json.cn,
            containsValues,
            conjuction
        );
        const filterPendingString =
            filterString + " AND attribute_not_exists(ph2) ";
        const keyCondition = this.buildKeyCondition(
            json.orgId + ":RS",
            containsValues
        );

        var params = {
            TableName: process.env.DynamoDbTable,

            KeyConditionExpression: keyCondition,
            FilterExpression: filterPendingString,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddb ddbQueryRsAlreadyPending: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("ddbQueryRsAlreadyPending: " + data); // successful response
            log.debug("ddbQueryRsAlreadyPending: " + JSON.stringify(data)); // successful response
            if (data.Count > 0) {
                return this.fmtPendingError(data, json.cn);
            }
            return ""; // no errors.
        } catch (err) {
            log.debug("queryRsAlreadyPending failed: ", err, err.stack); // an error occurred
        }
        // if there was an error, lambda will  fail.   that is ok here.  nothing returned
    }
    fmtPendingError(data, cnList) {
        log.debug("fmtPendingError looking:", cnList);
        const offenders = {};
        cnList.forEach((tgtCn) => {
            data.Items.forEach((item) => {
                item.cn.L.forEach((itemCn) => {
                    if (tgtCn === itemCn.S) {
                        log.debug("fmtPendingError found offender:", tgtCn);
                        offenders[tgtCn] = "Already Pending";
                    }
                });
            });
        });

        return Object.keys(offenders).join(",");
    }
    /*
     **
     */
    async ddbQueryRsContains(json) {
        const containsValues = {};
        const filterString = this.buildDdbCarFilter(
            json.cn,
            containsValues,
            " OR "
        );
        const keyCondition = this.buildKeyCondition(
            json.orgId + ":RS",
            containsValues
        );

        var params = {
            TableName: process.env.DynamoDbTable,

            KeyConditionExpression: keyCondition,
            FilterExpression: filterString,
            ReturnConsumedCapacity: "TOTAL",
            ExpressionAttributeValues: containsValues,
        };
        log.debug("ddb query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.send(new QueryCommand(params));
            log.debug("queryRsContains: " + data); // successful response
            log.debug("queryRsContains: " + JSON.stringify(data)); // successful response
            return data.Count;
        } catch (err) {
            log.debug("queryRsContains failed: ", err, err.stack); // an error occurred
        }
        return 99;
    }

    fmtBulkPut(json1) {
        const myP = this.getEntityFactory().build(json1);

        if (myP) {
            myP.preWrite();
            log.debug("fmtBulkPut pw:", myP);
            var marshalled = marshall(myP, {
                convertClassInstanceToMap: true,
                convertTopLevelContainer: false,
                removeUndefinedValues: true,
            });
            log.debug("fmtBulkPut mar:", marshalled);
            const putRequest = {
                PutRequest: {
                    Item: marshalled,
                },
            };
            const uk = myP.partitionKey + ":" + myP.sortKey;
            return [uk, putRequest, myP];
        } else {
            log.debug("fmtBulkPut ignored invalid:" + JSON.stringify(json1));
            return [null, null];
        }
    }

    async flushBulkRequests(requests) {
        if (requests.length > 0) {
            var params = {
                RequestItems: {
                    [process.env.DynamoDbTable]: requests,
                },
                ReturnConsumedCapacity: "TOTAL",
            };
            try {
                var data = await this.ddbClient.send(
                    new BatchWriteItemCommand(params)
                );

                log.debug("Added Bulk: " + JSON.stringify(data)); // successful response
                return requests.length; // TODO get from TotalProcessed;
            } catch (err) {
                log.debug(err, err.stack); // an error occurred
                return 0;
            }
        }
    }
    async addBulk(json) {
        var requests = {}; // keyed by unique pk/sk to elimate duplicates.
        var totalProcessed = 0;
        for (var i = 0; i < json.bulk.length; i++) {
            log.debug("addBulk: " + i);
            const [uk, putRequest] = this.fmtBulkPut(json.bulk[i]);
            if (putRequest && uk) {
                requests[uk] = putRequest;
            }
            if (Object.keys(requests).length > 20) {
                totalProcessed += await this.flushBulkRequests(
                    Object.values(requests)
                );
                requests = {};
            }
        }
        totalProcessed += await this.flushBulkRequests(Object.values(requests));
        return { status: "ok", detail: "BulkProcessed", count: totalProcessed };
    }

    async addSingle(json) {
        const [uk, putRequest, entity] = this.fmtBulkPut(json);
        if (putRequest && uk) {
            await this.flushBulkRequests([putRequest]);
            return { status: "ok", entity: entity };
        }
        return { error: "Invalid Request" };
    }
    async requestCC(qsp, ccType = "CCA") {
        qsp.ccType = ccType;
        var params = {
            MessageGroupId: "orgId:" + qsp.orgId,
            MessageBody: JSON.stringify(qsp),
            // MessageId: "Group1",  // Required for FIFO queues
            QueueUrl: process.env.CcaQueueId,
            MessageDeduplicationId: this.create_UUID(),
        };
        try {
            log.debug("SQS sending:", qsp);
            const sent = await this.sqs.send(new SendMessageCommand(params));
            log.debug("SQS send Success", sent.MessageId);
        } catch (err) {
            log.debug("SQS send Error", err);
        }
    }

    create_UUID() {
        var dt = new Date().getTime();
        var uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
            /[xy]/g,
            function (c) {
                var r = ((dt + Math.random() * 16) % 16) | 0;
                dt = Math.floor(dt / 16);
                return (c == "x" ? r : (r & 0x3) | 0x8).toString(16);
            }
        );
        return uuid;
    }
}

module.exports = DdbUtils;
