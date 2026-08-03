const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
const LogUtils = require("../modules/lambdaDerby/src/LogUtils.js");
const requestContext = require("../modules/lambdaDerby/src/RequestContext.js");

function buildLogUtils() {
    const ddbUtils = {
        addSingle: jest.fn(async (payload) => {
            const activeFactory = requestContext.getEntityFactory();
            const entity = activeFactory.build(payload);
            entity.preWrite();
            return { status: "ok", entity };
        }),
    };

    return {
        ddbUtils,
        logUtils: new LogUtils(ddbUtils),
    };
}

describe("LogUtils", () => {
    afterEach(() => {
        requestContext.reset();
    });

    test("persists string log messages with EntityFactory context", async () => {
        const { ddbUtils, logUtils } = buildLogUtils();
        const entityFactory = new EntityFactory({
            orgId: "event1",
            by: "tester",
            TTL: 123,
        });

        const result = await logUtils.persistLogMessage(
            "Example log message",
            entityFactory
        );

        expect(result.status).toBe("ok");
        expect(result.entity.classType).toBe("LogMessage");
        expect(result.entity.PK).toBe("event1:LogMessage");
        expect(result.entity.message).toBe("Example log message");
        expect(result.entity.by).toBe("tester");
        expect(result.entity.TTL).toBe(123);
        expect(ddbUtils.addSingle).toHaveBeenCalledWith(
            expect.objectContaining({
                PK: ":LogMessage",
                orgId: "event1",
                message: "Example log message",
                by: "tester",
                TTL: 123,
            })
        );
    });

    test("persists object log messages with request EntityFactory context", async () => {
        const { ddbUtils, logUtils } = buildLogUtils();
        requestContext.setEntityFactory(
            new EntityFactory({
                orgId: "requestEvent",
                by: "requestUser",
            })
        );

        const result = await logUtils.persistLogMessage({
            orgId: "event2",
            message: "Something happened",
            level: "warn",
            source: "test",
            detail: { racer: "101" },
        });

        expect(result.status).toBe("ok");
        expect(result.entity.PK).toBe("requestEvent:LogMessage");
        expect(result.entity.by).toBe("requestUser");
        expect(result.entity.message).toBe("Something happened");
        expect(result.entity.level).toBe("warn");
        expect(result.entity.source).toBe("test");
        expect(result.entity.detail).toEqual({ racer: "101" });
        expect(ddbUtils.addSingle).toHaveBeenCalledWith(
            expect.objectContaining({
                PK: ":LogMessage",
                orgId: "requestEvent",
                message: "Something happened",
                by: "requestUser",
            })
        );
    });

    test("requires orgId and message", async () => {
        const { ddbUtils, logUtils } = buildLogUtils();

        await expect(logUtils.persistLogMessage("missing org")).resolves.toEqual(
            { error: "missing orgId" }
        );
        await expect(
            logUtils.persistLogMessage({ orgId: "event1" })
        ).resolves.toEqual({ error: "missing message" });
        expect(ddbUtils.addSingle).not.toHaveBeenCalled();
    });
});
