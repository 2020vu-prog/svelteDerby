const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");

describe("EntityFactory copyWith", () => {
    test("copies existing overrides and applies replacements", () => {
        const entityFactory = new EntityFactory({
            orgId: "event1",
            orgIz: "org1",
            by: "tester",
            byEmail: " Test@Example.com ",
            TTL: 123,
        });

        const copy = entityFactory.copyWith({
            orgId: "event2",
            TTL: 456,
        });

        expect(copy).not.toBe(entityFactory);
        expect(copy.propOverrides).toEqual({
            orgId: "event2",
            orgIz: "org1",
            by: "tester",
            byEmail: " Test@Example.com ",
            TTL: 456,
        });
        expect(entityFactory.propOverrides).toEqual({
            orgId: "event1",
            orgIz: "org1",
            by: "tester",
            byEmail: " Test@Example.com ",
            TTL: 123,
        });
    });

    test("copied byEmail context still derives byH", () => {
        const entityFactory = new EntityFactory({
            orgId: "event1",
            by: "tester",
            byEmail: " Test@Example.com ",
        });

        const copy = entityFactory.copyWith({
            orgId: "event2",
        });
        const entity = copy.build({
            PK: "event2:RS",
            SK: "standing1",
            cn: ["101", "102"],
        });
        entity.preWrite();

        expect(entity.orgId).toBe("event2");
        expect(entity.by).toBeUndefined();
        expect(entity.byH).toBe("OvMXT6EO");
    });

    test("undefined override deletes copied property", () => {
        const entityFactory = new EntityFactory({
            orgId: "event1",
            by: "tester",
            byEmail: " Test@Example.com ",
            TTL: 123,
        });

        const copy = entityFactory.copyWith({
            byEmail: undefined,
            TTL: undefined,
        });
        const entity = copy.build({
            PK: "event1:RS",
            SK: "standing1",
            cn: ["101", "102"],
        });
        entity.preWrite();

        expect(copy.propOverrides).toEqual({
            orgId: "event1",
            by: "tester",
        });
        expect(entity.by).toBe("tester");
        expect(entity.byH).toBeUndefined();
        expect(entity.TTL).toBeUndefined();
    });
});

describe("EntityFactory audit fields", () => {
    test("email hash audit clears stale by field", () => {
        const entityFactory = new EntityFactory({
            orgId: "event1",
            byEmail: " Test@Example.com ",
        });
        const entity = entityFactory.build({
            PK: "event1:RS",
            SK: "standing1",
            by: "rpi.local",
            cn: ["101", "102"],
        });
        entity.preWrite();

        expect(entity.byH).toBe("OvMXT6EO");
        expect(entity.by).toBeUndefined();
    });

    test("plain audit clears stale byH field", () => {
        const entityFactory = new EntityFactory({
            orgId: "event1",
            by: "rpi.gps",
        });
        const entity = entityFactory.build({
            PK: "event1:RS",
            SK: "standing1",
            byH: "oldHash",
            cn: ["101", "102"],
        });
        entity.preWrite();

        expect(entity.by).toBe("rpi.gps");
        expect(entity.byH).toBeUndefined();
    });
});

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
        [
            "LogMessage",
            {
                PK: "myorgtestevent:LogMessage",
                SK: "log1",
                message: "Example log message",
                level: "info",
            },
            "log1",
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

    test("LogMessage default SK is an ISO8601 date with milliseconds", () => {
        const realDate = Date;
        const fixedMs = 1785183303556;
        global.Date = class extends realDate {
            constructor(...args) {
                return args.length
                    ? new realDate(...args)
                    : new realDate(fixedMs);
            }
            static getTime() {
                return fixedMs;
            }
            static now() {
                return fixedMs;
            }
        };
        try {
            const entity = entityFactory.build({
                PK: "myorgtestevent:LogMessage",
                message: "Example log message",
                level: "debug",
            });
            entity.preWrite();

            expect(entity.SK).toBe("2026-07-27T20:15:03.556Z");
            expect(entity.classKey).toBe(entity.SK);
        } finally {
            global.Date = realDate;
        }
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
