const LambdaEventDispatch = require("../modules/lambdaDerby/src/LambdaEventDispatch.js");

const POLLY_ARN = "arn:aws:sns:polly-complete";
const SAVED_ENV = {};

beforeEach(() => {
    for (const key of ["PollyCompleteSnsArn", "DstBucket", "s3VideoWatch"]) {
        SAVED_ENV[key] = process.env[key];
    }
    process.env.PollyCompleteSnsArn = POLLY_ARN;
    process.env.DstBucket = "dst-bucket";
    process.env.s3VideoWatch = "watch-bucket";
});
afterEach(() => {
    for (const [key, value] of Object.entries(SAVED_ENV)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

function build() {
    const announce = { propagateIotFromSns: jest.fn(async () => {}) };
    const apiRouter = { dispatch: jest.fn(async () => ({ statusCode: 200 })) };
    const archiveUtils = {
        processExpiringEventConfig: jest.fn(async () => {}),
    };
    const snsFinishTimeIngestion = {
        snsApplyPbTimerHandler: jest.fn(async () => {}),
        snsApplyPbLogMessage: jest.fn(async () => {}),
        snsApplyTimerHandler: jest.fn(async () => {}),
    };
    const s3Client = { send: jest.fn(async () => ({})) };
    const service = new LambdaEventDispatch({
        apiRouter,
        archiveUtils,
        newAnnounceResults: () => announce,
        snsFinishTimeIngestion,
        s3Client,
    });
    return {
        service,
        announce,
        apiRouter,
        archiveUtils,
        snsFinishTimeIngestion,
        s3Client,
    };
}

const snsEvent = (message, Timestamp = "2026-10-03T12:00:00.000Z") => ({
    Records: [{ Sns: { Message: JSON.stringify(message), Timestamp } }],
});

describe("lowercaseHeaders", () => {
    test("adds a lowercase copy of each mixed-case header", () => {
        const { service } = build();
        const event = { headers: { "Content-Type": "x", a: "1" } };

        service.lowercaseHeaders(event);

        expect(event.headers).toEqual({
            "Content-Type": "x",
            "content-type": "x",
            a: "1",
        });
    });
});

describe("API Gateway events", () => {
    test("v1 events are routed after their headers are lowercased", async () => {
        const { service, apiRouter } = build();
        const event = { path: "/x", headers: { "X-Y": "1" } };

        await expect(service.dispatch(event)).resolves.toEqual({
            statusCode: 200,
        });

        expect(apiRouter.dispatch).toHaveBeenCalledWith(event);
        expect(event.headers["x-y"]).toBe("1");
    });

    test("v2 (function url) events get their path from rawPath", async () => {
        const { service, apiRouter } = build();
        const event = { rawPath: "/y", headers: { "X-Y": "1" } };

        await service.dispatch(event);

        expect(apiRouter.dispatch).toHaveBeenCalledWith(
            expect.objectContaining({ path: "/y" })
        );
        // v2 headers are already lowercase, so they are left alone
        expect(event.headers).toEqual({ "X-Y": "1" });
    });

    test("a v1 event with no headers fails before routing", async () => {
        const { service, apiRouter } = build();

        await expect(service.dispatch({ path: "/x" })).rejects.toBeInstanceOf(
            TypeError
        );
        expect(apiRouter.dispatch).not.toHaveBeenCalled();
    });
});

describe("cron events", () => {
    test("an EventBridge event archives expiring events", async () => {
        const { service, archiveUtils } = build();

        await expect(
            service.dispatch({ source: "aws.events" })
        ).resolves.toBeUndefined();
        expect(archiveUtils.processExpiringEventConfig).toHaveBeenCalledTimes(
            1
        );
    });

    test("a cron event delivered through the sns topic archives too", async () => {
        const { service, archiveUtils } = build();

        await expect(
            service.dispatch(snsEvent({ source: "aws.events" }))
        ).resolves.toBeUndefined();
        expect(archiveUtils.processExpiringEventConfig).toHaveBeenCalledTimes(
            1
        );
    });
});

describe("SNS events", () => {
    test("a polly-complete message is propagated to IoT", async () => {
        const { service, announce } = build();
        const message = { snsTopicArn: POLLY_ARN };

        await expect(service.dispatch(snsEvent(message))).resolves.toBe(
            "Polly Success"
        );
        expect(announce.propagateIotFromSns).toHaveBeenCalledWith(message);
    });

    test.each([
        ["protobufFinishBlock", "snsApplyPbTimerHandler"],
        ["protobufLogMessage", "snsApplyPbLogMessage"],
        [undefined, "snsApplyTimerHandler"],
    ])("record type %s goes to %s", async (recordType, handler) => {
        const { service, snsFinishTimeIngestion } = build();
        const message = { recordType, snsTopicArn: "other" };

        await expect(
            service.dispatch(snsEvent(message, "2026-10-03T12:00:00.000Z"))
        ).resolves.toBe("Success");

        for (const [name, fn] of Object.entries(snsFinishTimeIngestion)) {
            expect(fn).toHaveBeenCalledTimes(name === handler ? 1 : 0);
        }
        expect(snsFinishTimeIngestion[handler]).toHaveBeenCalledWith(
            message,
            "2026-10-03T12:00:00.000Z"
        );
    });

    test("a failed finish-time apply is swallowed and reported as an sns error", async () => {
        const { service, snsFinishTimeIngestion } = build();
        snsFinishTimeIngestion.snsApplyPbTimerHandler.mockRejectedValue(
            "stale"
        );

        await expect(
            service.dispatch(snsEvent({ recordType: "protobufFinishBlock" }))
        ).resolves.toBe("SNS Error");
    });

    test("a message that is not json is not caught", async () => {
        const { service } = build();

        await expect(
            service.dispatch({
                Records: [{ Sns: { Message: "{nope", Timestamp: "t" } }],
            })
        ).rejects.toBeInstanceOf(SyntaxError);
    });
});

describe("S3 events", () => {
    const s3Event = (key, bucket = "src-bucket") => ({
        Records: [{ s3: { bucket: { name: bucket }, object: { key } } }],
    });

    test("copies the mp4 and its webm companion into media/", async () => {
        const { service, s3Client } = build();

        await expect(
            service.dispatch(s3Event("inputs/org-race.mp4"))
        ).resolves.toBe("s3 success");

        const [first, second] = s3Client.send.mock.calls.map(([c]) => c.input);
        expect(first).toEqual({
            CopySource: "/src-bucket/inputs/org-race.mp4",
            Key: "media/org/race.mp4",
            Bucket: "dst-bucket",
        });
        expect(second).toEqual({
            CopySource: "/watch-bucket/inputs/org-race.webm",
            Key: "media/org/race.webm",
            Bucket: "dst-bucket",
        });
    });

    test("decodes an encoded object key", async () => {
        const { service, s3Client } = build();

        await service.dispatch(s3Event("inputs/Org+1-r%C3%A9ce.mp4"));

        expect(s3Client.send.mock.calls[0][0].input.Key).toBe(
            "media/Org 1/réce.mp4"
        );
    });

    test("stops when the first copy fails", async () => {
        const { service, s3Client } = build();
        s3Client.send.mockRejectedValueOnce(new Error("s3 down"));

        await expect(
            service.dispatch(s3Event("inputs/a-b.mp4"))
        ).rejects.toThrow("s3 down");
        expect(s3Client.send).toHaveBeenCalledTimes(1);
    });
});

describe("other events", () => {
    test("an unrecognized record is reported as an error", async () => {
        const { service } = build();

        await expect(
            service.dispatch({ Records: [{ other: 1 }] })
        ).resolves.toBe("Error");
    });

    test.each([
        ["no Records", { foo: 1 }],
        ["empty Records", { Records: [] }],
        ["no event", null],
    ])("%s throws a TypeError", async (label, event) => {
        const { service } = build();

        await expect(service.dispatch(event)).rejects.toBeInstanceOf(TypeError);
    });
});
