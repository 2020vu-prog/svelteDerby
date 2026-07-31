const DdbUtils = require("../modules/lambdaDerby/src/DdbUtils.js");
const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
const requestContext = require("../modules/lambdaDerby/src/RequestContext.js");

function buildDdbUtils() {
    const AWS = {
        DynamoDB: {
            DocumentClient: class {},
            Converter: {
                marshall: (entity) => ({ ...entity }),
            },
        },
    };
    const ddbUtils = new DdbUtils(AWS, {}, {});
    ddbUtils.flushedRequests = [];
    ddbUtils.flushBulkRequests = async (requests) => {
        ddbUtils.flushedRequests.push(...requests);
        return requests.length;
    };
    return ddbUtils;
}

describe("DdbUtils addSingle", () => {
    afterEach(() => {
        requestContext.reset();
    });

    test("uses request-scoped EntityFactory", async () => {
        const requestFactory = new EntityFactory({
            orgId: "requestEvent",
            by: "requestUser",
        });
        const ddbUtils = buildDdbUtils();
        requestContext.setEntityFactory(requestFactory);

        const result = await ddbUtils.addSingle({
            PK: ":RS",
            SK: "standing1",
            cn: ["101", "102"],
        });

        expect(result.status).toBe("ok");
        expect(result.entity.PK).toBe("requestEvent:RS");
        expect(result.entity.by).toBe("requestUser");
        expect(ddbUtils.flushedRequests[0].PutRequest.Item.PK).toBe(
            "requestEvent:RS"
        );
    });

    test("uses scoped EntityFactory override from RequestContext", async () => {
        const overrideFactory = new EntityFactory({
            orgId: "overrideEvent",
            by: "overrideUser",
        });
        const ddbUtils = buildDdbUtils();

        const result = await requestContext.withEntityFactory(
            overrideFactory,
            () => ddbUtils.addSingle({
                PK: ":RS",
                SK: "standing1",
                cn: ["101", "102"],
            })
        );

        expect(result.status).toBe("ok");
        expect(result.entity.PK).toBe("overrideEvent:RS");
        expect(result.entity.by).toBe("overrideUser");
        expect(ddbUtils.flushedRequests[0].PutRequest.Item.PK).toBe(
            "overrideEvent:RS"
        );
    });

    test("keeps overlapping async EntityFactory contexts isolated", async () => {
        const ddbUtils = buildDdbUtils();
        const factoryA = new EntityFactory({
            orgId: "eventA",
            by: "userA",
        });
        const factoryB = new EntityFactory({
            orgId: "eventB",
            by: "userB",
        });

        const writeStanding = (factory, delayMs) =>
            requestContext.withEntityFactory(factory, async () => {
                await new Promise((resolve) => setTimeout(resolve, delayMs));
                return ddbUtils.addSingle({
                    PK: ":RS",
                    SK: "standing1",
                    cn: ["101", "102"],
                });
            });

        const [resultA, resultB] = await Promise.all([
            writeStanding(factoryA, 5),
            writeStanding(factoryB, 0),
        ]);

        expect(resultA.entity.PK).toBe("eventA:RS");
        expect(resultA.entity.by).toBe("userA");
        expect(resultB.entity.PK).toBe("eventB:RS");
        expect(resultB.entity.by).toBe("userB");
    });
});
