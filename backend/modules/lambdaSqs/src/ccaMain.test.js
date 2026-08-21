"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
    BatchWriteItemCommand,
    DynamoDBClient,
    QueryCommand,
} = require("@aws-sdk/client-dynamodb");
const {
    DynamoDBDocumentClient,
    GetCommand,
    UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} = require("@aws-sdk/client-s3");
const { marshall } = require("@aws-sdk/util-dynamodb");
const log = require("loglevel");

process.env.AwsRegion = "us-east-2";
process.env.DistDbTable = "Distribution";
process.env.DstBucket = "archive-bucket";

const { handler } = require("./ccaMain");
log.setLevel(log.levels.SILENT);

const sqsEvent = (body) => ({
    Records: [{ body: JSON.stringify(body) }],
});

test("CCF archives queried records and removes them from DynamoDB", async (t) => {
    const dynamoCommands = [];
    const s3Commands = [];
    const distributionItem = {
        DP: "org-1",
        DS: 123,
        PK: "Race",
        name: "Test race",
    };

    t.mock.method(DynamoDBClient.prototype, "send", async (command) => {
        dynamoCommands.push(command);
        if (command instanceof QueryCommand) {
            return {
                Items: [marshall(distributionItem)],
                ConsumedCapacity: { CapacityUnits: 0.5 },
            };
        }
        if (command instanceof BatchWriteItemCommand) {
            return { ConsumedCapacity: [] };
        }
        assert.fail(`Unexpected DynamoDB command: ${command.constructor.name}`);
    });
    t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
        assert.fail(`CCF should not use the lock: ${command.constructor.name}`);
    });
    t.mock.method(S3Client.prototype, "send", async (command) => {
        s3Commands.push(command);
        return {};
    });

    const result = await handler(
        sqsEvent({
            orgId: "org-1",
            orgIz: "org-path",
            ccType: "CCF",
        })
    );

    assert.deepEqual(result, {});
    assert.equal(s3Commands.length, 1);
    assert.ok(s3Commands[0] instanceof PutObjectCommand);
    assert.equal(s3Commands[0].input.Bucket, "archive-bucket");
    assert.equal(
        s3Commands[0].input.Key,
        "archive/org-path/org-1/archive.json"
    );
    assert.deepEqual(JSON.parse(s3Commands[0].input.Body), [distributionItem]);

    const batchWrites = dynamoCommands.filter(
        (command) => command instanceof BatchWriteItemCommand
    );
    assert.equal(batchWrites.length, 2);
    assert.ok(batchWrites[0].input.RequestItems.Distribution[0].PutRequest);
    assert.deepEqual(
        batchWrites[1].input.RequestItems.Distribution[0].DeleteRequest.Key,
        marshall({ DP: "org-1", DS: 123 })
    );
});

test("CCA updates a stale organization lock before creating an archive", async (t) => {
    const documentCommands = [];
    const dynamoCommands = [];
    const s3Commands = [];

    t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
        documentCommands.push(command);
        if (command instanceof GetCommand) {
            return { Item: { lockId: "old-lock", updatedAt: 3 } };
        }
        if (command instanceof UpdateCommand) {
            return {};
        }
        assert.fail(`Unexpected document command: ${command.constructor.name}`);
    });
    t.mock.method(DynamoDBClient.prototype, "send", async (command) => {
        dynamoCommands.push(command);
        if (command instanceof QueryCommand) {
            return { Items: [], ConsumedCapacity: { CapacityUnits: 0 } };
        }
        if (command instanceof BatchWriteItemCommand) {
            return { ConsumedCapacity: [] };
        }
        assert.fail(`Unexpected DynamoDB command: ${command.constructor.name}`);
    });
    t.mock.method(S3Client.prototype, "send", async (command) => {
        s3Commands.push(command);
        return {};
    });

    await handler(
        sqsEvent({
            orgId: "org-2",
            orgIz: "org-path",
            ccType: "CCA",
        })
    );

    assert.equal(documentCommands.length, 2);
    assert.ok(documentCommands[0] instanceof GetCommand);
    assert.ok(documentCommands[1] instanceof UpdateCommand);
    assert.equal(
        documentCommands[1].input.ExpressionAttributeValues[":lockIdOld"],
        "old-lock"
    );
    const pointerWrite = dynamoCommands.find(
        (command) => command instanceof BatchWriteItemCommand
    ).input.RequestItems.Distribution[0].PutRequest.Item;
    assert.ok(pointerWrite.DP);
    assert.ok(pointerWrite.DS);
    assert.equal(pointerWrite.M, undefined);
    assert.match(
        s3Commands[0].input.Key,
        /^archive\/org-path\/org-2\/\d+\.json$/
    );
});

test("recent CCA request is suppressed without logging an error", async (t) => {
    const infoMessages = [];
    let errorCount = 0;

    t.mock.method(DynamoDBDocumentClient.prototype, "send", async (command) => {
        if (command instanceof GetCommand) {
            return { Item: { lockId: "active-lock", updatedAt: Date.now() } };
        }
        assert.fail(`Unexpected document command: ${command.constructor.name}`);
    });
    t.mock.method(log, "info", (...args) => infoMessages.push(args));
    t.mock.method(log, "error", () => errorCount++);

    const result = await handler(
        sqsEvent({
            orgId: "org-locked",
            orgIz: "org-path",
            ccType: "CCA",
        })
    );

    assert.deepEqual(result, {});
    assert.equal(errorCount, 0);
    assert.ok(
        infoMessages.some((args) => args[0] === "CCA request suppressed:")
    );
});

test("existing CCA archive contents are included in the next archive", async (t) => {
    const previousItem = { DP: "org-3", DS: 1, archived: true };
    const pointer = {
        DP: "org-3",
        DS: 2,
        PK: "CCA",
        s3: "archive/org-path/org-3/previous.json",
    };
    const s3Commands = [];

    t.mock.method(DynamoDBClient.prototype, "send", async (command) => {
        if (command instanceof QueryCommand) {
            return {
                Items: [marshall(pointer)],
                ConsumedCapacity: { CapacityUnits: 0.5 },
            };
        }
        if (command instanceof BatchWriteItemCommand) {
            return { ConsumedCapacity: [] };
        }
        assert.fail(`Unexpected DynamoDB command: ${command.constructor.name}`);
    });
    t.mock.method(S3Client.prototype, "send", async (command) => {
        s3Commands.push(command);
        if (command instanceof GetObjectCommand) {
            return {
                Body: {
                    transformToString: async () =>
                        JSON.stringify([previousItem]),
                },
            };
        }
        if (command instanceof PutObjectCommand) {
            return {};
        }
        assert.fail(`Unexpected S3 command: ${command.constructor.name}`);
    });

    await handler(
        sqsEvent({
            orgId: "org-3",
            orgIz: "org-path",
            ccType: "CCF",
        })
    );

    assert.equal(s3Commands[0].input.Key, pointer.s3);
    assert.deepEqual(JSON.parse(s3Commands[1].input.Body), [
        pointer,
        previousItem,
    ]);
});

test("record failures are logged and do not reject the SQS batch", async (t) => {
    t.mock.method(DynamoDBClient.prototype, "send", async (command) => {
        if (command instanceof QueryCommand) {
            throw new Error("query failed");
        }
        assert.fail(`Unexpected DynamoDB command: ${command.constructor.name}`);
    });

    const result = await handler(
        sqsEvent({
            orgId: "org-4",
            orgIz: "org-path",
            ccType: "CCF",
        })
    );

    assert.deepEqual(result, {});
});
