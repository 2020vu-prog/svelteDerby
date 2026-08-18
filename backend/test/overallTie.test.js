//console.log("pwd:",process.cwd());

const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
const entityFactory = new EntityFactory({});

const overallJsonUntied = {
    at: 1599354141479,
    by: "rpi.local",
    orgId: "NDR.1f1a4",
    SK: "1599352739543",
    TTL: 1600477345,
    PK: "NDR.1f1a4:RS",
    ph1: [43391994101, 43392029221],
    ph2: [44001654064, 44001642499],
    cn: ["408", "436"],
};

const overallJsonTied = {
    at: 1599352116918,
    by: "rpi.local",
    orgId: "NDR.1f1a4",
    SK: "3e4c01:30",
    TTL: 1600477345,
    PK: "NDR.1f1a4:RS",
    ph1: [41504716194, 41504729544],
    ph2: [41977448561, 41977435521],
    cn: ["408", "436"],
    Bp: "3e4c01:30",
};

const overallRsUntied = entityFactory.build(overallJsonUntied);
const overallRsTied = entityFactory.build(overallJsonTied);

test("overall untie", () => {
    expect(overallRsUntied.isOverallTie()).toStrictEqual(false);
});
test("overall tie", () => {
    expect(overallRsTied.isOverallTie()).toStrictEqual(true);
});
