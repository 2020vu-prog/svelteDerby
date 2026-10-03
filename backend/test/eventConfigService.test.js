const EventConfigService = require("../modules/lambdaDerby/src/EventConfigService.js");

const ORG_IZ = "Org1";
const ORG_ID = "Org1.abc";
const SAVED_ENV = {};

beforeEach(() => {
    for (const key of ["AddEventSnsArn", "DeployEnvironment"]) {
        SAVED_ENV[key] = process.env[key];
    }
    process.env.AddEventSnsArn = "arn:aws:sns:topic";
    process.env.DeployEnvironment = "test";
    jest.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => {
    jest.restoreAllMocks();
    for (const [key, value] of Object.entries(SAVED_ENV)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

function build(overrides = {}) {
    const entityFactory = {
        copyWith: jest.fn((changes) => ({ copiedWith: changes })),
    };
    const ddbUtils = {
        ddbQueryPkSk: jest.fn(async () => ({
            paUri: "orgpa",
            defaultTTL: 600,
        })),
        getEventConfigByIds: jest.fn(async () => null),
        addSingle: jest.fn(async (json) => ({ status: "ok", entity: json })),
        flushEventCache: jest.fn(),
        ...overrides,
    };
    const requestContext = {
        getEntityFactory: jest.fn(() => entityFactory),
        setEntityFactory: jest.fn(),
        withEntityFactory: jest.fn((factory, fn) => fn()),
    };
    const logUtils = { persistLogMessage: jest.fn(async () => ({})) };
    const snsClient = { send: jest.fn(async () => ({ MessageId: "m" })) };
    const timerConfigService = { addTimerConfig: jest.fn(async () => ({})) };
    const announce = { submitToPolly: jest.fn(async () => ({})) };
    const refreshUserDisplayNamesFromOrgPerm = jest.fn(async () => ({
        status: "ok",
    }));
    const service = new EventConfigService({
        ddbUtils,
        snsClient,
        logUtils,
        requestContext,
        timerConfigService,
        newAnnounceResults: () => announce,
        orgUserService: { refreshUserDisplayNamesFromOrgPerm },
    });
    return {
        service,
        ddbUtils,
        requestContext,
        entityFactory,
        logUtils,
        snsClient,
        timerConfigService,
        announce,
        refreshUserDisplayNamesFromOrgPerm,
    };
}

describe("addOrgConfig", () => {
    test("forces the key and saves under an org-scoped entity factory", async () => {
        const { service, ddbUtils, requestContext, entityFactory } = build();

        await service.addOrgConfig({ orgIz: ORG_IZ, paUri: "u" });

        expect(entityFactory.copyWith).toHaveBeenCalledWith({ orgIz: ORG_IZ });
        expect(requestContext.withEntityFactory).toHaveBeenCalledTimes(1);
        expect(ddbUtils.addSingle).toHaveBeenCalledWith({
            orgIz: ORG_IZ,
            paUri: "u",
            PK: "OrgConfig",
            SK: ORG_IZ,
        });
    });
});

describe("addNewEventPushSns", () => {
    test("publishes the new event to the configured topic", async () => {
        const { service, snsClient } = build();

        await service.addNewEventPushSns(ORG_ID, { orgIz: ORG_IZ, name: "N" });

        const command = snsClient.send.mock.calls[0][0];
        expect(command.input).toEqual({
            Message: "new event for org: Org1\nName: N",
            TopicArn: "arn:aws:sns:topic",
            Subject: "RR1 [test] new event",
            MessageAttributes: {
                orgId: { DataType: "String", StringValue: ORG_ID },
            },
        });
    });

    test("a failed publish is logged, not thrown", async () => {
        const { service, snsClient } = build();
        snsClient.send.mockRejectedValue(new Error("sns down"));

        await expect(
            service.addNewEventPushSns(ORG_ID, { orgIz: ORG_IZ })
        ).resolves.toBeUndefined();
    });
});

describe("updateEventConfig", () => {
    const update = {
        orgIz: ORG_IZ,
        orgId: ORG_ID,
        paUri: "p",
        pendingRule: "1Race",
        lcl1: "true",
        name: "New",
    };

    test("reports a missing event", async () => {
        const { service, ddbUtils } = build();

        await expect(service.updateEventConfig({ ...update })).resolves.toEqual(
            {
                statusCode: 404,
                error: "Event config not found",
            }
        );
        expect(ddbUtils.addSingle).not.toHaveBeenCalled();
    });

    test("copies only the editable fields, flushes the cache, and refreshes names", async () => {
        const { service, ddbUtils, refreshUserDisplayNamesFromOrgPerm } = build(
            {
                getEventConfigByIds: jest.fn(async () => ({
                    orgIz: ORG_IZ,
                    orgId: ORG_ID,
                    paUri: "old",
                    name: "Old",
                    keep: 1,
                })),
            }
        );

        const result = await service.updateEventConfig({ ...update });

        expect(ddbUtils.getEventConfigByIds).toHaveBeenCalledWith({
            orgIz: ORG_IZ,
            orgId: ORG_ID,
        });
        expect(ddbUtils.flushEventCache).toHaveBeenCalledTimes(1);
        expect(ddbUtils.addSingle).toHaveBeenCalledWith({
            orgIz: ORG_IZ,
            orgId: ORG_ID,
            paUri: "p",
            pendingRule: "1Race",
            lcl1: "true",
            name: "New",
            keep: 1,
        });
        expect(refreshUserDisplayNamesFromOrgPerm).toHaveBeenCalledWith({
            orgIz: ORG_IZ,
            orgId: ORG_ID,
        });
        expect(result.userDisplayNameResult).toEqual({ status: "ok" });
    });
});

describe("addEventConfig", () => {
    const event = (body) => ({ body: JSON.stringify(body) });
    const newEvent = { orgIz: ORG_IZ, orgId: ORG_ID, name: "E" };

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(new Date("2026-10-03T12:00:00Z"));
    });
    afterEach(() => jest.useRealTimers());

    test("saves the event with the org's paUri and a ttl from its default", async () => {
        const { service, ddbUtils, requestContext, entityFactory } = build();

        await service.addEventConfig(event(newEvent));

        const nowSeconds = Date.parse("2026-10-03T12:00:00Z") / 1000;
        expect(ddbUtils.ddbQueryPkSk).toHaveBeenCalledWith("OrgConfig", ORG_IZ);
        expect(entityFactory.copyWith).toHaveBeenCalledWith({
            orgId: ORG_ID,
            TTL: nowSeconds + 600,
        });
        expect(requestContext.setEntityFactory).toHaveBeenCalledTimes(1);
        expect(ddbUtils.addSingle).toHaveBeenCalledWith({
            ...newEvent,
            PK: "EventConfig",
            SK: "Org1:Org1.abc",
            paUri: "orgpa",
            TTL: nowSeconds + 600,
        });
    });

    test("keeps a paUri supplied by the caller", async () => {
        const { service, ddbUtils } = build();

        await service.addEventConfig(event({ ...newEvent, paUri: "mine" }));

        expect(ddbUtils.addSingle.mock.calls[0][0].paUri).toBe("mine");
    });

    test("an org without a default ttl gets one day", async () => {
        const { service, ddbUtils } = build({
            ddbQueryPkSk: jest.fn(async () => ({ paUri: "orgpa" })),
        });

        await service.addEventConfig(event(newEvent));

        const nowSeconds = Date.parse("2026-10-03T12:00:00Z") / 1000;
        expect(ddbUtils.addSingle.mock.calls[0][0].TTL).toBe(
            nowSeconds + 86400
        );
    });

    test("logs, refreshes names, announces, and creates the default timer config", async () => {
        const {
            service,
            logUtils,
            snsClient,
            timerConfigService,
            refreshUserDisplayNamesFromOrgPerm,
        } = build();

        const result = await service.addEventConfig(event(newEvent));

        const logged = logUtils.persistLogMessage.mock.calls[0][0];
        expect(logged).toMatchObject({
            orgId: ORG_ID,
            message: "Added event: E",
            level: "debug",
            detail: { orgIz: ORG_IZ, orgId: ORG_ID, name: "E" },
        });
        // getSourceName is stack-derived: it names this file's service
        expect(logged.source).toMatch(/^EventConfigService\.js:/);
        expect(refreshUserDisplayNamesFromOrgPerm).toHaveBeenCalledWith({
            orgIz: ORG_IZ,
            orgId: ORG_ID,
        });
        expect(snsClient.send).toHaveBeenCalledTimes(1);
        expect(timerConfigService.addTimerConfig).toHaveBeenCalledWith(
            expect.objectContaining({ PK: "EventConfig" }),
            true
        );
        expect(result.userDisplayNameResult).toEqual({ status: "ok" });
    });

    test("still creates the timer config when the announcement fails", async () => {
        const { service, snsClient, timerConfigService } = build();
        snsClient.send.mockRejectedValue(new Error("sns down"));

        await service.addEventConfig(event(newEvent));

        expect(timerConfigService.addTimerConfig).toHaveBeenCalledTimes(1);
    });
});

describe("addParticipant2", () => {
    const driver = { orgId: ORG_ID, number: 7, name: "Racer" };

    test("announces the new driver and saves a participant record", async () => {
        const { service, ddbUtils, announce } = build({
            ddbQueryPkSk: jest.fn(async () => null),
        });

        await service.addParticipant2({ ...driver });

        expect(announce.submitToPolly).toHaveBeenCalledWith(
            "added driver: Racer",
            ORG_ID
        );
        expect(ddbUtils.addSingle).toHaveBeenCalledWith({
            ...driver,
            PK: ":PTCP",
        });
    });

    test("a routine edit keeps the driver's QR-code delegation grants", async () => {
        const { service, ddbUtils } = build({
            ddbQueryPkSk: jest.fn(async () => ({ maintainerHashes: ["h"] })),
        });

        await service.addParticipant2({ ...driver });

        expect(ddbUtils.ddbQueryPkSk).toHaveBeenCalledWith(
            `${ORG_ID}:PTCP`,
            "7"
        );
        expect(ddbUtils.addSingle.mock.calls[0][0].maintainerHashes).toEqual([
            "h",
        ]);
    });

    test("explicit grants win, and a driver without a number is not looked up", async () => {
        const explicit = build({
            ddbQueryPkSk: jest.fn(async () => ({ maintainerHashes: ["old"] })),
        });
        await explicit.service.addParticipant2({
            ...driver,
            maintainerHashes: ["new"],
        });
        expect(explicit.ddbUtils.ddbQueryPkSk).not.toHaveBeenCalled();
        expect(
            explicit.ddbUtils.addSingle.mock.calls[0][0].maintainerHashes
        ).toEqual(["new"]);

        const noNumber = build();
        await noNumber.service.addParticipant2({
            ...driver,
            number: undefined,
        });
        expect(noNumber.ddbUtils.ddbQueryPkSk).not.toHaveBeenCalled();
    });
});
