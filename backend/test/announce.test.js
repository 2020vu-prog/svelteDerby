// to run: ./node_modules/.bin/jest ./announce.test.js

console.log("pwd:", process.cwd());

const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
//const entityFactory = new EntityFactory();
const entityFactory = new EntityFactory({ orgIz: "test.orgIz", by: "test.by" });

const AnnounceResults = require("../modules/lambdaDerby/src/AnnounceResults.js");
const announceResults = new AnnounceResults();

const aPhaseJsonTie = {
    at: 1593883407005,
    by: "2020vu@gmail.com",
    cn: ["100", "101"],
    orgId: "Test.e8c88",
    ph1: [0, 44],
    PK: "Test.e8c88:RS",
    SK: "1593883391826",
    TTL: 1593969415,
};
const aPhaseRpJson = {
    at: 1593883407005,
    by: "2020vu@gmail.com",
    cn: ["100", "101"],
    orgId: "Test.e8c88",
    ph1: [0, 44],
    pl: "A",
    PK: "Test.e8c88:RP",
    SK: "1593883391826",
    TTL: 1593969415,
};

test("Nob Announcement Race", () => {
    const ssm =
        '<speak>Attention race fans! Next up Phase <say-as interpret-as="characters" >A</say-as>. In lane 1, is Car <say-as interpret-as="characters" >100</say-as>. In lane 2, is Car <say-as interpret-as="characters" >101</say-as>.</speak>';
    const aPhaseRP = entityFactory.build(aPhaseRpJson);
    expect(
        announceResults.formatNextOnBlockAnnouncement("t.orgId", null, aPhaseRP)
    ).resolves.toStrictEqual(ssm);
});

test("Nob Announcement Trial", () => {
    const ssm =
        '<speak>Attention race fans! Next up is a Trial Run. In lane 1, is Car <say-as interpret-as="characters" >100</say-as>. In lane 2, is Car <say-as interpret-as="characters" >101</say-as>.</speak>';

    const aPhaseRP = entityFactory.build(aPhaseRpJson);
    aPhaseRP.phaseType = "T";
    expect(
        announceResults.formatNextOnBlockAnnouncement("t.orgId", null, aPhaseRP)
    ).resolves.toStrictEqual(ssm);
});
test("Nob Announcement Trial lane1", () => {
    const ssm =
        '<speak>Attention race fans! Next up is a Trial Run. In lane 1, is Car <say-as interpret-as="characters" >777</say-as>.</speak>';

    const aPhaseRP = entityFactory.build(aPhaseRpJson);
    aPhaseRP.phaseType = "T1";
    aPhaseRP.carNumbers = ["777", ""];
    expect(
        announceResults.formatNextOnBlockAnnouncement("t.orgId", null, aPhaseRP)
    ).resolves.toStrictEqual(ssm);
});
test("Nob Announcement Trial lane2", () => {
    const ssm =
        '<speak>Attention race fans! Next up is a Trial Run. In lane 2, is Car <say-as interpret-as="characters" >772</say-as>.</speak>';

    const aPhaseRP = entityFactory.build(aPhaseRpJson);
    aPhaseRP.phaseType = "T2";
    aPhaseRP.carNumbers = ["", "772"];
    expect(
        announceResults.formatNextOnBlockAnnouncement("t.orgId", null, aPhaseRP)
    ).resolves.toStrictEqual(ssm);
});
test("Nob Announcement Hot lane2", () => {
    const ssm =
        '<speak>Attention race fans! Next up is a Hot Run. In lane 2, is Car <say-as interpret-as="characters" >772</say-as>.</speak>';

    const aPhaseRP = entityFactory.build(aPhaseRpJson);
    aPhaseRP.phaseType = "H2";
    aPhaseRP.carNumbers = ["", "772"];
    expect(
        announceResults.formatNextOnBlockAnnouncement("t.orgId", null, aPhaseRP)
    ).resolves.toStrictEqual(ssm);
});

test("A Phase Result Announcement", () => {
    const aPhaseRS = entityFactory.build(aPhaseJsonTie);
    const ssm =
        '<speak> The Phase <say-as interpret-as="characters" >A</say-as> Result is a Tie.  </speak>';
    expect(
        announceResults.formatResultAnnouncement(aPhaseRS)
    ).resolves.toStrictEqual(ssm);
});
