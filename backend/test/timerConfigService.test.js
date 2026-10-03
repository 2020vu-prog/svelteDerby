const crypto = require("crypto");
const TimerConfigService = require("../modules/lambdaDerby/src/TimerConfigService.js");

const ORG = "Org1.abc";
const shaOf = (uuid) => crypto.createHash("sha256").update(uuid).digest("hex");
const registered = () => [
    { PK: "registered", SK: "a", uuid: "u1" },
    { PK: "registered", SK: "b", uuid: "u2" },
];

let saved;
beforeEach(() => {
    saved = {
        TimerDbTable: process.env.TimerDbTable,
        TimerProtobufDbTable: process.env.TimerProtobufDbTable,
    };
    process.env.TimerDbTable = "timer-table";
    process.env.TimerProtobufDbTable = "pb-table";
});
afterEach(() => {
    for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

function build(overrides = {}) {
    const ddbUtils = {
        ddbQueryPkAll: jest.fn(async () => registered()),
        ddbQueryTimerPbHistory: jest.fn(async () => ["pbhist"]),
        getTimerConfigByOrgId: jest.fn(async () => ({ sha: shaOf("u2") })),
        ddbQueryTimerHistoryByUuid: jest.fn(async (uuid) => [uuid]),
        getEventConfig: jest.fn(async () => ({ TTL: 99 })),
        ddbQueryPkSk: jest.fn(async () => null),
        addSingle: jest.fn(async (json) => ({ status: "ok", entity: json })),
        ddbPut: jest.fn(async () => ({})),
        ...overrides,
    };
    return { service: new TimerConfigService(ddbUtils), ddbUtils };
}

describe("active timers", () => {
    test("getActiveTimers adds a sha of each uuid", async () => {
        const { service, ddbUtils } = build();

        const timers = await service.getActiveTimers();

        expect(ddbUtils.ddbQueryPkAll).toHaveBeenCalledWith(
            "registered",
            "timer-table"
        );
        expect(timers.map((t) => t.sha)).toEqual([shaOf("u1"), shaOf("u2")]);
    });

    test("getSanitizedTimers hides the uuid but keeps the sha", async () => {
        const { service } = build();

        const timers = await service.getSanitizedTimers();

        expect(timers).toEqual([
            { PK: "registered", SK: "a", sha: shaOf("u1") },
            { PK: "registered", SK: "b", sha: shaOf("u2") },
        ]);
    });

    test("getActivePbTimers reads the protobuf table", async () => {
        const { service, ddbUtils } = build({
            ddbQueryPkAll: jest.fn(async () => [{ PK: "TimerList:x" }]),
        });

        await expect(service.getActivePbTimers()).resolves.toEqual([
            { PK: "TimerList:x" },
        ]);
        expect(ddbUtils.ddbQueryPkAll).toHaveBeenCalledWith(
            "TimerList:",
            "pb-table"
        );
    });
});

describe("timer history", () => {
    test("queryTimerPbHistory needs a timer name", async () => {
        const { service } = build();

        await expect(service.queryTimerPbHistory({})).resolves.toEqual({
            error: "Missing timerName",
        });
    });

    test("queryTimerPbHistory defaults to the last six minutes", async () => {
        jest.useFakeTimers().setSystemTime(new Date("2026-10-03T12:00:00Z"));
        try {
            const { service, ddbUtils } = build();
            const qsp = { timerName: "t" };

            await service.queryTimerPbHistory(qsp);

            expect(ddbUtils.ddbQueryTimerPbHistory).toHaveBeenCalledWith(
                "t",
                "2026-10-03T11:54:00.000Z",
                "2026-10-03T12:00:00.000Z"
            );
            expect(qsp.loIso).toBe("2026-10-03T11:54:00.000Z");
        } finally {
            jest.useRealTimers();
        }
    });

    test("queryTimerPbHistory keeps a supplied range", async () => {
        const { service, ddbUtils } = build();

        await service.queryTimerPbHistory({
            timerName: "t",
            loIso: "L",
            hiIso: "H",
        });

        expect(ddbUtils.ddbQueryTimerPbHistory).toHaveBeenCalledWith(
            "t",
            "L",
            "H"
        );
    });

    test("queryTimerHistoryByOrgId finds the timer chosen by the org", async () => {
        const { service, ddbUtils } = build();

        await expect(
            service.queryTimerHistoryByOrgId({ orgId: ORG })
        ).resolves.toEqual(["u2"]);
        expect(ddbUtils.getTimerConfigByOrgId).toHaveBeenCalledWith(ORG);
    });

    test("queryTimerHistoryByOrgId explains what is missing", async () => {
        const noConfig = build({
            getTimerConfigByOrgId: jest.fn(async () => null),
        });
        await expect(
            noConfig.service.queryTimerHistoryByOrgId({ orgId: ORG })
        ).resolves.toEqual({
            error: "queryTimerHistoryByOrgId Missing timerConfig",
        });

        const noMatch = build({
            getTimerConfigByOrgId: jest.fn(async () => ({ sha: "nope" })),
        });
        await expect(
            noMatch.service.queryTimerHistoryByOrgId({ orgId: ORG })
        ).resolves.toEqual({ error: "Missing selectedTimerUuid" });
    });
});

describe("addTimerPbConfig", () => {
    const base = {
        orgIz: "Org1",
        orgId: ORG,
        pb: Buffer.from("hello").toString("base64"),
        timerName: "tn",
        timerMqttClientId: "mq",
        at: "1",
    };

    test.each([
        ["orgIz", "Missing orgIz"],
        ["orgId", "Missing orgId"],
        ["pb", "Missing protobuf"],
    ])("requires %s", async (field, error) => {
        const { service } = build();

        await expect(
            service.addTimerPbConfig({ ...base, [field]: undefined })
        ).resolves.toEqual({ error });
    });

    test("needs an event config", async () => {
        const { service } = build({
            getEventConfig: jest.fn(async () => null),
        });

        await expect(service.addTimerPbConfig({ ...base })).resolves.toEqual({
            status: "error",
            error: "No Event config found.",
        });
    });

    test("ignores an update based on stale data", async () => {
        const { service, ddbUtils } = build({
            ddbQueryPkSk: jest.fn(async () => ({ SK: "tn", at: "0" })),
        });

        await expect(service.addTimerPbConfig({ ...base })).resolves.toEqual({
            status: "error",
            error: "Update request ignored due to stale data.  Refresh your Browser.",
        });
        expect(ddbUtils.addSingle).not.toHaveBeenCalled();
    });

    test("saves the config and the decoded protobuf for the timer", async () => {
        const { service, ddbUtils } = build();

        const rc = await service.addTimerPbConfig({ ...base });

        expect(rc.status).toBe("ok");
        expect(ddbUtils.addSingle.mock.calls[0][0]).toMatchObject({
            PK: ":TimerPbConfig",
            timerName: "tn",
        });
        const [put, table] = ddbUtils.ddbPut.mock.calls[0];
        expect(table).toBe("pb-table");
        expect(put).toMatchObject({ PK: "T:mq", TTL: 99 });
        expect(put.SK).toMatch(/^9999:/);
        expect(Buffer.from(put.data).toString()).toBe("hello");
    });
});

describe("addTimerConfig", () => {
    const base = { orgIz: "Org1", orgId: ORG };

    test.each([
        ["orgIz", "Missing orgIz"],
        ["orgId", "Missing orgId"],
    ])("requires %s", async (field, error) => {
        const { service } = build();

        await expect(
            service.addTimerConfig({ ...base, [field]: undefined }, true)
        ).resolves.toEqual({ error });
    });

    test("fills in defaults on the initial load", async () => {
        const { service, ddbUtils } = build();

        await service.addTimerConfig({ ...base }, true);

        expect(ddbUtils.ddbQueryPkSk).not.toHaveBeenCalled();
        expect(ddbUtils.addSingle.mock.calls[0][0]).toEqual({
            ...base,
            PK: ":TimerConfig",
            clearMS: 3001,
            maxCarLenMS: 601,
            minCarLenMS: 301,
            maxPerfCount: 1,
            lanes: ["lane1", "lane2"],
        });
    });

    test("merges a partial update into the previous config", async () => {
        const { service, ddbUtils } = build({
            ddbQueryPkSk: jest.fn(async () => ({
                ...base,
                clearMS: 5,
                maxPerfCount: 1,
            })),
        });

        await service.addTimerConfig({ ...base, maxPerfCount: 2 }, false);

        expect(ddbUtils.ddbQueryPkSk).toHaveBeenCalledWith(
            `${ORG}:TimerConfig`,
            "TimerConfig"
        );
        expect(ddbUtils.addSingle.mock.calls[0][0]).toMatchObject({
            clearMS: 5,
            maxPerfCount: 2,
        });
    });

    test("an update needs a previous config", async () => {
        const { service, ddbUtils } = build();

        await expect(
            service.addTimerConfig({ ...base }, false)
        ).resolves.toEqual({
            error: "Missing Prev TimerConfig",
        });
        expect(ddbUtils.addSingle).not.toHaveBeenCalled();
    });

    test("registers the event with the timer the sha selects", async () => {
        const { service, ddbUtils } = build();

        await service.addTimerConfig({ ...base, sha: shaOf("u1") }, true);

        const [registration, table] = ddbUtils.ddbPut.mock.calls[0];
        expect(table).toBe("timer-table");
        expect(registration).toMatchObject({ PK: "u1", SK: `^${ORG}` });
        expect(registration.sha).toBeUndefined();
        // the event's own record keeps the sha
        expect(ddbUtils.addSingle.mock.calls[0][0].sha).toBe(shaOf("u1"));
    });

    test("an unknown sha registers nothing but still saves", async () => {
        const { service, ddbUtils } = build();

        await service.addTimerConfig({ ...base, sha: "nope" }, true);

        expect(ddbUtils.ddbPut).not.toHaveBeenCalled();
        expect(ddbUtils.addSingle).toHaveBeenCalledTimes(1);
    });
});
