const IotService = require("../modules/lambdaDerby/src/IotService.js");

const ENV_KEYS = [
    "DeployEnvironment",
    "IotEndpoint",
    "IotPiAccessUrl",
    "TimerProtobufDbArn",
];
let savedEnv;
let now;

beforeEach(() => {
    savedEnv = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
    now = jest.spyOn(Date, "now").mockReturnValue(1700000000000);
});

afterEach(() => {
    now.mockRestore();
    for (const key of ENV_KEYS) {
        if (savedEnv[key] === undefined) delete process.env[key];
        else process.env[key] = savedEnv[key];
    }
});

function build({ ddbResult, iotResult, publishError } = {}) {
    const iotClient = { send: jest.fn(async () => iotResult ?? { ok: true }) };
    const dataClient = {
        send: jest.fn(async () => {
            if (publishError) throw publishError;
            return { $metadata: {} };
        }),
    };
    const ddbUtils = { ddbQueryRawPkSk: jest.fn(async () => ddbResult) };
    const createIotDataClient = jest.fn(() => dataClient);
    return {
        iotClient,
        dataClient,
        ddbUtils,
        createIotDataClient,
        service: new IotService(iotClient, ddbUtils, createIotDataClient),
    };
}

describe("attachPrincipalPolicy", () => {
    test("attaches the policy to the principal", async () => {
        const { service, iotClient } = build();

        await service.attachPrincipalPolicy("SubToAnyTopic", "arn:principal");

        const command = iotClient.send.mock.calls[0][0];
        expect(command.constructor.name).toBe("AttachPrincipalPolicyCommand");
        expect(command.input).toEqual({
            policyName: "SubToAnyTopic",
            principal: "arn:principal",
        });
    });

    test("swallows a failure rather than throwing", async () => {
        const { service, iotClient } = build();
        iotClient.send.mockRejectedValue(new Error("denied"));

        await expect(
            service.attachPrincipalPolicy("SubToAnyTopic", "arn:principal")
        ).resolves.toBeUndefined();
    });
});

describe("getLowestPhrMillis", () => {
    const { service } = build();

    test("converts microseconds to whole milliseconds", () => {
        expect(service.getLowestPhrMillis({ phr: 5000999 })).toBe(5000);
        expect(service.getLowestPhrMillis({ phr: [7000000] })).toBe(7000);
    });

    test("is NaN for several values or none (current behavior)", () => {
        expect(
            service.getLowestPhrMillis({ phr: [3000000, 2000000] })
        ).toBeNaN();
        expect(service.getLowestPhrMillis({})).toBeNaN();
    });
});

describe("requestIotVideoUploadRaw", () => {
    const request = {
        orgId: "org1",
        orgIz: "zone1",
        tgtTimeMs: 123,
        timerName: "Finish",
        prefix: "p",
    };

    test("publishes the request to the org's video topic", async () => {
        process.env.IotEndpoint = "abc.iot.example";
        const { service, dataClient, createIotDataClient } = build();

        await expect(
            service.requestIotVideoUploadRaw(request)
        ).resolves.toEqual({ status: "ok", detail: "Published" });

        expect(createIotDataClient).toHaveBeenCalledWith(
            "https://abc.iot.example"
        );
        const command = dataClient.send.mock.calls[0][0];
        expect(command.constructor.name).toBe("PublishCommand");
        expect(command.input.topic).toBe("derby/org1/video/Finish");
        expect(command.input.qos).toBe(0);
        expect(JSON.parse(command.input.payload)).toEqual({
            ...request,
            issuedMs: 1700000000000,
        });
    });

    test("creates the data client lazily, once", async () => {
        process.env.IotEndpoint = "abc.iot.example";
        const { service, createIotDataClient } = build();
        expect(service.iotdata).toBe("");
        expect(createIotDataClient).not.toHaveBeenCalled();

        await service.requestIotVideoUploadRaw(request);
        await service.requestIotVideoUploadRaw({ ...request, orgId: "org2" });

        expect(createIotDataClient).toHaveBeenCalledTimes(1);
    });

    test("returns the error when publishing fails", async () => {
        process.env.IotEndpoint = "abc.iot.example";
        const failure = new Error("throttled");
        const { service } = build({ publishError: failure });

        await expect(
            service.requestIotVideoUploadRaw(request)
        ).resolves.toEqual({ error: failure });
    });
});

describe("requestIotVideoUploadByRP", () => {
    test("requests capture at the race phase's finish time", async () => {
        process.env.IotEndpoint = "abc.iot.example";
        const { service, dataClient } = build();

        await service.requestIotVideoUploadByRP({
            orgId: "org1",
            orgIz: "zone1",
            SK: "55",
            phr: [7000000],
        });

        const payload = JSON.parse(
            dataClient.send.mock.calls[0][0].input.payload
        );
        expect(payload).toEqual({
            orgId: "org1",
            orgIz: "zone1",
            tgtTimeMs: 7000,
            timerName: "Finish",
            prefix: "RP-55",
            issuedMs: 1700000000000,
        });
    });

    test("falls back to the current time when there is no finish time", async () => {
        process.env.IotEndpoint = "abc.iot.example";
        const { service, dataClient } = build();

        await service.requestIotVideoUploadByRP({
            orgId: "org1",
            orgIz: "zone1",
            SK: "56",
        });

        const payload = JSON.parse(
            dataClient.send.mock.calls[0][0].input.payload
        );
        expect(payload.tgtTimeMs).toBe(1700000000000);
    });
});

describe("iotDefaultPri", () => {
    test.each([
        ["dev", 5],
        ["test", 100],
        ["TEST", 100],
        ["stage", 200],
        ["go-derby-prod", 500],
        ["test-stage", 200], // the later match wins
    ])("%s gives %i", async (environment, expected) => {
        process.env.DeployEnvironment = environment;
        const { service } = build();

        await expect(service.iotDefaultPri({})).resolves.toBe(expected);
    });

    test("fails without a deploy environment", async () => {
        delete process.env.DeployEnvironment;
        const { service } = build();

        await expect(service.iotDefaultPri({})).rejects.toThrow(TypeError);
    });
});

describe("iotOverridePri", () => {
    const event = { headers: { "x-rr1-timer": "timer-1" } };

    test("looks up the override for the calling timer", async () => {
        process.env.TimerProtobufDbArn = "arn:ddb";
        const { service, ddbUtils } = build({
            ddbResult: { Items: [{ pri: { N: "7" } }] },
        });

        await expect(service.iotOverridePri(event)).resolves.toBe("7");
        expect(ddbUtils.ddbQueryRawPkSk).toHaveBeenCalledWith(
            "DiscoverTimerOverride",
            "timer-1",
            "arn:ddb"
        );
    });

    test.each([
        ["no result", undefined],
        ["no items", { Items: [] }],
        ["no priority", { Items: [{ other: 1 }] }],
    ])("is 0 for %s", async (_label, ddbResult) => {
        const { service } = build({ ddbResult });

        await expect(service.iotOverridePri(event)).resolves.toBe(0);
    });

    test("fails without request headers", async () => {
        const { service } = build({ ddbResult: { Items: [] } });

        await expect(service.iotOverridePri({})).rejects.toThrow(TypeError);
    });
});

describe("iotDiscover", () => {
    const event = { headers: { "x-rr1-timer": "timer-1" } };

    test("answers with the higher of the default and override priority", async () => {
        process.env.DeployEnvironment = "test";
        process.env.IotPiAccessUrl = "https://pi.example/";
        const { service } = build({
            ddbResult: { Items: [{ pri: { N: "700" } }] },
        });

        const result = await service.iotDiscover(event, {});

        expect(result.priority).toBe(700);
        expect(result.authUrl).toBe("https://pi.example/iot/auth");
        expect(result.bundleUrl).toBe(
            "https://cf.test.rr1.us/gpsRelay.tar.zst"
        );
        expect(result.backends).toContain("go.rr1.us");
    });

    test("uses the environment's priority when there is no override", async () => {
        process.env.DeployEnvironment = "go-derby-prod";
        const { service } = build({ ddbResult: undefined });

        await expect(service.iotDiscover(event, {})).resolves.toMatchObject({
            priority: 500,
        });
    });
});
