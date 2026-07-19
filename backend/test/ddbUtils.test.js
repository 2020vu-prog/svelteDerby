const DdbUtils = require("../modules/lambdaDerby/src/DdbUtils.js");
const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");

function buildDdbUtils(entityFactory) {
    const AWS = {
        DynamoDB: {
            DocumentClient: class {},
            Converter: {
                marshall: (entity) => ({ ...entity }),
            },
        },
    };
    const ddbUtils = new DdbUtils(AWS, {}, {});
    ddbUtils.setEntityFactory(entityFactory);
    ddbUtils.flushedRequests = [];
    ddbUtils.flushBulkRequests = async (requests) => {
        ddbUtils.flushedRequests.push(...requests);
        return requests.length;
    };
    return ddbUtils;
}

describe("DdbUtils addSingle", () => {
    test("uses optional EntityFactory instead of retained context", async () => {
        const retainedFactory = new EntityFactory({
            orgId: "retainedEvent",
            by: "retainedUser",
        });
        const overrideFactory = new EntityFactory({
            orgId: "overrideEvent",
            by: "overrideUser",
        });
        const ddbUtils = buildDdbUtils(retainedFactory);

        const result = await ddbUtils.addSingle(
            {
                PK: ":RS",
                SK: "standing1",
                cn: ["101", "102"],
            },
            overrideFactory
        );

        expect(result.status).toBe("ok");
        expect(result.entity.PK).toBe("overrideEvent:RS");
        expect(result.entity.by).toBe("overrideUser");
        expect(ddbUtils.flushedRequests[0].PutRequest.Item.PK).toBe(
            "overrideEvent:RS"
        );
    });
});
