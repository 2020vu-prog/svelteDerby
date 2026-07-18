const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");

describe("EntityFactory classKey contracts", () => {
    const entityFactory = new EntityFactory({
        orgId: "myorgtestevent",
        orgIz: "testme",
        by: "tjest",
    });

    test.each([
        [
            "OrgPerm",
            {
                PK: "testme:OrgPerm",
                SK: "user@example.com",
                roleList: ["CanAddParticipant"],
            },
            "user@example.com",
        ],
        [
            "UserDisplayName",
            {
                PK: "myorgtestevent:UserDisplayName",
                SK: "OvMXT6EO",
                displayName: "Example User",
            },
            "OvMXT6EO",
        ],
        [
            "BracketMetaData",
            {
                PK: "myorgtestevent:Bmd",
                SK: "chart1",
                bracketName: "Chart 1",
            },
            "chart1",
        ],
        [
            "BracketPos",
            {
                PK: "myorgtestevent:Bp",
                SK: "chart1:01",
                pos: {},
            },
            "chart1:01",
        ],
        [
            "RacePhase",
            {
                PK: "myorgtestevent:RP",
                SK: "phase1",
                cn: ["101", "102"],
                pt: "R",
            },
            "phase1",
        ],
        [
            "RaceStanding",
            {
                PK: "myorgtestevent:RS",
                SK: "standing1",
                cn: ["101", "102"],
            },
            "standing1",
        ],
        [
            "Participant",
            {
                PK: "myorgtestevent:PTCP",
                number: "101",
                name: "Example Driver",
            },
            "101",
        ],
        [
            "TimerConfig",
            {
                PK: "myorgtestevent:TimerConfig",
                lanes: ["lane1", "lane2"],
            },
            "TimerConfig",
        ],
        [
            "TimerPbConfig",
            {
                PK: "myorgtestevent:TimerPbConfig",
                timerName: "Finish",
                pb: "abc",
            },
            "Finish",
        ],
    ])("%s uses SK as classKey", (expectedClassType, json, expectedClassKey) => {
        const entity = entityFactory.build(json);
        entity.preWrite();

        expect(entity.classType).toBe(expectedClassType);
        expect(entity.classKey).toBe(expectedClassKey);
        expect(entity.classKey).toBe(entity.SK);
        expect(entity.partitionKey).toBeTruthy();
        expect(entity.sortKey).toBeTruthy();
    });

    test.each([
        [
            "EventConfig",
            {
                PK: "EventConfig",
                orgId: "myorgtestevent",
                orgIz: "testme",
                name: "Example Event",
            },
            "myorgtestevent",
            "testme:myorgtestevent",
        ],
        [
            "OrgConfig",
            {
                PK: "OrgConfig",
                orgIz: "testme",
                defaultTTL: 86400,
            },
            "testme",
            "testme",
        ],
    ])(
        "%s keeps explicit classKey override",
        (expectedClassType, json, expectedClassKey, expectedSortKey) => {
            const entity = entityFactory.build(json);
            entity.preWrite();

            expect(entity.classType).toBe(expectedClassType);
            expect(entity.classKey).toBe(expectedClassKey);
            expect(entity.sortKey).toBe(expectedSortKey);
            expect(entity.partitionKey).toBeTruthy();
            expect(entity.sortKey).toBeTruthy();
        }
    );
});
