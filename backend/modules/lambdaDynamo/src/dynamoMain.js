"use strict";
const log = require("loglevel");
const {
    DynamoDBClient,
    PutItemCommand: DynamoDbPutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const {
    IoTDataPlaneClient,
    PublishCommand: IotPublishCommand,
} = require("@aws-sdk/client-iot-data-plane");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
var iotdata;
log.setLevel(log.levels.TRACE);
const ddbClient = new DynamoDBClient({ region: process.env.AwsRegion });

log.debug("Loading function");

const sleep = (milliseconds) => {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
};
const asyncForEach = async (array, callback) => {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array);
    }
};

// It is very unlikely that there would be a millisecond collision given
//   limited update volume.
// Add a 1000 bytes of entropy to the time just as precaution.
const getMicroEpoch = () => {
    const rand999 = Math.floor(Math.random() * 1000);
    return new Date().getTime() * 1000 + rand999;
};

//TODO: consolidate and publish entire batch at once!
const propagateIot = async (json) => {
    log.debug("Iot Begin.");
    if (!iotdata) {
        // first time
        iotdata = new IoTDataPlaneClient({
            endpoint: `https://${process.env.IotEndpoint}`,
            region: process.env.AwsRegion,
        });
    }
    const params = {
        topic: "derby/" + json.orgId + "/dist",
        payload: JSON.stringify(json),
        qos: 0,
    };
    try {
        await iotdata.send(new IotPublishCommand(params));
        log.debug("Iot Success.", params);
        //log.debug(data);
        return { status: "ok", detail: "Published" };
    } catch (err) {
        log.error("Iot Error.", err);
        log.error(err, err.stack); // an error occurred
        return { error: err };
    }
};
//TODO: Batch write!
const propagateRecord = async (json) => {
    log.debug("propagateRecord: " + JSON.stringify(json));
    if (json && json.orgId) {
    } else {
        return { error: "missing orgId" };
    }
    json.DP = json.orgId;
    json.DS = getMicroEpoch();
    var params = {
        Item: marshall(json, { removeUndefinedValues: true }),
        ReturnConsumedCapacity: "TOTAL",
        TableName: process.env.DistDbTable,
    };

    try {
        log.debug("Adding pr: " + JSON.stringify(params));
        const data = await ddbClient.send(new DynamoDbPutItemCommand(params));
        log.debug("Added pr: " + JSON.stringify(data)); // successful response
        return { status: "ok", detail: "Added" };
    } catch (err) {
        log.debug(err, err.stack); // an error occurred
        return { error: err };
    }
};
exports.handler = async (event) => {
    const dbArn = process.env.DynamoDbArn;
    var jsonRC = {};

    log.debug(JSON.stringify(event));

    if (false) {
        return "bypass";
    }
    //event.Records.forEach(function(record) {
    await asyncForEach(event.Records, async function (record) {
        log.debug(record.eventID);
        log.debug(record.eventName);
        log.debug("DynamoDB Record: %j", record.dynamodb);
        var unmarshalled = unmarshall(record.dynamodb.NewImage);
        log.debug("DynamoDB Unmarshalled: %j", unmarshalled);

        if (unmarshalled && unmarshalled.orgId) {
            try {
                /*
				log.debug('S3 Putting');
				const dstKey = unmarshalled.orgId + "/" + new Date().toISOString()
				const dstBucket = process.env.DstBucket;
				const contentType = "application/json";
				*/
                log.debug("DB Putting : %s", JSON.stringify(unmarshalled));
                const dbPromise = propagateRecord(unmarshalled);
                const iotPromise = propagateIot(unmarshalled);
                //const [dbResult, iotResult] = await Promise.allSettled([dbPromise,iotPromise]);
                const [dbResult, iotResult] = await Promise.all([
                    dbPromise,
                    iotPromise,
                ]);

                log.debug(
                    "Promises settled:" + dbResult + " iot: " + iotResult
                );
            } catch (err) {
                log.debug("DB/Iot await failed");
                log.debug(err);
            }
        }
        else{
                log.debug("skipped:", record.eventName, record.eventID);
        }
    });
    return "message";
};
