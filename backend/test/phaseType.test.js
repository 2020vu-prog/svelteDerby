const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");

const entityFactory = new EntityFactory({
    orgId: "Test.phaseType",
    by: "jest",
});

function buildRacePhase(pt) {
    return entityFactory.build({
        PK: "Test.phaseType:RP",
        SK: `phase-${pt || "missing"}`,
        cn: ["333", "334"],
        ...(pt ? { pt } : {}),
    });
}

test("race phase type requires pending", () => {
    expect(buildRacePhase("R").pendingNeeded).toBe(true);
});

test("missing phase type defaults to pending-needed", () => {
    expect(buildRacePhase().pendingNeeded).toBe(true);
});

test.each(["T", "T1", "H2", "F", "Y"])(
    "%s phase type does not require pending",
    (pt) => {
        expect(buildRacePhase(pt).pendingNeeded).toBe(false);
    }
);
