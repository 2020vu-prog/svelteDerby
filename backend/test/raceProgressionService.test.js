const EntityFactory = require("../modules/lambdaDerby/src/shared/EntityFactory.js");
const RaceProgressionService = require("../modules/lambdaDerby/src/RaceProgressionService.js");

const ef = new EntityFactory({});
const ORG = "Org1.abc";
const SAVED_ENV = {};

beforeEach(() => {
    for (const key of ["ChartS3BucketName", "ElapsedTempDbTable"]) {
        SAVED_ENV[key] = process.env[key];
    }
    process.env.ChartS3BucketName = "charts-bucket";
    process.env.ElapsedTempDbTable = "elapsed-table";
});

afterEach(() => {
    for (const [key, value] of Object.entries(SAVED_ENV)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
    }
});

// ---- entity builders (real entities, as DdbUtils returns them) ----
const P = (ptcp) => ({ disp: "ptcp", ptcp });
const bracketPos = (sk, pos) =>
    ef.build({
        PK: `${ORG}:Bp`,
        SK: sk,
        orgId: ORG,
        hn: sk.split(":")[1],
        pos,
    });
const raceStanding = (sk, extra = {}) =>
    ef.build({
        PK: `${ORG}:RS`,
        SK: sk,
        orgId: ORG,
        cn: ["100", "109"],
        ...extra,
    });
const racePhase = (extra = {}) =>
    ef.build({
        PK: `${ORG}:RP`,
        SK: "55",
        orgId: ORG,
        orgIz: "Org1",
        cn: ["100", "109"],
        ...extra,
    });

// Phase one: lane 1 wins by 2500 ms. Phase two (run in the opposite lanes):
// lane 1 wins by 2600 ms. So lane 1 wins overall.
const LANE_1_WINS = { ph1: [1000000, 3500000], ph2: [2000000, 4600000] };
const TIED = { ph1: [1000000, 3500000], ph2: [4500000, 2000000] };

const bmd = { SK: "chartX", orgId: ORG, jsonPath: "NDR/x.combined.json" };
const combined = {
    progress: {
        "03": { WinnerDest: "05A", LoserDest: "07A" },
        "04": { WinnerDest: "05B", LoserDest: "07B" },
        "05": { WinnerDest: "Place1", LoserDest: "Place2" },
    },
};
const chartCache = async (query) => (query.PK ? bmd : combined);

function build({ ddb = {}, cache = async () => undefined } = {}) {
    const announce = {
        formatAndSubmitResults: jest.fn(async () => {}),
        formatAndSubmitNextOnBlocks: jest.fn(async () => {}),
    };
    const ddbUtils = {
        addSingle: jest.fn(async (json) => {
            let entity = json;
            try {
                entity = ef.build(json);
            } catch (error) {
                // plain objects without a recognizable PK stay as they are
            }
            return { status: "ok", entity };
        }),
        create_UUID: jest.fn(() => "abcdef123456"),
        ddbQueryPkSk: jest.fn(async () => null),
        ddbQueryRpByKey: jest.fn(async () => []),
        ddbQueryRsByKey: jest.fn(async () => []),
        getEventConfig: jest.fn(async () => null),
        ddbQueryRsAlreadyPending: jest.fn(async () => null),
        ddbQueryBracketMdExistsCheck: jest.fn(async () => []),
        ddbQueryRpNextOnBlocks: jest.fn(async () => []),
        ddbQueryRsExistsAndPendingCheck: jest.fn(async () => []),
        ...ddb,
    };
    const tmpCache = { getObject: jest.fn(cache) };
    const createTmpCache = jest.fn(() => tmpCache);
    const iotService = { requestIotVideoUploadByRP: jest.fn(async () => ({})) };
    const logUtils = { persistLogMessage: jest.fn(async () => ({})) };
    const requestContext = { pushError: jest.fn() };
    const ddbClient = { id: "ddb" };
    const s3Client = { id: "s3" };
    const service = new RaceProgressionService({
        ddbUtils,
        ddbClient,
        s3Client,
        newAnnounceResults: () => announce,
        logUtils,
        iotService,
        requestContext,
        createTmpCache,
    });
    return {
        service,
        ddbUtils,
        announce,
        tmpCache,
        createTmpCache,
        iotService,
        logUtils,
        requestContext,
        ddbClient,
        s3Client,
    };
}

// The bracket positions written by addOrUpdateChartPosition, as [SK, who].
// Participants are reduced to their ptcp so bookkeeping fields don't matter.
const writtenPositions = (ddbUtils) =>
    ddbUtils.addSingle.mock.calls
        .map(([json]) => json)
        .filter((json) => json.PK.endsWith(":Bp"))
        .map((json) => [
            json.SK,
            Object.fromEntries(
                Object.entries(json.pos).map(([letter, who]) => [
                    letter,
                    who.ptcp ?? who.disp,
                ])
            ),
        ]);

describe("small helpers", () => {
    const { service } = build();

    test.each([
        ["05A", "A", true, ["05", "A"]],
        ["11B", "B", false, ["11", "B"]],
        // WinnerDest syntax: the first place goes to A's destination when A wins.
        ["(AWINS?Place1:11B)", "B", true, ["11", "B"]],
        ["(AWINS?Place2:11A)", "B", false, ["Place2", "Place2"]],
        ["(AWINS?Place1:11B)", "A", true, ["Place1", "Place1"]],
    ])("getChartDestination(%s, %s, %s)", (dest, letter, didWin, expected) => {
        expect(service.getChartDestination(dest, letter, didWin)).toEqual(
            expected
        );
    });

    test("only race-type phases need a pending race", () => {
        expect(service.isPendingNeeded({ pt: "R" })).toBe(true);
        expect(service.isPendingNeeded({ pt: "T" })).toBe(false);
        expect(service.isPendingNeeded({})).toBe(false);
    });

    test("a standing is ad hoc when its key has no chart part", () => {
        expect(service.isRaceStandingAdhoc({ SK: "1599352739543" })).toBe(true);
        expect(service.isRaceStandingAdhoc({ SK: "chartX:03" })).toBe(false);
    });
});

describe("addPending2", () => {
    const event = (cn) => ({
        body: JSON.stringify({ orgId: ORG, orgIz: "Org1", cn }),
    });

    test("needs an event configuration", async () => {
        const { service } = build();

        await expect(
            service.addPending2(event(["109", "100"]))
        ).resolves.toEqual({
            status: "error",
            error: "No Event config found.",
        });
    });

    test("writes a race standing, sorting the cars when low car is lane 1", async () => {
        const { service, ddbUtils } = build({
            ddb: {
                getEventConfig: jest.fn(async () => ({
                    pendingRule: "1Race",
                    lcl1: "true",
                })),
            },
        });

        await service.addPending2(event(["109", "100"]));

        expect(ddbUtils.getEventConfig).toHaveBeenCalledWith(`Org1:${ORG}`);
        expect(ddbUtils.addSingle.mock.calls[0][0]).toMatchObject({
            PK: ":RS",
            cn: ["100", "109"],
        });
    });

    test("keeps the car order when low car is not lane 1", async () => {
        const { service, ddbUtils } = build({
            ddb: { getEventConfig: jest.fn(async () => ({ lcl1: "false" })) },
        });

        await service.addPending2(event(["109", "100"]));

        expect(ddbUtils.addSingle.mock.calls[0][0].cn).toEqual(["109", "100"]);
    });

    test("refuses when a pending race already exists", async () => {
        const { service, ddbUtils } = build({
            ddb: {
                getEventConfig: jest.fn(async () => ({
                    pendingRule: "1Race",
                    lcl1: "true",
                })),
                ddbQueryRsAlreadyPending: jest.fn(async () => "car 100"),
            },
        });

        await expect(
            service.addPending2(event(["109", "100"]))
        ).resolves.toEqual({
            error: "Pending already exists: car 100",
            status: "error",
        });
        expect(ddbUtils.addSingle).not.toHaveBeenCalled();
    });
});

describe("race phases", () => {
    test("deleteRacePhase only deletes blocks without results", async () => {
        const found = { PK: `${ORG}:RP`, SK: "55", orgId: ORG };
        const missing = build();
        await expect(
            missing.service.deleteRacePhase({ orgId: ORG, SK: "55" })
        ).resolves.toMatchObject({
            error: "Cannot delete RacePhase. Not found.",
        });

        const finished = build({
            ddb: {
                ddbQueryPkSk: jest.fn(async () => ({ ...found, phr: [1, 2] })),
            },
        });
        await expect(
            finished.service.deleteRacePhase({ orgId: ORG, SK: "55" })
        ).resolves.toMatchObject({
            error: "Cannot delete RacePhase with results.",
        });

        const open = build({
            ddb: { ddbQueryPkSk: jest.fn(async () => ({ ...found })) },
        });
        await open.service.deleteRacePhase({ orgId: ORG, SK: "55" });
        expect(open.ddbUtils.addSingle).toHaveBeenCalledWith({
            ...found,
            del: true,
        });
    });

    test("getPhaseElapsed reads the elapsed-time table", async () => {
        const { service, ddbUtils } = build();

        await service.getPhaseElapsed({ orgId: ORG, sk: "5" });

        expect(ddbUtils.ddbQueryPkSk).toHaveBeenCalledWith(
            `${ORG}:RpElapsed`,
            "5",
            "elapsed-table"
        );
    });
});

describe("addBlocks", () => {
    const request = (extra = {}) => ({
        orgId: ORG,
        orgIz: "Org1",
        cn: ["100", "109"],
        pt: "R",
        ...extra,
    });
    const pending = (extra = {}) => [
        raceStanding("chartX:03", { Bp: "chartX:03", ...extra }),
    ];

    test("links a race to its pending standing and announces it", async () => {
        const { service, ddbUtils, announce } = build({
            ddb: {
                ddbQueryRsExistsAndPendingCheck: jest.fn(async () => pending()),
            },
        });

        await service.addBlocks(request());

        expect(ddbUtils.addSingle.mock.calls[0][0]).toMatchObject({
            PK: ":RP",
            rs: "chartX:03",
            pl: "A",
            Bp: "chartX:03",
        });
        expect(announce.formatAndSubmitNextOnBlocks).toHaveBeenCalledTimes(1);
    });

    test("puts the cars of a second phase in the opposite lanes", async () => {
        const { service, ddbUtils } = build({
            ddb: {
                ddbQueryRsExistsAndPendingCheck: jest.fn(async () =>
                    pending({ ph1: [1000000, 3500000] })
                ),
            },
        });

        await service.addBlocks(request({ cn: ["109", "100"] }));

        expect(ddbUtils.addSingle.mock.calls[0][0].pl).toBe("B");
    });

    test("rejects cars in the wrong lanes", async () => {
        const { service } = build({
            ddb: {
                ddbQueryRsExistsAndPendingCheck: jest.fn(async () => pending()),
            },
        });

        await expect(
            service.addBlocks(request({ cn: ["109", "100"] }))
        ).resolves.toEqual({
            status: "error",
            error: "Cars in wrong lane(s)",
            expected: "100,109",
            requested: "109,100",
        });
    });

    test("needs a pending race for race-type phases, but not for trials", async () => {
        const raced = build();
        await expect(raced.service.addBlocks(request())).resolves.toEqual({
            status: "error",
            error: "No Pending race found",
        });

        const trial = build();
        await trial.service.addBlocks(request({ pt: "T" }));
        expect(trial.announce.formatAndSubmitNextOnBlocks).toHaveBeenCalledWith(
            null,
            expect.anything()
        );
    });

    test("refuses a second race on the blocks", async () => {
        const { service, ddbUtils } = build({
            ddb: { ddbQueryRpNextOnBlocks: jest.fn(async () => [racePhase()]) },
        });

        await expect(service.addBlocks(request({ pt: "T" }))).resolves.toEqual({
            status: "error",
            error: "There is already a race on the blocks: 100,109",
        });
        expect(ddbUtils.addSingle).not.toHaveBeenCalled();
    });
});

describe("chart metadata and positions", () => {
    test("addChartMetaData names a new chart from a short unique id", async () => {
        const { service } = build();

        const result = await service.addChartMetaData({
            orgId: ORG,
            bracketName: "Saturday",
        });

        expect(result.entity).toMatchObject({ SK: "abcdef", PK: ":Bmd" });
        expect(result.chartId).toBe("abcdef");
    });

    test("addChartMetaData updates an existing chart's name and visibility", async () => {
        const existing = {
            PK: `${ORG}:Bmd`,
            SK: "zzz999",
            orgId: ORG,
            bracketName: "Old",
            imgPath: "a.png",
        };
        const { service, ddbUtils } = build({
            ddb: {
                ddbQueryBracketMdExistsCheck: jest.fn(async () => [existing]),
            },
        });

        await service.addChartMetaData({
            orgId: ORG,
            SK: "zzz999",
            bracketName: "New",
            del: true,
        });

        expect(ddbUtils.addSingle.mock.calls[0][0]).toMatchObject({
            SK: "zzz999",
            bracketName: "New",
            del: true,
            imgPath: "a.png",
        });
    });

    test("getCachedBmd returns the chart metadata and its combined json", async () => {
        const { service, tmpCache, createTmpCache, ddbClient, s3Client } =
            build({ cache: chartCache });

        await expect(service.getCachedBmd(ORG, "chartX")).resolves.toEqual([
            bmd,
            combined,
        ]);

        expect(createTmpCache).toHaveBeenCalledWith(ddbClient, s3Client);
        expect(tmpCache.getObject.mock.calls.map(([query]) => query)).toEqual([
            { PK: `${ORG}:Bmd`, SK: "chartX" },
            {
                Bucket: "charts-bucket",
                Key: "data/brackets/NDR/x.combined.json",
            },
        ]);
    });

    test("getCachedBmd is empty for an unknown chart", async () => {
        const { service } = build();

        await expect(service.getCachedBmd(ORG, "nope")).resolves.toEqual([]);
    });

    test("addOrUpdateChartPosition merges into an existing position", async () => {
        const { service, ddbUtils } = build({
            ddb: {
                ddbQueryPkSk: jest.fn(async () =>
                    bracketPos("chartX:05", { A: P("100") })
                ),
            },
        });

        await service.addOrUpdateChartPosition({
            orgId: ORG,
            chartId: "chartX",
            heatNumber: "05",
            pos: { B: P("109") },
        });

        expect(writtenPositions(ddbUtils)).toEqual([
            ["chartX:05", { A: "100", B: "109" }],
        ]);
    });
});

describe("advanceChartPos", () => {
    test("moves the overall winner and the loser to their destinations", async () => {
        const { service, ddbUtils } = build({ cache: chartCache });

        await service.advanceChartPos(
            raceStanding("chartX:03", { Bp: "chartX:03", ...LANE_1_WINS }),
            bracketPos("chartX:03", { A: P("100"), B: P("109") })
        );

        expect(writtenPositions(ddbUtils)).toEqual([
            ["chartX:05", { A: "100" }],
            ["chartX:07", { A: "109" }],
        ]);
    });

    test("moves the other car when lane 2 wins", async () => {
        const { service, ddbUtils } = build({ cache: chartCache });

        await service.advanceChartPos(
            raceStanding("chartX:03", {
                Bp: "chartX:03",
                ph1: [3500000, 1000000],
                ph2: [4600000, 2000000],
            }),
            bracketPos("chartX:03", { A: P("100"), B: P("109") })
        );

        expect(writtenPositions(ddbUtils)).toEqual([
            ["chartX:05", { A: "109" }],
            ["chartX:07", { A: "100" }],
        ]);
    });

    test("does not advance anyone after an overall tie or an unfinished race", async () => {
        const tied = build({ cache: chartCache });
        await tied.service.advanceChartPos(
            raceStanding("chartX:03", { Bp: "chartX:03", ...TIED }),
            bracketPos("chartX:03", { A: P("100"), B: P("109") })
        );
        expect(writtenPositions(tied.ddbUtils)).toEqual([]);

        const unfinished = build({ cache: chartCache });
        await unfinished.service.advanceChartPos(
            raceStanding("chartX:03", {
                Bp: "chartX:03",
                ph1: [1000000, 3500000],
            }),
            bracketPos("chartX:03", { A: P("100"), B: P("109") })
        );
        expect(writtenPositions(unfinished.ddbUtils)).toEqual([]);
    });

    test("cedes the heat to the car that has no opponent", async () => {
        const { service, ddbUtils } = build({ cache: chartCache });

        await service.advanceChartPos(
            null,
            bracketPos("chartX:04", { A: { disp: "bye" }, B: P("7") })
        );

        expect(writtenPositions(ddbUtils)).toEqual([
            ["chartX:05", { B: "7" }],
            ["chartX:07", { B: "bye" }],
        ]);
    });

    test("stops quietly when the chart data is missing", async () => {
        const noChart = build();
        await noChart.service.advanceChartPos(
            null,
            bracketPos("chartX:03", { A: P("100") })
        );
        expect(noChart.ddbUtils.addSingle).not.toHaveBeenCalled();

        const noHeat = build({ cache: chartCache });
        await noHeat.service.advanceChartPos(
            null,
            bracketPos("chartX:99", { A: P("100"), B: P("109") })
        );
        expect(writtenPositions(noHeat.ddbUtils)).toEqual([]);
    });

    test("loads the bracket position for a standing, and skips ad hoc races", async () => {
        const adhoc = build();
        await adhoc.service.advanceChartPos(raceStanding("1599352739543"));
        expect(adhoc.ddbUtils.ddbQueryPkSk).not.toHaveBeenCalled();

        const tied = build({
            cache: chartCache,
            ddb: {
                ddbQueryPkSk: jest.fn(async () =>
                    bracketPos("chartX:03", { A: P("100"), B: P("109") })
                ),
            },
        });
        await tied.service.advanceChartPos(
            raceStanding("chartX:03", { Bp: "chartX:03", ...LANE_1_WINS })
        );
        expect(tied.ddbUtils.ddbQueryPkSk).toHaveBeenCalledWith(
            `${ORG}:Bp`,
            "chartX:03"
        );
        expect(writtenPositions(tied.ddbUtils)).toHaveLength(2);
    });

    test("starts the next pending race when both cars of a heat are known", async () => {
        const { service, ddbUtils } = build({
            cache: chartCache,
            ddb: {
                getEventConfig: jest.fn(async () => ({
                    pendingRule: "1Race",
                    lcl1: "true",
                })),
            },
        });

        await service.advanceChartPos(
            null,
            bracketPos("chartX:03", { A: P("100"), B: P("109") })
        );

        expect(ddbUtils.addSingle.mock.calls[0][0]).toMatchObject({
            PK: ":RS",
            Bp: "chartX:03",
            SK: "chartX:03",
            cn: ["100", "109"],
            orgIz: "Org1",
        });
    });
});

describe("addPendingFromChartPos", () => {
    const ready = () => bracketPos("chartX:03", { A: P("100"), B: P("109") });

    test("stands down when a standing exists or a car is missing", async () => {
        const { service, ddbUtils } = build();

        await service.addPendingFromChartPos(
            raceStanding("chartX:03"),
            ready()
        );
        await service.addPendingFromChartPos(
            null,
            bracketPos("chartX:03", { A: P("100") })
        );

        expect(ddbUtils.addSingle).not.toHaveBeenCalled();
    });

    test("logs a warning when the pending race cannot be added", async () => {
        const { service, requestContext, logUtils } = build({
            ddb: {
                ddbQueryPkSk: jest.fn(async () => ({
                    bracketName: "Saturday AM",
                })),
            },
        });

        await service.addPendingFromChartPos(null, ready());

        const rc = { status: "error", error: "No Event config found." };
        expect(requestContext.pushError).toHaveBeenCalledWith(rc);
        const logged = logUtils.persistLogMessage.mock.calls[0][0];
        expect(logged).toMatchObject({
            orgId: ORG,
            level: "warn",
            message:
                "Unable to add pending race for [Saturday AM] heat [03] with cars [100 and 109]: No Event config found.",
            detail: {
                chartId: "chartX",
                chartName: "Saturday AM",
                bracketPosKey: "chartX:03",
                heatNumber: "03",
                carNumbers: ["100", "109"],
                addPendingResult: rc,
            },
        });
    });

    test("records the service file and method as the log source", async () => {
        // This is derived from the call stack, so it names the file the code
        // lives in (jest's transform may append an alias after the method
        // name, so only the file is pinned). It was "derbyMain.js:logPendingFromChartPosError" before
        // the extraction; nothing reads it, but this pins the new value.
        const { service, logUtils } = build();

        await service.logPendingFromChartPosError(ready(), {
            status: "error",
            error: "x",
        });

        expect(logUtils.persistLogMessage.mock.calls[0][0].source).toMatch(
            /^RaceProgressionService\.js:/
        );
    });
});

describe("cloneRs", () => {
    test("starts a fresh standing for an ad hoc race", async () => {
        const { service, ddbUtils } = build();

        await service.cloneRs(
            raceStanding("1599352739543", { by: "rpi.local", ...LANE_1_WINS })
        );

        expect(ddbUtils.addSingle.mock.calls[0][0]).toEqual({
            PK: ":RS",
            cn: ["100", "109"],
            orgId: ORG,
            by: "rpi.local",
        });
    });

    test("clears the results of a chart standing instead of creating a new one", async () => {
        const { service, ddbUtils } = build();
        const standing = raceStanding("chartX:03", {
            Bp: "chartX:03",
            ...LANE_1_WINS,
        });

        await service.cloneRs(standing);

        expect(ddbUtils.addSingle.mock.calls[0][0]).toBe(standing);
        expect(standing.ph1).toBeUndefined();
        expect(standing.ph2).toBeUndefined();
        expect(standing.SK).toBe("chartX:03");
    });
});

describe("applyFinishTime", () => {
    const finish = (extra = {}) => ({
        orgId: ORG,
        orgIz: "Org1",
        SK: "55",
        phr: [2500000, 4600000],
        ...extra,
    });
    const raceRp = (extra = {}) =>
        racePhase({ pt: "R", rs: "chartX:03", Bp: "chartX:03", ...extra });

    test("needs a race phase to apply the time to", async () => {
        const { service } = build();

        await expect(service.applyFinishTime(finish())).resolves.toEqual({
            status: "error",
            error: "No eligible target for update.",
        });
    });

    test("needs the standing for a race-type phase", async () => {
        const { service } = build({
            ddb: {
                ddbQueryRpByKey: jest.fn(async () => [raceRp({ pl: "A" })]),
            },
        });

        await expect(service.applyFinishTime(finish())).resolves.toEqual({
            status: "error",
            error: "No raceStanding found!",
        });
    });

    test("records phase one on the standing without advancing anyone", async () => {
        const standing = raceStanding("chartX:03", { Bp: "chartX:03" });
        const { service, ddbUtils, announce, iotService } = build({
            cache: chartCache,
            ddb: {
                ddbQueryRpByKey: jest.fn(async () => [raceRp({ pl: "A" })]),
                ddbQueryRsByKey: jest.fn(async () => [standing]),
            },
        });

        await expect(
            service.applyFinishTime(finish({ phr: [1000000, 3500000] }))
        ).resolves.toEqual({ status: "ok" });

        expect(standing.ph1).toEqual([1000000, 3500000]);
        expect(standing.ph2).toBeUndefined();
        expect(announce.formatAndSubmitResults).toHaveBeenCalledWith(
            standing,
            expect.objectContaining({ SK: "55" })
        );
        expect(iotService.requestIotVideoUploadByRP).toHaveBeenCalledTimes(1);
        expect(writtenPositions(ddbUtils)).toEqual([]);
    });

    test("records phase two reversed, then advances the winner", async () => {
        const standing = raceStanding("chartX:03", {
            Bp: "chartX:03",
            ph1: [1000000, 3500000],
        });
        const { service, ddbUtils } = build({
            cache: chartCache,
            ddb: {
                ddbQueryRpByKey: jest.fn(async () => [
                    raceRp({ pl: "B", cn: ["109", "100"] }),
                ]),
                ddbQueryRsByKey: jest.fn(async () => [standing]),
                ddbQueryPkSk: jest.fn(async (pk, sk) =>
                    sk === "chartX:03"
                        ? bracketPos("chartX:03", { A: P("100"), B: P("109") })
                        : null
                ),
            },
        });

        await service.applyFinishTime(finish({ phr: [4600000, 2000000] }));

        expect(standing.ph2).toEqual([2000000, 4600000]);
        expect(writtenPositions(ddbUtils)).toEqual([
            ["chartX:05", { A: "100" }],
            ["chartX:07", { A: "109" }],
        ]);
    });

    test("starts a rerace instead of advancing when the race ends in a tie", async () => {
        const standing = raceStanding("chartX:03", {
            Bp: "chartX:03",
            ph1: [1000000, 3500000],
        });
        const { service, ddbUtils } = build({
            cache: chartCache,
            ddb: {
                ddbQueryRpByKey: jest.fn(async () => [
                    raceRp({ pl: "B", cn: ["109", "100"] }),
                ]),
                ddbQueryRsByKey: jest.fn(async () => [standing]),
            },
        });

        await service.applyFinishTime(finish({ phr: [2000000, 4500000] }));

        expect(writtenPositions(ddbUtils)).toEqual([]);
        // The tied standing is cleared so the race can be run again.
        expect(standing.ph1).toBeUndefined();
        expect(standing.ph2).toBeUndefined();
    });

    test("applies a trial run's time without needing a standing", async () => {
        const { service, ddbUtils, iotService } = build({
            ddb: {
                ddbQueryRpByKey: jest.fn(async () => [
                    racePhase({ pt: "T", pl: "A" }),
                ]),
            },
        });

        await expect(service.applyFinishTime(finish())).resolves.toEqual({
            status: "ok",
        });

        expect(ddbUtils.addSingle.mock.calls[0][0]).toMatchObject({
            PK: `${ORG}:RP`,
            phr: [2500000, 4600000],
        });
        expect(iotService.requestIotVideoUploadByRP).toHaveBeenCalledTimes(1);
        expect(ddbUtils.ddbQueryRsByKey).not.toHaveBeenCalled();
    });

    test("puts the next trial run on the blocks for the magic timing car", async () => {
        const { service, ddbUtils } = build({
            ddb: {
                ddbQueryRpByKey: jest.fn(async () => [
                    racePhase({ pt: "T", pl: "A", cn: ["00008", "00009"] }),
                ]),
            },
        });

        await service.applyFinishTime(finish());

        const added = ddbUtils.addSingle.mock.calls
            .map(([json]) => json)
            .filter((json) => json.PK === ":RP");
        expect(added).toHaveLength(1);
        expect(added[0]).toMatchObject({
            PK: ":RP",
            orgId: ORG,
            cn: ["00008", "00009"],
            pt: "T",
        });
    });
});
