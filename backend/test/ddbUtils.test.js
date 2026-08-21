const DdbUtils = require("../modules/lambdaDerby/src/DdbUtils.js");
const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
const requestContext = require("../modules/lambdaDerby/src/RequestContext.js");
const {
    marshall,
} = require("../modules/lambdaDerby/src/node_modules/@aws-sdk/util-dynamodb");

function buildDdbUtils() {
    const ddbUtils = new DdbUtils(
        { send: jest.fn() },
        { send: jest.fn() },
        { send: jest.fn() }
    );
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
        expect(ddbUtils.flushedRequests[0].PutRequest.Item.PK.S).toBe(
            "requestEvent:RS"
        );
        expect(ddbUtils.flushedRequests[0].PutRequest.Item.M).toBeUndefined();
    });

    test("uses scoped EntityFactory override from RequestContext", async () => {
        const overrideFactory = new EntityFactory({
            orgId: "overrideEvent",
            by: "overrideUser",
        });
        const ddbUtils = buildDdbUtils();

        const result = await requestContext.withEntityFactory(
            overrideFactory,
            () =>
                ddbUtils.addSingle({
                    PK: ":RS",
                    SK: "standing1",
                    cn: ["101", "102"],
                })
        );

        expect(result.status).toBe("ok");
        expect(result.entity.PK).toBe("overrideEvent:RS");
        expect(result.entity.by).toBe("overrideUser");
        expect(ddbUtils.flushedRequests[0].PutRequest.Item.PK.S).toBe(
            "overrideEvent:RS"
        );
        expect(ddbUtils.flushedRequests[0].PutRequest.Item.M).toBeUndefined();
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

describe("DdbUtils unmarshalling", () => {
    test("uses shared unmarshalling for array and keyed object results", () => {
        const ddbUtils = buildDdbUtils();
        const data = {
            Items: [
                marshall({
                    PK: "event1:RS",
                    SK: "standing1",
                    cn: ["101", "102"],
                }),
                marshall({
                    PK: "event1:RS",
                    SK: "standing2",
                    cn: ["103", "104"],
                }),
            ],
        };

        const arrayResult = ddbUtils.unmarshallResultsToArray(data);
        const objectResult = ddbUtils.unmarshallResultsToObject(data, "SK");

        expect(arrayResult).toEqual([
            { PK: "event1:RS", SK: "standing1", cn: ["101", "102"] },
            { PK: "event1:RS", SK: "standing2", cn: ["103", "104"] },
        ]);
        expect(objectResult).toEqual({
            standing1: { PK: "event1:RS", SK: "standing1", cn: ["101", "102"] },
            standing2: { PK: "event1:RS", SK: "standing2", cn: ["103", "104"] },
        });
    });
});
