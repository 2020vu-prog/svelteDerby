const EntityFactory = require("./shared/EntityFactory.js");
const skipDeleteFilter = "attribute_not_exists(del) ";

class DdbUtils {
    ddbClient = null;
    AWS = null;
    ddocClient = null;
    entityFactory = null;
    sqs = null;

    constructor(AWS, ddbClient, sqs) {
        this.ddbClient = ddbClient;
        this.AWS = AWS;
        this.sqs = sqs;
        this.ddocClient = new this.AWS.DynamoDB.DocumentClient();
    }
    setEntityFactory(entityFactory) {
        this.entityFactory = entityFactory;
    }
    async ddbPut(item, tableName = process.env.DynamoDbTable) {
        var rc = "Pending";
        const dbItem = {
            TableName: tableName,
            Item: item,
        };
        try {
            await this.ddocClient.put(dbItem).promise();

            console.log("Added dbItem: " + JSON.stringify(dbItem));
            rc = "OK";
        } catch (err) {
            console.log(err, err.stack); // an error occurred
            rc = "Error";
        }
        return rc;
    }
    async ddbQueryPkSk(pk, sk, tableName = process.env.DynamoDbTable) {
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
        console.log("ddbQueryPkSk query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryPkSk: ", data); // successful response
            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            if (udata && udata[0]) {
                return udata[0]; // exact key lookup should not get multipe entries
            } else {
                return null;
            }
        } catch (err) {
            console.log("ddbQueryPkSk failed: ", err, err.stack); // an error occurred
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
        console.log("ddbQueryPkAll query: " + JSON.stringify(params));

        const factory =
            tableName === process.env.DynamoDbTable
                ? new EntityFactory({})
                : undefined;
        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryPkAll: raw:", data); // successful response
            const udata = this.unmarshallResultsToArray(data, factory);
            console.log("ddbQueryPkAll: unmar ", udata); // successful response
            return udata;
        } catch (err) {
            console.log("ddbQueryPkAll failed: ", err, err.stack); // an error occurred
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
    unmarshallResultsToArray(data, factory) {
        const rc = [];
        for (var i = 0; i < data.Items.length; i++) {
            var unmarshalled = this.AWS.DynamoDB.Converter.unmarshall(
                data.Items[i]
            );
            if (factory) {
                // don't use factory for timerDB
                unmarshalled = this.promoteToObject(unmarshalled, factory);
            }
            if (unmarshalled) {
                rc.push(unmarshalled);
            }
        }
        return rc;
    }
    unmarshallResultsToObject(data, key, factory) {
        const rc = {};

        for (var i = 0; i < data.Items.length; i++) {
            var unmarshalled = this.AWS.DynamoDB.Converter.unmarshall(
                data.Items[i]
            );
            unmarshalled = this.promoteToObject(unmarshalled, factory);
            if (unmarshalled) {
                rc[unmarshalled[key]] = unmarshalled;
            }
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
        console.log("history query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.query(params);
            const cc = data.ConsumedCapacity.CapacityUnits;
            console.log("ddbQueryTimerHistoryByUuid cc: ", cc); // successful response
            console.log("ddbQueryTimerHistoryByUuid: ", data); // successful response
            console.log("ddbQueryTimerHistoryByUuid: " + JSON.stringify(data)); // successful response
            const rc = this.unmarshallResultsToArray(data);

            return rc;
        } catch (err) {
            console.log("ddbQueryTimerHistoryByUuid failed: ", err, err.stack); // an error occurred
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
            var data = await this.ddbClient.query(params);
            const cc = data.ConsumedCapacity.CapacityUnits;
            console.log("queryRaceHistory cc: ", cc); // successful response
            console.log("queryRaceHistory: ", data); // successful response
            console.log("queryRaceHistory: " + JSON.stringify(data)); // successful response
            const rc = this.unmarshallResultsToArray(data);

            if (cc > 0.5 || data.Count >= limit) {
                console.log("queryRaceHistory: requesting CCA: ", cc);
                await this.requestCCA(qsp, data);
            } else {
                console.log("queryRaceHistory: skipping CCA: ", cc);
            }

            return [rc, cacheMaxSeconds];
        } catch (err) {
            console.log("queryRaceHistory failed: ", err, err.stack); // an error occurred
        }
        return [{ error: "Query History Failed" }, cacheMaxSeconds];
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
        console.log("ddb query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryEventConfig: ", data); // successful response
            return this.unmarshallResultsToObject(data, "SK");
        } catch (err) {
            console.log("ddbQueryEventConfig failed: ", err, err.stack); // an error occurred
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
        console.log("ddb query: " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryEventConfig: ", data); // successful response
            return this.unmarshallResultsToObject(data, "SK");
        } catch (err) {
            console.log("ddbQueryEventConfig failed: ", err, err.stack); // an error occurred
        }
        return { error: "Query Failed" };
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
        console.log("ddbQueryOrgConfig query : " + JSON.stringify(params));
        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryOrgConfig: ", data); // successful response
            return this.unmarshallResultsToObject(data, "SK");
        } catch (err) {
            console.log("ddbQueryOrgConfig failed: ", err, err.stack); // an error occurred
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
        console.log("ddbQueryRsByKey query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryRsByKey: ", data); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata;
        } catch (err) {
            console.log("ddbQueryRsByKey failed: ", err, err.stack); // an error occurred
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
        console.log("ddbQueryRpByKey query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryRpByKey: ", data); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rp) => !rp.phaseResults); // only return entries w/o results
        } catch (err) {
            console.log("ddbQueryRpByKey failed: ", err, err.stack); // an error occurred
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
        console.log("ddbQueryRpNextOnBlocks query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryRpNextOnBlocks: ", data); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rp) => !rp.phaseResults).reverse(); // only return entries w/o results
        } catch (err) {
            console.log("ddbQueryRpNextOnBlocks failed: ", err, err.stack); // an error occurred
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
        console.log(
            "ddbQueryRpDuplicateCheck query: " + JSON.stringify(params)
        );

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryRpDuplicateCheck: ", data); // successful response

            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rp) => !rp.phaseResults); // only return entries w/o results
        } catch (err) {
            console.log("ddbQueryRpDuplicateCheck failed: ", err, err.stack); // an error occurred
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
        console.log(
            "ddbQueryBracketMdExistsCheck query: " + JSON.stringify(params)
        );

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryBracketMdExistsCheck: ", data); // successful response
            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata;
        } catch (err) {
            console.log(
                "ddbQueryBracketMdExistsCheck failed: ",
                err,
                err.stack
            ); // an error occurred
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
        console.log(
            "ddbQueryRsExistsAndPendingCheck query: " + JSON.stringify(params)
        );

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryRsExistsAndPendingCheck: ", data); // successful response
            const udata = this.unmarshallResultsToArray(
                data,
                new EntityFactory({})
            );

            return udata.filter((rs) => rs.nextRace()); // only return entries that need to race
        } catch (err) {
            console.log(
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
        console.log("ddb ddbQueryRsAlreadyPending: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.query(params);
            console.log("ddbQueryRsAlreadyPending: " + data); // successful response
            console.log("ddbQueryRsAlreadyPending: " + JSON.stringify(data)); // successful response
            return data.Count;
        } catch (err) {
            console.log("queryRsAlreadyPending failed: ", err, err.stack); // an error occurred
        }
        return 99;
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
        console.log("ddb query: " + JSON.stringify(params));

        try {
            var data = await this.ddbClient.query(params);
            console.log("queryRsContains: " + data); // successful response
            console.log("queryRsContains: " + JSON.stringify(data)); // successful response
            return data.Count;
        } catch (err) {
            console.log("queryRsContains failed: ", err, err.stack); // an error occurred
        }
        return 99;
    }

    fmtBulkPut(json1) {
        const myP = this.entityFactory.build(json1);

        if (myP) {
            myP.preWrite();
            console.log("fmtBulkPut pw:", myP);
            var marshalled = this.AWS.DynamoDB.Converter.marshall(myP);
            console.log("fmtBulkPut mar:", marshalled);
            const putRequest = {
                PutRequest: {
                    Item: marshalled,
                },
            };
            const uk = myP.partitionKey + ":" + myP.sortKey;
            return [uk, putRequest, myP];
        } else {
            console.log("fmtBulkPut ignored invalid:" + JSON.stringify(json1));
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
                var data = await this.ddbClient.batchWriteItem(params);

                console.log("Added Bulk: " + JSON.stringify(data)); // successful response
                return requests.length; // TODO get from TotalProcessed;
            } catch (err) {
                console.log(err, err.stack); // an error occurred
                return 0;
            }
        }
    }
    async addBulk(json) {
        var requests = {}; // keyed by unique pk/sk to elimate duplicates.
        var totalProcessed = 0;
        for (var i = 0; i < json.length; i++) {
            console.log("addBulk: " + i);
            const [uk, putRequest] = this.fmtBulkPut(json[i]);
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
    async requestCCA(qsp, data) {
        var params = {
            MessageGroupId: "orgId:" + qsp.orgId,
            MessageBody: JSON.stringify(qsp),
            // MessageId: "Group1",  // Required for FIFO queues
            QueueUrl: process.env.CcaQueueId,
            MessageDeduplicationId: this.create_UUID(),
        };
        try {
            console.log("SQS sending:", qsp);
            const sent = await this.sqs.sendMessage(params).promise();
            console.log("SQS send Success", sent.MessageId);
        } catch (err) {
            console.log("SQS send Error", err);
        }
    }

    create_UUID() {
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
    }
}

module.exports = DdbUtils;
