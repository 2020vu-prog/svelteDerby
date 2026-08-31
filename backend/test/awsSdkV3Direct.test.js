const DdbUtils = require("../modules/lambdaDerby/src/DdbUtils.js");
const TmpCache = require("../modules/lambdaDerby/src/tmpCache.js");
const AnnounceResults = require("../modules/lambdaDerby/src/AnnounceResults.js");
const ApiRaceStanding = require("../modules/lambdaDerby/src/ApiRaceStanding.js");
const DiscordUtils = require("../modules/lambdaDerby/src/DiscordUtils.js");
const {
    decodeS3EventKey,
    encodeS3CopySource,
    getAllKeys,
} = require("../modules/lambdaDerby/src/S3Utils.js");

test("S3 event keys are decoded before use", () => {
    expect(decodeS3EventKey("inputs/IL%3ACHI2.99bf5-video+one.webm")).toBe(
        "inputs/IL:CHI2.99bf5-video one.webm"
    );
});

test("S3 copy sources encode each key segment", () => {
    expect(
        encodeS3CopySource(
            "watch-bucket",
            "inputs/IL:CHI2.99bf5-video one#1.webm"
        )
    ).toBe("/watch-bucket/inputs/IL%3ACHI2.99bf5-video%20one%231.webm");
});

test("DdbUtils dispatches low-level DynamoDB queries with QueryCommand", async () => {
    const ddbClient = { send: jest.fn().mockResolvedValue({ Items: [] }) };
    const ddbUtils = new DdbUtils(
        ddbClient,
        { send: jest.fn() },
        { send: jest.fn() }
    );

    await ddbUtils.ddbQueryRawPkSk("event:RS", "standing");

    const command = ddbClient.send.mock.calls[0][0];
    expect(command.constructor.name).toBe("QueryCommand");
    expect(command.input.ExpressionAttributeValues).toEqual({
        ":pk": { S: "event:RS" },
        ":sk": { S: "standing" },
    });
});

test("TmpCache consumes the v3 S3 response body explicitly", async () => {
    const s3Client = {
        send: jest.fn().mockResolvedValue({
            Body: {
                transformToString: jest.fn().mockResolvedValue('{"ok":true}'),
            },
        }),
    };
    const cache = new TmpCache({ send: jest.fn() }, s3Client);

    await expect(cache.getS3("bucket", "key")).resolves.toEqual({ ok: true });
    expect(s3Client.send.mock.calls[0][0].constructor.name).toBe(
        "GetObjectCommand"
    );
});

test("S3 listing treats omitted v3 Contents as an empty list", async () => {
    const s3Client = { send: jest.fn().mockResolvedValue({}) };

    await expect(
        getAllKeys(s3Client, { Bucket: "bucket", Prefix: "missing" })
    ).resolves.toEqual([]);
    expect(s3Client.send.mock.calls[0][0].constructor.name).toBe(
        "ListObjectsV2Command"
    );
});

test("S3 listing follows v3 continuation tokens", async () => {
    const firstModified = new Date("2026-01-01T00:00:00Z");
    const secondModified = new Date("2026-01-02T00:00:00Z");
    const s3Client = {
        send: jest
            .fn()
            .mockResolvedValueOnce({
                Contents: [{ Key: "first", LastModified: firstModified }],
                NextContinuationToken: "next-page",
            })
            .mockResolvedValueOnce({
                Contents: [{ Key: "second", LastModified: secondModified }],
            }),
    };

    await expect(
        getAllKeys(s3Client, { Bucket: "bucket", Prefix: "media/" })
    ).resolves.toEqual([
        { Key: "first", LastModified: firstModified },
        { Key: "second", LastModified: secondModified },
    ]);
    expect(s3Client.send.mock.calls[1][0].input.ContinuationToken).toBe(
        "next-page"
    );
});

test("AnnounceResults dispatches S3 writes with PutObjectCommand", async () => {
    const s3 = { send: jest.fn().mockResolvedValue({}) };
    const announce = new AnnounceResults(
        {},
        {
            s3,
            sns: { send: jest.fn() },
            polly: { send: jest.fn() },
        }
    );
    process.env.DstBucket = "media-bucket";

    await announce.saveToS3("event", Buffer.from("audio"));

    const command = s3.send.mock.calls[0][0];
    expect(command.constructor.name).toBe("PutObjectCommand");
    expect(command.input.Bucket).toBe("media-bucket");
});

test("AnnounceResults buffers the v3 Polly audio stream before S3 upload", async () => {
    const transformToByteArray = jest
        .fn()
        .mockResolvedValue(Uint8Array.from([97, 117, 100, 105, 111]));
    const polly = {
        send: jest.fn().mockResolvedValue({
            AudioStream: { transformToByteArray },
        }),
    };
    const s3 = { send: jest.fn().mockResolvedValue({}) };
    const announce = new AnnounceResults(
        {},
        {
            polly,
            s3,
            sns: { send: jest.fn() },
        }
    );
    process.env.DstBucket = "media-bucket";

    await announce.submitToPolly("<speak>Test</speak>", "event");

    expect(transformToByteArray).toHaveBeenCalledTimes(1);
    expect(s3.send.mock.calls[0][0].input.Body).toEqual(Buffer.from("audio"));
});

test("AnnounceResults does not upload when Polly returns no audio stream", async () => {
    const polly = { send: jest.fn().mockResolvedValue({}) };
    const s3 = { send: jest.fn() };
    const announce = new AnnounceResults(
        {},
        {
            polly,
            s3,
            sns: { send: jest.fn() },
        }
    );

    await expect(
        announce.submitToPolly("<speak>Test</speak>", "event")
    ).resolves.toBeUndefined();
    expect(s3.send).not.toHaveBeenCalled();
});

test("ApiRaceStanding dispatches notifications with SNS PublishCommand", async () => {
    const sns = { send: jest.fn().mockResolvedValue({ MessageId: "1" }) };
    const standings = new ApiRaceStanding({}, {}, {}, sns);
    process.env.RacerStatusFanoutSnsArn = "arn:test";

    await standings.snsFanoutRaceStatus([101]);

    expect(sns.send.mock.calls[0][0].constructor.name).toBe("PublishCommand");
});

test("DiscordUtils dispatches launches with RunInstancesCommand", async () => {
    const ec2 = { send: jest.fn().mockResolvedValue({ Instances: [] }) };
    const discord = new DiscordUtils({}, ec2);

    await discord.launchEc2Bot("event");

    expect(ec2.send.mock.calls[0][0].constructor.name).toBe(
        "RunInstancesCommand"
    );
});
