const EntityFactory = require("./shared/EntityFactory.js");

class DdbUtils {
    ddbClient = null;
    AWS = null;
    constructor(AWS, ddbClient) {
        this.ddbClient = ddbClient;
        this.AWS = AWS;
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
}

module.exports = DdbUtils;
