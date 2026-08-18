const {
    buildTimerColumnRaces,
    getConfiguredMappings,
    getMappingConflicts,
    timerDataListToBlockedEvents,
} = require("../../frontend/src/timerColumns.js");

const mappings = [
    { virtualLane: 1, timerId: "timer-a", pinName: 1 },
    { virtualLane: 2, timerId: "timer-b", pinName: 2 },
    { virtualLane: 3, timerId: "timer-c", pinName: 1 },
];

function event(timerId, pinName, gpsMicros) {
    return {
        key: `${timerId}:${pinName}:${gpsMicros}`,
        timerId,
        pinName,
        gpsMicros,
    };
}

describe("TimerColumns race calculation", () => {
    test("extracts only blocked timer pins with GPS timestamps", () => {
        const timerDataList = {
            timerData: [
                {
                    timerPin: {
                        pinName: 1,
                        pinState: 1,
                        stamp: { gpsTime: { seconds: 100, nanos: 123456000 } },
                    },
                },
                {
                    timerPin: {
                        pinName: 2,
                        pinState: 0,
                        stamp: { gpsTime: { seconds: 101, nanos: 0 } },
                    },
                },
                { timerPin: { pinName: 2, pinState: 1, stamp: {} } },
            ],
        };

        expect(timerDataListToBlockedEvents("timer-a", timerDataList)).toEqual([
            {
                key: "timer-a:1:100123456",
                timerId: "timer-a",
                pinName: 1,
                gpsMicros: 100123456,
            },
        ]);
    });

    test("starts a new race only after more than ten seconds", () => {
        const events = [
            event("timer-a", 1, 1_000_000),
            event("timer-b", 2, 11_000_000),
            event("timer-a", 1, 21_000_001),
        ];

        const races = buildTimerColumnRaces(events, mappings);

        expect(races).toHaveLength(2);
        expect(races[1].startMicros).toBe(1_000_000);
        expect(races[0].startMicros).toBe(21_000_001);
    });

    test("uses the first blocked event per lane and calculates placements", () => {
        const events = [
            event("timer-b", 2, 1_000_300),
            event("timer-a", 1, 1_000_100),
            event("timer-a", 1, 1_000_200),
            event("timer-c", 1, 1_000_300),
        ];

        const [race] = buildTimerColumnRaces(events, mappings);
        const [lane1, lane2, lane3] = race.lanes;

        expect(lane1.result).toMatchObject({
            placeLabel: "1st",
            deltaMicros: 0,
            tied: false,
            winByMicros: 200,
        });
        expect(lane2.result).toMatchObject({
            placeLabel: "2nd",
            deltaMicros: 200,
            tied: true,
        });
        expect(lane3.result).toMatchObject({
            placeLabel: "2nd",
            deltaMicros: 200,
            tied: true,
        });
    });

    test("removes duplicate timer and physical-lane mappings", () => {
        expect(
            getConfiguredMappings([
                mappings[0],
                { virtualLane: 2, timerId: "timer-a", pinName: 1 },
            ])
        ).toEqual([mappings[0]]);
    });

    test("identifies the virtual lanes and timer names in a conflict", () => {
        expect(
            getMappingConflicts([
                {
                    virtualLane: 1,
                    timerName: "Finish",
                    timerId: "shared-client",
                    pinName: 1,
                },
                {
                    virtualLane: 2,
                    timerName: "Finish",
                    timerId: "shared-client",
                    pinName: 2,
                },
                {
                    virtualLane: 3,
                    timerName: "Finish3",
                    timerId: "shared-client",
                    pinName: 1,
                },
            ])
        ).toEqual([
            {
                timerId: "shared-client",
                pinName: 1,
                virtualLanes: [1, 3],
                timerNames: ["Finish", "Finish3"],
            },
        ]);
    });
});
