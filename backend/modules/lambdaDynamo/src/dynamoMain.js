"use strict";
const { performance } = require("node:perf_hooks");
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
let iotData;
log.setLevel(process.env.LogLevel || log.levels.INFO);
const dynamoDbClient = new DynamoDBClient({ region: process.env.AwsRegion });

log.debug("Loading function");

let lastMicroEpoch = 0;
const getMicroEpoch = () => {
    const measuredMicroEpoch = Math.floor(
        (performance.timeOrigin + performance.now()) * 1000
    );
    lastMicroEpoch = Math.max(measuredMicroEpoch, lastMicroEpoch + 1);
    return lastMicroEpoch;
};

const buildDistributionRecord = (sourceRecord) => ({
    ...sourceRecord,
    DP: sourceRecord.orgId,
    DS: getMicroEpoch(),
});

// unmarshall() turns a DynamoDB String/Number/Binary Set attribute (e.g.
// Participant.maintainerHashes) into a native JS Set. JSON.stringify has no
// idea what to do with a Set -- it silently serializes to "{}" with no
// replacer, which would make maintainerHashes vanish for every already-open
// client on the realtime IoT channel. Same fix as derbyMain.js's
// buildResponse, needed here too since this is a separate deploy unit.
const replaceSetsForJson = (key, value) =>
    value instanceof Set ? Array.from(value) : value;

const publishDistributionRecord = async (distributionRecord) => {
    log.debug("Iot Begin.");
    if (!iotData) {
        iotData = new IoTDataPlaneClient({
            endpoint: `https://${process.env.IotEndpoint}`,
            region: process.env.AwsRegion,
        });
    }
    const params = {
        topic: `derby/${distributionRecord.orgId}/dist`,
        payload: JSON.stringify(distributionRecord, replaceSetsForJson),
        qos: 0,
    };
    try {
        await iotData.send(new IotPublishCommand(params));
        log.debug("Iot Success.");
    } catch (err) {
        log.error("Iot Error.", err);
    }
};

const saveDistributionRecord = async (distributionRecord) => {
    const params = {
        Item: marshall(distributionRecord, { removeUndefinedValues: true }),
        ReturnConsumedCapacity: "TOTAL",
        TableName: process.env.DistDbTable,
    };

    try {
        const data = await dynamoDbClient.send(
            new DynamoDbPutItemCommand(params)
        );
        log.debug("Distribution record added.", data);
    } catch (err) {
        log.error("Distribution record error.", err);
    }
};

exports.handler = async (event) => {
    for (const record of event.Records || []) {
        const newImage = record.dynamodb?.NewImage;
        if (!newImage) {
            log.info(
                "Skipping stream record without NewImage:",
                record.eventName,
                record.eventID
            );
            continue;
        }

        let sourceRecord;
        try {
            sourceRecord = unmarshall(newImage);
        } catch (err) {
            log.error(
                "Unable to unmarshall stream record:",
                record.eventID,
                err
            );
            continue;
        }

        if (!sourceRecord.orgId) {
            log.info(
                "Skipping stream record without orgId:",
                record.eventName,
                record.eventID
            );
            continue;
        }

        const distributionRecord = buildDistributionRecord(sourceRecord);
        await Promise.all([
            saveDistributionRecord(distributionRecord),
            publishDistributionRecord(distributionRecord),
        ]);
    }

    return "message";
};
