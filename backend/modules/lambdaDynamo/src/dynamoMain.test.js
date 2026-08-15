"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
    DynamoDBClient,
    PutItemCommand: DynamoDbPutItemCommand,
} = require("@aws-sdk/client-dynamodb");
const {
    IoTDataPlaneClient,
    PublishCommand: IotPublishCommand,
} = require("@aws-sdk/client-iot-data-plane");
const { marshall, unmarshall } = require("@aws-sdk/util-dynamodb");
const log = require("loglevel");

process.env.AwsRegion = "us-east-2";
process.env.DistDbTable = "Distribution";
process.env.IotEndpoint = "example-ats.iot.us-east-2.amazonaws.com";

const { handler } = require("./dynamoMain");
log.setLevel(log.levels.SILENT);

const streamEvent = (item) => ({
    Records: [
        {
            eventID: "event-1",
            eventName: "INSERT",
            dynamodb: { NewImage: marshall(item) },
        },
    ],
});

test("copies a DynamoDB stream record to the distribution table and IoT", async (t) => {
    const dynamoCommands = [];
    const iotCommands = [];
    t.mock.method(DynamoDBClient.prototype, "send", async (command) => {
        dynamoCommands.push(command);
        return {};
    });
    t.mock.method(IoTDataPlaneClient.prototype, "send", async (command) => {
        iotCommands.push(command);
        return {};
    });

    const result = await handler(streamEvent({
        orgId: "Test.12345",
        PK: "Race",
        name: "Integration race",
    }));

    assert.equal(result, "message");
    assert.equal(dynamoCommands.length, 1);
    assert.ok(dynamoCommands[0] instanceof DynamoDbPutItemCommand);
    assert.equal(dynamoCommands[0].input.TableName, "Distribution");
    assert.deepEqual(dynamoCommands[0].input.Item.DP, { S: "Test.12345" });
    assert.match(dynamoCommands[0].input.Item.DS.N, /^\d+$/);
    assert.deepEqual(dynamoCommands[0].input.Item.name, {
        S: "Integration race",
    });
    const copiedItem = unmarshall(dynamoCommands[0].input.Item);
    assert.equal(copiedItem.DP, "Test.12345");
    assert.equal(typeof copiedItem.DS, "number");
    assert.equal(copiedItem.name, "Integration race");

    assert.equal(iotCommands.length, 1);
    assert.ok(iotCommands[0] instanceof IotPublishCommand);
    assert.equal(iotCommands[0].input.topic, "derby/Test.12345/dist");
    assert.equal(iotCommands[0].input.qos, 0);
    assert.deepEqual(
        JSON.parse(iotCommands[0].input.payload),
        copiedItem
    );
});

test("skips stream records without an organization", async (t) => {
    const dynamoSend = t.mock.method(
        DynamoDBClient.prototype,
        "send",
        async () => ({})
    );
    const iotSend = t.mock.method(
        IoTDataPlaneClient.prototype,
        "send",
        async () => ({})
    );

    await assert.doesNotReject(handler(streamEvent({ PK: "Race" })));
    assert.equal(dynamoSend.mock.callCount(), 0);
    assert.equal(iotSend.mock.callCount(), 0);
});
