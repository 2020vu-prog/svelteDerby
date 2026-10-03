const SnsFinishTimeIngestion = require("../modules/lambdaDerby/src/SnsFinishTimeIngestion.js");

const ORG_ID = "Org1.abc";
const ORG_IZ = "Org1";
const timerConfig = { orgId: ORG_ID, orgIz: ORG_IZ, TTL: 55 };
// Block published at 1000 ms; sns time strings compare as text with `at`.
const nextOnBlocks = (extra = {}) => ({
    SK: "55",
    cn: ["100", "109"],
    TTL: 777,
    at: 1000,
    ...extra,
});

let savedElapsedTable;
beforeEach(() => {
    savedElapsedTable = process.env.ElapsedTempDbTable;
    process.env.ElapsedTempDbTable = "elapsed-table";
});
afterEach(() => {
    if (savedElapsedTable === undefined) delete process.env.ElapsedTempDbTable;
    else process.env.ElapsedTempDbTable = savedElapsedTable;
});

function build({ blocks = [nextOnBlocks()] } = {}) {
    const announce = {
        submitToPolly: jest.fn(async () => "mp3/path"),
        propagateIotGeneric: jest.fn(async () => {}),
    };
    const ddbUtils = {
        ddbQueryRpNextOnBlocks: jest.fn(async () => blocks),
        ddbPut: jest.fn(async () => ({})),
    };
    const requestContext = { setEntityFactory: jest.fn() };
    const raceProgressionService = {
        applyFinishTime: jest.fn(async () => ({ status: "ok" })),
    };
    const service = new SnsFinishTimeIngestion({
        ddbUtils,
        requestContext,
        raceProgressionService,
        newAnnounceResults: () => announce,
    });
    return {
        service,
        announce,
        ddbUtils,
        requestContext,
        raceProgressionService,
    };
}

describe("time helpers", () => {
    const { service } = build();

    test("dbFmtTimer replaces NaN, which dynamo cannot store", () => {
        expect(service.dbFmtTimer(NaN)).toBe(0);
        expect(service.dbFmtTimer("x")).toBe(0);
        expect(service.dbFmtTimer(1500)).toBe(1500);
    });

    test("validNumericTime rejects NaN and zero", () => {
        expect(service.validNumericTime(5)).toBe(true);
        expect(service.validNumericTime("7")).toBe(true);
        expect(service.validNumericTime(0)).toBe(false);
        expect(service.validNumericTime(NaN)).toBe(false);
        expect(service.validNumericTime(undefined)).toBe(false);
    });
});

describe("snsApplyPbLogMessage", () => {
    test("announces the message as ssml and pushes the audio to the org", async () => {
        const { service, announce } = build();

        await service.snsApplyPbLogMessage(
            { logMessage: { message: "hi" }, timerConfig: { orgId: ORG_ID } },
            "2026-10-03T12:00:00.000Z"
        );

        expect(announce.submitToPolly).toHaveBeenCalledWith(
            "<speak>hi</speak>",
            ORG_ID
        );
        expect(announce.propagateIotGeneric).toHaveBeenCalledWith(
            ORG_ID,
            "mp3/path"
        );
    });
});

describe("getApplyableNextOnBlocks", () => {
    test("returns the first race on the blocks", async () => {
        const first = nextOnBlocks({ SK: "a" });
        const { service, ddbUtils } = build({
            blocks: [first, nextOnBlocks({ SK: "b" })],
        });

        await expect(
            service.getApplyableNextOnBlocks(5000, "9999", ORG_ID, ORG_IZ)
        ).resolves.toBe(first);
        expect(ddbUtils.ddbQueryRpNextOnBlocks).toHaveBeenCalledWith({
            orgId: ORG_ID,
            orgIz: ORG_IZ,
        });
    });

    test("throws when nothing is on the blocks", async () => {
        const { service } = build({ blocks: [] });

        await expect(
            service.getApplyableNextOnBlocks(5000, "9999", ORG_ID, ORG_IZ)
        ).rejects.toBe(
            "getApplyableNextOnBlocks Message : blocks are empty 0."
        );
    });

    test("refuses an sns time older than the race, rejecting with its start time", async () => {
        const { service } = build({
            blocks: [nextOnBlocks({ at: "2999-01-01T00:00:00.000Z" })],
        });

        // the rejection value is the comma expression's last operand: rp.at
        await expect(
            service.getApplyableNextOnBlocks(
                5000,
                "2026-10-03T12:00:00.000Z",
                ORG_ID,
                ORG_IZ
            )
        ).rejects.toBe("2999-01-01T00:00:00.000Z");
    });

    test("refuses an audited finish older than the race, accepts an unaudited one", async () => {
        const { service } = build({ blocks: [nextOnBlocks({ at: 9000 })] });

        await expect(
            service.getApplyableNextOnBlocks(5000, "9999", ORG_ID, ORG_IZ)
        ).rejects.toBe(
            "getApplyableNextOnBlocks auditRecordMs: ignoring finishTime that is older than nextOnBlocks"
        );
        await expect(
            service.getApplyableNextOnBlocks(0, "9999", ORG_ID, ORG_IZ)
        ).resolves.toMatchObject({ SK: "55" });
    });
});

describe("snsApplyTimerHandler", () => {
    const message = (extra = {}) => ({
        timerConfig,
        deltas: [
            {
                lanes: {
                    lane1: { noseMicros: 111 },
                    lane2: { noseMicros: 222 },
                },
                cBlock: [{ pubTime: 5000 }],
            },
        ],
        ...extra,
    });

    test("applies the lane times to the race on the blocks", async () => {
        const { service, requestContext, raceProgressionService } = build();

        await service.snsApplyTimerHandler(message(), "9999");

        expect(
            requestContext.setEntityFactory.mock.calls[0][0].propOverrides
        ).toEqual({
            orgId: ORG_ID,
            by: "rpi.local",
            TTL: 55,
        });
        expect(raceProgressionService.applyFinishTime).toHaveBeenCalledWith({
            orgId: ORG_ID,
            orgIz: ORG_IZ,
            SK: "55",
            phr: [111, 222],
        });
    });

    test("an unaudited time (no candidate block) is still applied", async () => {
        const { service, raceProgressionService } = build();

        await service.snsApplyTimerHandler(
            message({
                deltas: [
                    {
                        lanes: {
                            lane1: { noseMicros: 1 },
                            lane2: { noseMicros: 2 },
                        },
                    },
                ],
            }),
            "9999"
        );

        expect(raceProgressionService.applyFinishTime).toHaveBeenCalledTimes(1);
    });

    test.each([
        ["no deltas", { timerConfig, deltas: [] }],
        ["no timer config", { deltas: [1] }],
        ["nothing", null],
    ])("ignores a message with %s", async (label, invalid) => {
        const { service, ddbUtils, raceProgressionService } = build();

        await service.snsApplyTimerHandler(invalid, "9999");

        expect(ddbUtils.ddbQueryRpNextOnBlocks).not.toHaveBeenCalled();
        expect(raceProgressionService.applyFinishTime).not.toHaveBeenCalled();
    });

    test("lets an empty blocks error reach the caller", async () => {
        const { service } = build({ blocks: [] });

        await expect(
            service.snsApplyTimerHandler(message(), "9999")
        ).rejects.toBe(
            "getApplyableNextOnBlocks Message : blocks are empty 0."
        );
    });
});

describe("snsApplyPbTimerHandler", () => {
    const finishBlock = (extra = {}) => ({
        timerName: "Finish",
        rpiNoseMicros: ["1500000", "2500000"],
        gpsAvailable: false,
        timerConfig,
        ...extra,
    });
    const message = (blocks, extra = {}) => ({
        finishBlocks: blocks,
        newXmitMs: "5000",
        ...extra,
    });

    test("applies the rpi times and saves the raw blocks as elapsed data", async () => {
        const { service, requestContext, raceProgressionService, ddbUtils } =
            build();
        const blocks = [{ timerName: "Start" }, finishBlock()];

        await service.snsApplyPbTimerHandler(message(blocks), "9999");

        expect(
            requestContext.setEntityFactory.mock.calls[0][0].propOverrides
        ).toEqual({
            orgId: ORG_ID,
            by: "rpi.local",
            TTL: 777,
        });
        expect(raceProgressionService.applyFinishTime).toHaveBeenCalledWith({
            orgId: ORG_ID,
            orgIz: ORG_IZ,
            SK: "55",
            phr: [1500000, 2500000],
        });
        expect(ddbUtils.ddbPut).toHaveBeenCalledWith(
            {
                PK: `${ORG_ID}:RpElapsed`,
                SK: "55",
                cn: ["100", "109"],
                fbList: JSON.stringify(blocks),
                TTL: 777,
            },
            "elapsed-table"
        );
    });

    test("prefers whole-millisecond gps times and marks them as gps", async () => {
        const { service, requestContext, raceProgressionService } = build();

        await service.snsApplyPbTimerHandler(
            message([
                finishBlock({ gpsAvailable: true, gpsNoseMs: [1500, 2500] }),
            ]),
            "9999"
        );

        expect(
            requestContext.setEntityFactory.mock.calls[0][0].propOverrides
        ).toEqual({
            orgId: ORG_ID,
            by: "rpi.gps",
            TTL: 777,
        });
        expect(
            raceProgressionService.applyFinishTime.mock.calls[0][0].phr
        ).toEqual([1500000, 2500000]);
    });

    test("uses the gps time, not the sns time, to judge a stale message", async () => {
        // sns time "1" is before the race (at 1000) as text; the gps time
        // (1500) is not, because the sns time was replaced.
        const { service, raceProgressionService } = build();

        await service.snsApplyPbTimerHandler(
            message([
                finishBlock({ gpsAvailable: true, gpsNoseMs: [1500, 2500] }),
            ]),
            "1"
        );

        expect(raceProgressionService.applyFinishTime).toHaveBeenCalledTimes(1);
    });

    test("needs exactly one Finish block", async () => {
        const { service } = build();

        // `throw ("missing finishLineBlock", finishLineBlock)` reads a const
        // declared later in the function, so the throw is a ReferenceError.
        await expect(
            service.snsApplyPbTimerHandler(
                message([{ timerName: "Start" }]),
                "9999"
            )
        ).rejects.toBeInstanceOf(ReferenceError);
        await expect(
            service.snsApplyPbTimerHandler(
                message([finishBlock(), finishBlock()]),
                "9999"
            )
        ).rejects.toBeInstanceOf(ReferenceError);
    });

    test("needs a time for each lane that has a car", async () => {
        const { service, raceProgressionService } = build();

        await expect(
            service.snsApplyPbTimerHandler(
                message([finishBlock({ rpiNoseMicros: ["x", "2500000"] })]),
                "9999"
            )
        ).rejects.toBe("missing time [NaN] for car [100,109] in lane 1");
        await expect(
            service.snsApplyPbTimerHandler(
                message([finishBlock({ rpiNoseMicros: ["1", "0"] })]),
                "9999"
            )
        ).rejects.toBe("missing time [0] for car [100,109] in lane 2");
        expect(raceProgressionService.applyFinishTime).not.toHaveBeenCalled();
    });

    test("an empty lane may have no time, which is stored as zero", async () => {
        const { service, raceProgressionService } = build({
            blocks: [nextOnBlocks({ cn: ["100"] })],
        });

        await service.snsApplyPbTimerHandler(
            message([finishBlock({ rpiNoseMicros: ["1500000", "x"] })]),
            "9999"
        );

        expect(
            raceProgressionService.applyFinishTime.mock.calls[0][0].phr
        ).toEqual([1500000, 0]);
    });
});
