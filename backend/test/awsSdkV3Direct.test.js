const DdbUtils = require("../modules/lambdaDerby/src/DdbUtils.js");
const TmpCache = require("../modules/lambdaDerby/src/tmpCache.js");
const AnnounceResults = require("../modules/lambdaDerby/src/AnnounceResults.js");
const ApiRaceStanding = require("../modules/lambdaDerby/src/ApiRaceStanding.js");
const DiscordUtils = require("../modules/lambdaDerby/src/DiscordUtils.js");

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

test("AnnounceResults dispatches S3 writes with PutObjectCommand", async () => {
    const s3 = { send: jest.fn().mockResolvedValue({}) };
    const announce = new AnnounceResults({}, {
        s3,
        sns: { send: jest.fn() },
        polly: { send: jest.fn() },
    });
    process.env.DstBucket = "media-bucket";

    await announce.saveToS3("event", Buffer.from("audio"));

    const command = s3.send.mock.calls[0][0];
    expect(command.constructor.name).toBe("PutObjectCommand");
    expect(command.input.Bucket).toBe("media-bucket");
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
