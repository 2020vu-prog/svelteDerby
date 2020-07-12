"use strict";
const crypto = require("crypto");

const EntityFactory = require("./shared/EntityFactory.js");
const { permissionMap } = require("./shared/permissionLits.js");
const { hasServerRoutePath } = require("./shared/PermissionLookup.js");
const AWS = require("aws-sdk");
const { DynamoDB } = require("@aws-sdk/client-dynamodb-v2-node");
const ddbClient = new DynamoDB({ region: process.env.AwsRegion });
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
var jwt = require("jsonwebtoken");
const TmpCache = require("./tmpCache.js");
const DdbUtils = require("./DdbUtils");
const AnnounceResults = require("./AnnounceResults");
const configMap = {};

const ddbUtils = new DdbUtils(AWS, ddbClient, sqs);
const announceResults = new AnnounceResults(AWS, ddbUtils);

const s3QueryChartTypes = async () => {
    var params = {
        Bucket: process.env.ChartS3BucketName,
        Prefix: "data/brackets",
    };
    try {
        const data = await s3.listObjectsV2(params).promise();
        return data;
    } catch (err) {
        console.log("s3 list Error", err);
        return { error: "s3 list buckets Failed" };
    }
};

const attachPrincipalPolicy = async (policyName, principal) => {
    try {
        const data = await new AWS.Iot()
            .attachPrincipalPolicy({
                policyName: policyName,
                principal: principal,
            })
            .promise();
        console.log("attachPrincipalPolicy Data", data);
    } catch (err) {
        console.log("attachPrincipalPolicy Error", err);
    }
};

const getConfig = async (eventKey) => {
    if (configMap[eventKey]) {
        return configMap[eventKey];
    }

    var eConfig = await ddbUtils.ddbQueryEventConfig(eventKey);
    if (eConfig[eventKey]) {
        configMap[eventKey] = eConfig[eventKey];
        return eConfig[eventKey];
    }

    return undefined;
};
const getTtl = async (eventKey) => {
    const config = await getConfig(eventKey);
    if (config) {
        return config.TTL;
    }
    return null;
    //return Math.round((new Date().getTime() / 1000) + config.ttlIncrement);
};
var entityFactory;

const addPending2 = async (event) => {
    const eventKey = getEventKey(event);
    const cfg = await getConfig(eventKey);
    if (!cfg) {
        return {
            status: "error",
            error: "No Event config found.",
        };
    }

    const json = JSON.parse(event.body);
    console.log("BEGIN: addPending2: " + JSON.stringify(json));
    json.PK = ":RS"; // force RaceStanding

    const alreadyExists = await ddbUtils.ddbQueryRsAlreadyPending(json);
    if (alreadyExists > 0) {
        return { error: "Pending2 already exists", status: "error" };
    }

    if (stringIsTrue(cfg.lcl1)) {
        //low car lane 1?
        json.cn.sort();
        console.log("addPending2: sorted: ", json.cn);
    } else {
        console.log("addPending2: unsorted: ", json.cn);
    }
    return await ddbUtils.addSingle(json);
};
const stringIsTrue = (stringValue) => {
    return stringValue.toLowerCase() == "true" ? true : false;
};

const applyFinishTime = async (json) => {
    console.log("applyFinishTime 413: " + JSON.stringify(json));
    const tgtRpList = await ddbUtils.ddbQueryRpByKey(json);
    if (tgtRpList.length == 0) {
        return {
            status: "error",
            error: "No eligible target for update.",
        };
    }
    const tgtRp = tgtRpList[0];
    tgtRp.phr = json.phr; //TODO: verify client sent array of ints in "phr"
    const rsPromise = ddbUtils.ddbQueryRsByKey({
        orgId: tgtRp.orgId,
        SK: tgtRp.rs,
    });
    const rpUpdatePromise = ddbUtils.addSingle(tgtRp);
    const [rsFoundList, rpUpdate] = await Promise.all([
        rsPromise,
        rpUpdatePromise,
    ]);

    console.log("applyFinishTime 413 rsFoundList: ", rsFoundList);

    if (rsFoundList.length > 0) {
        const tgtRs = rsFoundList[0];
        // match means A phase.
        const phase = tgtRp.phaseLiteral;
        console.log("applyFinishTime 413 phase: ", phase);

        if (phase === "A") {
            tgtRs.phase1Results = json.phr;
        } else {
            tgtRs.phase2Results = json.phr.reverse();
        }
        await ddbUtils.addSingle(tgtRs);

        const finishPromises = [];
        finishPromises.push(
            announceResults.formatAndSubmitAnnouncement(tgtRs, tgtRs.orgId)
        );

        if (tgtRs.isComplete()) {
            if (tgtRs.isOverallTie()) {
                finishPromises.push(cloneRs(tgtRs));
            } else {
                finishPromises.push(advanceChartPos(tgtRs));
            }
        }
        await Promise.all(finishPromises);
    } else {
        return {
            status: "error",
            error: "No raceStanding found!",
        };
    }

    return {
        status: "ok",
    };
};

// srcRs / bracketPos can be null.  Not both.
const advanceChartPos = async (srcRs, bracketPos) => {
    console.log("BEGIN: advanceChartPos");
    if (!srcRs && bracketPos) {
        //populate srcRS
        srcRs = await loadRaceStandingFromBracketPos(bracketPos);
        console.log("advanceChartPos loaded srcRS:", srcRs);
    } else if (srcRs && !bracketPos) {
        //populate bracketPos
        if (!srcRs.Bp) {
            console.log("advanceChartPos: not a raceBracket RS");
            return;
        }
        bracketPos = await loadBracketPosFromRaceStanding(srcRs);
        console.log("advanceChartPos loaded bracketPos:", bracketPos);
    }

    if (srcRs) {
        if (srcRs.del) {
            srcRs = null;
        }
    }

    if (!srcRs && bracketPos.isReadyToAddPending) {
        await addPendingFromChartPos(srcRs, bracketPos);
        // new pending with participants won't need to advance.
        // fall thru to advance anyway to handle bye/forfeit.
    }

    console.log("advanceChartPos: Bp:", bracketPos.SK);
    const chartId = bracketPos.SK.replace(/:.*/, "");
    const heatNumber = bracketPos.SK.replace(/.*:/, "");
    const [bmd, combined] = await getCachedBmd(bracketPos.orgId, chartId);
    if (!combined) {
        console.log("advanceChartPos: missing combined json");
        return;
    }
    console.log("advanceChartPos: combined:", combined);
    if (!combined.progress) {
        console.log("advanceChartPos: missing combined json progress");
        return;
    }
    if (!combined.progress[heatNumber]) {
        console.log(
            "advanceChartPos: missing combined json progress for heat: ",
            heatNumber
        );
        return;
    }

    const progress = combined.progress[heatNumber];
    console.log("advanceChartPos: applying progress using: ", progress);
    const winnerDest = progress.WinnerDest;
    const loserDest = progress.LoserDest;
    let winnerPtcpObj = "";
    let loserPtcpObj = "";
    let winCount = 0;
    const readyToCede = bracketPos.isReadyToCedeUncontested;
    if (readyToCede) {
        console.log("advanceChartPos: readyToCede : ", readyToCede);

        await applyPtcpToChartPos(true, readyToCede.winner, winnerDest, bmd);
        await applyPtcpToChartPos(false, readyToCede.loser, loserDest, bmd);
        return;
    }

    if (!srcRs) {
        return;
    }

    if (srcRs.isComplete && srcRs.isWinner(1, 0)) {
        //  the car that started in l1 for phase1 won overall.
        winnerPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[0]);
        loserPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[1]);
        winCount++;
    }

    if (srcRs.isComplete && srcRs.isWinner(2, 0)) {
        //  the car that started in l2 for phase1 won overall.
        winnerPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[1]);
        loserPtcpObj = bracketPos.getPtcpObjectByPtcp(srcRs.cn[0]);
        winCount++;
    }

    // winCount will be 2 if there is overall tie.   don't advance.
    if (winCount === 1) {
        await applyPtcpToChartPos(true, winnerPtcpObj, winnerDest, bmd);
        await applyPtcpToChartPos(false, loserPtcpObj, loserDest, bmd);
    }
};

const loadRaceStandingFromBracketPos = async (bracketPos) => {
    //TODO: override RS add to use bracketPos SK for RS SK
    return await ddbUtils.ddbQueryPkSk(`${bracketPos.orgId}:RS`, bracketPos.SK);
};
const loadBracketPosFromRaceStanding = async (rs) => {
    return await ddbUtils.ddbQueryPkSk(`${rs.orgId}:Bp`, rs.Bp);
};

const addPendingFromChartPos = async (rs, bracketPos) => {
    if (rs) {
        console.log("addPendingFromChartPos: standing down, rs exists.");
        return;
    }

    console.log(
        "BEGIN addPendingFromChartPos: isReadyToAddPending:",
        bracketPos.isReadyToAddPending
    );
    if (bracketPos.isReadyToAddPending) {
        console.log("isReadyToAddPending Bp:", bracketPos);
        await addPending2({
            body: JSON.stringify({
                orgId: bracketPos.orgId,
                orgIz: bracketPos.orgId.replace(/\..*/, ""), // TODO: unhack orgIz
                Bp: bracketPos.SK,
                //TODO: what about tie->rerace key??
                SK: bracketPos.SK, // common SK for loadRaceStandingFromBracketPos
                cn: [
                    bracketPos.getPtcpNumber("A"),
                    bracketPos.getPtcpNumber("B"),
                ],
            }),
        });
        //TODO: leave some footprints in the butter so that the user knows what happened!
    }
};

const getChartDestination = (destinationChartPos, srcHeatLetter, didWin) => {
    //allow syntax like:
    //WinnerDest: '(AWINS?Place1:11B)',
    //LoserDest: '(AWINS?Place2:11A)'
    const aWins = srcHeatLetter === "A" ? didWin : !didWin;

    if (destinationChartPos.match(/AWINS?/)) {
        destinationChartPos = destinationChartPos.replace("(", "");
        destinationChartPos = destinationChartPos.replace(")", "");
        destinationChartPos = destinationChartPos.replace("AWINS?", "");
        const [aWinDest, bWinDest] = destinationChartPos.split(":");
        //TODO: consider actual winner instead of just src!
        if (aWins) {
            destinationChartPos = aWinDest;
        } else {
            destinationChartPos = bWinDest;
        }
        console.log(
            "getChartDestination resolved conditional as: ",
            destinationChartPos,
            " srcHeatLetter: ",
            srcHeatLetter,
            " aWins: ",
            aWins
        );
    }
    const destHeatLetter = destinationChartPos.replace(/^[0-9]*/, "");
    const destHeatNumber = destinationChartPos.replace(/[a-zA-Z]*$/, "");

    return [destHeatNumber, destHeatLetter];
};
const applyPtcpToChartPos = async (
    didWin,
    ptcpObject,
    destinationChartPos,
    bmd
) => {
    const srcHeatLetter = ptcpObject.heatLetter;
    delete ptcpObject.heatLetter;

    const [destHeatNumber, destHeatLetter] = getChartDestination(
        destinationChartPos,
        srcHeatLetter,
        didWin
    );

    const sk = `${bmd.SK}:${destHeatNumber}`;
    console.log(
        "BEGIN: applyPtcpToChartPos: ptcp:",
        ptcpObject,
        " destinationChartPos: ",
        destinationChartPos
    );
    //const tgtBracketPos = await ddbQueryPkSk(`${bmd.orgId}:Bp`, sk);
    //console.log("applyPtcpToChartPos: found:", tgtBracketPos);
    const tgtBracketPos = {
        orgId: bmd.orgId,
        orgIz: bmd.orgId.replace(/\..*/, ""), // TODO: unhack orgIz
        chartId: bmd.SK,
        pos: {},
        heatNumber: destHeatNumber,
    };
    tgtBracketPos.pos[destHeatLetter] = ptcpObject;
    // this may recurse... (consider bye/forfeit/2nd racer advances, needs pending)
    console.log(
        "applyPtcpToChartPos: potential recursion into addOrUpdateChartPosition:",
        tgtBracketPos
    );
    await addOrUpdateChartPosition(tgtBracketPos);
};

const cloneRs = async (srcRs) => {
    const clone = {
        PK: ":RS", // force RacePhase
        cn: srcRs.cn,
        orgId: srcRs.orgId,
        by: srcRs.by,
    };
    console.log("cloneRs: ", JSON.stringify(clone));
    return await ddbUtils.addSingle(clone);
};

const deleteRacePhase = async (json) => {
    console.log("deleteRacePhase: " + JSON.stringify(json));
    const rpFound = await ddbUtils.ddbQueryPkSk(`${json.orgId}:RP`, json.SK);
    console.log("rpFound", rpFound);

    //only allow delete on blocks.  no deleting historical data
    if (!rpFound) {
        return {
            status: "error",
            error: "Cannot delete RacePhase. Not found.",
        };
    }
    if (rpFound.phr) {
        return {
            status: "error",
            error: "Cannot delete RacePhase with results.",
        };
    }
    rpFound.del = true;
    return await ddbUtils.addSingle(rpFound);
};
const deleteRaceStanding = async (json) => {
    console.log("deleteRaceStanding: " + JSON.stringify(json));
    const rsFound = await ddbUtils.ddbQueryPkSk(`${json.orgId}:RS`, json.SK);
    console.log("rsFound", rsFound);
    var msg = "";

    if (!rsFound) {
        return {
            status: "error",
            error: "Cannot delete RaceStanding. Not found.",
        };
    }
    if (rsFound.ph2) {
        delete rsFound.ph2;
        msg = "Deleted [B] phase.";
    } else if (rsFound.ph1) {
        delete rsFound.ph1;
        msg = "Deleted [A] phase.";
    } else {
        rsFound.del = true;
        msg = "Deleted pending race.";
    }

    const rc = await ddbUtils.addSingle(rsFound);
    if (rc.status === "ok") {
        rc.text = msg;
    }
    return rc;
};
const addBlocks = async (json) => {
    console.log("addBlocks: " + JSON.stringify(json));
    json.PK = ":RP"; // force RacePhase

    const waitRp = ddbUtils.ddbQueryRpDuplicateCheck(json);
    const waitRs = ddbUtils.ddbQueryRsExistsAndPendingCheck(json);
    const [rpFound, rsFound] = await Promise.all([waitRp, waitRs]);
    console.log("rpFound", rpFound);
    console.log("rsFound", rsFound);
    if (rsFound.length == 0) {
        return {
            status: "error",
            error: "No Pending race found",
        };
    }
    if (rsFound[0].nextRace().toString() == json.cn.toString()) {
    } else {
        return {
            status: "error",

            error: "Cars in wrong lane(s)",
            expected: rsFound[0].nextRace().toString(),
            requested: json.cn.toString(),
        };
    }
    if (rpFound.length > 0) {
        return {
            status: "error",
            error:
                "Car(s) already loaded on blocks:" +
                rpFound[0].carNumbers.toString(),
        };
    }

    // link racePhase to RaceStanding!
    json["rs"] = rsFound[0].SK;

    json["pl"] = rsFound[0].getPhaseLiteral(json.cn);
    if (rsFound[0].Bp) json["Bp"] = rsFound[0].Bp;

    return await ddbUtils.addSingle(json);
};

const addChartMetaData = async (json) => {
    console.log("addChartMetaData: " + JSON.stringify(json));
    json.PK = ":Bmd"; // force BracketMetaData
    if (!json.SK) {
        const uu6 = ddbUtils.create_UUID().substring(0, 6);
        json.SK = uu6;
    }

    const bmdFound = await ddbUtils.ddbQueryBracketMdExistsCheck(json);
    console.log("bmdFound", bmdFound);
    if (bmdFound.length == 0) {
        console.log("addChartMetaData add needed:", bmdFound);
        // fall thru to  Add
    } else {
        console.log("addChartMetaData update needed:", bmdFound);
        // update name.  TODO:  actual db update needed?
    }

    const rc = await ddbUtils.addSingle(json);

    rc.chartId = json.SK.replace(/:.*/, "");
    console.log("addChartMetaData returning: ", rc);
    return rc;
};
const getCachedBmd = async (orgId, chartId) => {
    const tmpCache = new TmpCache(AWS, ddbClient, s3);

    const bmd = await tmpCache.getObject({
        //PK: `${json.orgId}:Bmd`,
        //SK: posRC.entity.chartId,
        PK: `${orgId}:Bmd`,
        SK: chartId,
    });
    console.log("found cached bmd:", bmd);
    if (bmd) {
        const combinedJson = await tmpCache.getObject({
            Bucket: process.env.ChartS3BucketName,
            Key: "data/brackets" + "/" + bmd.jsonPath,
        });
        console.log("found cached combined:", combinedJson);
        return [bmd, combinedJson];
    }
    return [];
};
const addOrUpdateChartPosition = async (json) => {
    console.log("BEGIN: addOrUpdateChartPosition: " + JSON.stringify(json));

    json.PK = ":Bp"; // force BracketPosition
    if (!json.SK) {
        json.SK = `${json.chartId}:${json.heatNumber}`;
    }

    const posFound = await ddbUtils.ddbQueryPkSk(`${json.orgId}:Bp`, json.SK);
    console.log("posFound", posFound);
    if (!posFound) {
        console.log("addOrUpdateChartPosition add needed:", posFound);
        // Add
        //return await ddbUtils.addSingle(json);
    } else {
        console.log("addOrUpdateChartPosition update needed:", posFound);
        const mergedPos = Object.assign(posFound.pos, json.pos);
        console.log("addOrUpdateChartPosition mergedPos:", mergedPos);
        json = posFound;
        json.pos = mergedPos;
    }

    const posRC = await ddbUtils.addSingle(json);

    if (posRC.status == "ok" && posRC.entity) {
        const posE = posRC.entity;
        await advanceChartPos(null, posE);
    }
    return posRC;
};

const addOrgConfig = async (json) => {
    console.log("addOrgConfig: " + JSON.stringify(json));
    json.PK = "OrgConfig"; // force
    json.SK = json.orgIz; // force
    const by = entityFactory.propOverrides.by;
    entityFactory = new EntityFactory({ orgIz: json.orgIz, by: by });

    return await ddbUtils.addSingle(json);
};
const getSanitizedTimers = async () => {
    const timers = await getActiveTimers();
    timers.forEach(doNotPublishUuid);
    return timers;
};
const getActiveTimers = async () => {
    const timers = await ddbUtils.ddbQueryPkAll(
        "registered",
        process.env.TimerDbTable
    );
    timers.forEach(registeredTimerSha);

    return timers;
};
const registeredTimerSha = (timer) => {
    const sha = crypto.createHash("sha256").update(timer.uuid).digest("hex");
    //timer.sha = sha.substring(0, 6);
    timer.sha = sha;
};
const doNotPublishUuid = (timer) => {
    delete timer.uuid;
};
const addTimerConfig = async (json, initialLoad) => {
    if (!json.orgIz) {
        return { error: "Missing orgIz" };
    }
    if (!json.orgId) {
        return { error: "Missing orgId" };
    }
    var prevTC = {};
    if (!initialLoad) {
        const prevTC = await ddbUtils.ddbQueryPkSk(
            `${json.orgId}:TimerConfig`,
            "TimerConfig"
        );
        if (!prevTC) {
            return { error: "Missing Prev TimerConfig" };
        }

        // merge prior config to allow partial update.
        json = Object.assign(prevTC, json);
    }

    json.PK = ":TimerConfig"; // force
    if (!json.clearMS) {
        json.clearMS = 3001;
    }
    if (!json.maxCarLenMS) {
        json.maxCarLenMS = 601;
    }
    if (!json.minCarLenMS) {
        json.minCarLenMS = 301;
    }
    if (!json.maxPerfCount) {
        json.maxPerfCount = 1;
    }
    if (!json.lanes) {
        json.lanes = ["lane1", "lane2"];
    }
    if (json.sha) {
        console.log("addTimerConfig: applying selected timer sha:", json.sha);
        await registerEventWithTimer(json);
    } else {
        console.log("addTimerConfig: no sha found.");
    }
    return await ddbUtils.addSingle(json);
};
const registerEventWithTimer = async (timerConfigJson) => {
    //
    const selectedSha = timerConfigJson.sha;
    console.log("registerEventWithTimer: ", timerConfigJson);
    const timers = await getActiveTimers();
    const selectedTimers = timers.filter((timer) => timer.sha === selectedSha);
    if (selectedTimers.length == 0) {
        console.log("registerEventWithTimer: sha not found: ", selectedSha);
        return;
    }
    const selectedTimer = selectedTimers[0];

    console.log("registerEventWithTimer: selectedTimer: ", selectedTimer);
    const timerTableTc = Object.assign({}, timerConfigJson);
    timerTableTc.PK = selectedTimer.uuid;
    timerTableTc.SK = `^${timerConfigJson.orgId}`;
    timerConfigJson.sha = timerTableTc.sha; // save on original --flows back to derbyMain Ddb

    delete timerTableTc.sha;
    console.log("registerEventWithTimer: registration: ", timerTableTc);

    await ddbUtils.ddbPut(timerTableTc, process.env.TimerDbTable);
};
const addEventConfig = async (json, priorTtl) => {
    console.log("addEventConfig: " + JSON.stringify(json));
    if (!json.orgIz) {
        return { error: "Missing orgIz" };
    }
    if (!json.orgId) {
        return { error: "Missing orgId" };
    }

    const orgConfig = await ddbUtils.ddbQueryPkSk(`OrgConfig`, json.orgIz);

    json.PK = "EventConfig"; // force
    json.SK = json.orgIz + ":" + json.orgId; // force

    // use prior ttl if found (API cannot change ttl of in progress event!)
    if (!orgConfig.defaultTTL) {
        orgConfig.defaultTTL = 3600 * 24 * 1;
    }

    const newTtl = priorTtl
        ? priorTtl
        : Math.round(new Date().getTime() / 1000) + orgConfig.defaultTTL;

    json.TTL = newTtl;

    const by = entityFactory.propOverrides.by;
    entityFactory = new EntityFactory({
        orgId: json.orgId,
        by: by,
        TTL: json.TTL,
    });

    ddbUtils.setEntityFactory(entityFactory);
    const eventRC = await ddbUtils.addSingle(json);

    await addTimerConfig(json, true); // TODO: revisit default TimerConfig?
    return eventRC;
};

const addParticipant2 = async (json) => {
    console.log("addParticipant2: " + JSON.stringify(json));
    json.PK = ":PTCP"; // force Participant
    const paTask = await announceResults.submitToPolly(
        "added driver: " + json.name,
        json.orgId
    );
    return await ddbUtils.addSingle(json);
};
const getOrgId = (event) => {
    if (event.body) {
        return JSON.parse(event.body).orgId;
    }
    if (event.queryStringParameters) {
        return event.queryStringParameters.orgId;
    }
    return null;
};
const getOrgIz = (event) => {
    if (event.body) {
        return JSON.parse(event.body).orgIz;
    }
    if (event.queryStringParameters) {
        return event.queryStringParameters.orgIz;
    }
    return null;
};
const getEventKey = (event) => {
    return getOrgIz(event) + ":" + getOrgId(event);
};
const routeMap = {
    "/getActiveTimers": {
        h: async (event) => {
            return buildResponse(await getSanitizedTimers());
        },
    },
    "/timerConfig": {
        h: async (event) => {
            return buildResponse(
                await addTimerConfig(JSON.parse(event.body), false)
            );
        },
    },
    "/addParticipant": {
        h: async (event) => {
            return buildResponse(await addParticipant2(JSON.parse(event.body)));
        },
    },
    "/addPending": {
        h: async (event) => {
            return buildResponse(await addPending2(event));
        },
    },
    "/addBlocks": {
        h: async (event) => {
            return buildResponse(await addBlocks(JSON.parse(event.body)));
        },
    },
    "/deleteRacePhase": {
        h: async (event) => {
            return buildResponse(await deleteRacePhase(JSON.parse(event.body)));
        },
    },
    "/deleteRaceStanding": {
        h: async (event) => {
            return buildResponse(
                await deleteRaceStanding(JSON.parse(event.body))
            );
        },
    },
    "/addChart": {
        h: async (event) => {
            return buildResponse(
                await addChartMetaData(JSON.parse(event.body))
            );
        },
    },
    "/addChartPosition": {
        h: async (event) => {
            return buildResponse(
                await addOrUpdateChartPosition(JSON.parse(event.body))
            );
        },
    },
    "/doApplyFinishTime": {
        h: async (event) => {
            return buildResponse(await applyFinishTime(JSON.parse(event.body)));
        },
    },
    "/addBulk": {
        h: async (event) => {
            return buildResponse(
                await ddbUtils.addBulk(JSON.parse(event.body))
            );
        },
    },
    "/ddbQuery": {
        h: async (event) => {
            var qr = await ddbUtils.ddbQueryRsContains(JSON.parse(event.body));
            console.log("ddbQuery: " + qr);
            return buildResponse({ Count: qr });
        },
    },
    "/getNextOnBlocks": {
        h: async (event) => {
            const nob = await ddbUtils.ddbQueryRpNextOnBlocks(
                event.queryStringParameters
            );
            return buildResponse(nob);
        },
    },
    "/getRaceHistory": {
        h: async (event) => {
            var [qr, cacheMaxSeconds] = await ddbUtils.ddbQueryRaceHistory(
                event.queryStringParameters
            );
            const cacheControl = "max-age=" + cacheMaxSeconds;
            return buildResponse(qr, cacheControl);
        },
    },
    "/listChartTypes": {
        h: async (event) => {
            var chartTypes = await s3QueryChartTypes();
            const cacheControl = "max-age=" + 3600 * 24 * 7;
            return buildResponse(chartTypes, cacheControl);
        },
    },
    "/initiateAnnouncement": {
        h: async (event) => {
            var json = JSON.parse(event.body);
            var paMessage = json.paMessage;
            var orgId = json.orgId;
            const paTask = await announceResults.submitToPolly(
                paMessage,
                orgId
            );
            console.log("announceTask: " + paMessage + " gave: ", paTask);
            return buildResponse({ paTask: paTask });
        },
    },
    "/requestMqttSubPermission": {
        h: async (event) => {
            const qsp = event.queryStringParameters;
            if (!qsp) {
                qsp = {};
            }
            if (!qsp.principal) {
                console.log(
                    "/requestMqttSubPermission : Unknown or missing principal"
                );
                const qr = { error: "Unknown or missing principal" };
                return buildResponse(qr);
            }

            const policyName = "SubToAnyTopic"; // should be pre-existing from terraform
            const data = await attachPrincipalPolicy(policyName, qsp.principal);
            return buildResponse(data);
        },
    },
};

const buildResponse = (jsonObj, cacheControl = "no-cache") => {
    if (jsonObj && jsonObj.error) {
        console.log("buildResponse: error:  ", jsonObj);
    }
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": cacheControl,
        },
        body: JSON.stringify(jsonObj),
    };
};

async function snsApplyTimerHandler(snsMessageJson) {
    console.log(
        "applyTimerHandler Message received from SNS2:",
        snsMessageJson
    );
    const json = snsMessageJson;
    if (json && json.timerConfig && json.deltas && json.deltas.length > 0) {
        const timerConfig = json.timerConfig;
        entityFactory = new EntityFactory({
            orgId: timerConfig.orgId,
            by: "rpi.local",
            TTL: timerConfig.TTL,
        });
        ddbUtils.setEntityFactory(entityFactory);

        const deltaLanes = json.deltas[0].lanes;
        const nextOnBlocks = await ddbUtils.ddbQueryRpNextOnBlocks(
            json.timerConfig // need orgId, orgIz
        );
        console.log("applyTimerHandler nob:", nextOnBlocks);
        if (nextOnBlocks.length > 0) {
            const rp = nextOnBlocks[0]; // TODO: get oldest!
            const l1Micros = deltaLanes.lane1.noseMicros;
            const l2Micros = deltaLanes.lane2.noseMicros;
            const req = {
                orgId: json.timerConfig.orgId,
                orgIz: json.timerConfig.orgIz,
                SK: rp.SK,
                phr: [l1Micros, l2Micros],
            };
            console.log("applyTimerHandler formatted:", req);
            const applied = await applyFinishTime(req);
            console.log("applyTimerHandler rc:", applied);
        }
    } else {
        console.log("applyTimerHandler invalid msg:", json);
    }
}
async function apiGatewayHandler(event) {
    const dbArn = process.env.DynamoDbArn;

    console.log("event.path: ", event.path);

    const routePath = event.path.replace(/^\/app/, "");
    if (routePath === "/listOrgEvents") {
        const qr = await ddbUtils.ddbListEventConfigByOrg(getOrgIz(event));
        console.log("getEventConfig 23232:", qr);
        return buildResponse(qr, "max-age=307");
    }
    if (routePath === "/listOrgConfig") {
        const qr = await ddbUtils.ddbQueryOrgConfig();
        console.log("listOrgConfig :", qr);
        return buildResponse(qr, "max-age=1807");
    }

    const decodedJwt = jwt.decode(event.headers.Authorization);
    const eventKey = getEventKey(event);
    const orgId = getOrgId(event);
    const orgIz = getOrgIz(event);
    const defaultTTL = await getTtl(eventKey);

    entityFactory = new EntityFactory({
        orgId: orgId,
        by: decodedJwt.email,
        TTL: defaultTTL,
    });
    ddbUtils.setEntityFactory(entityFactory);
    console.log("Begin event", event);

    const email = decodedJwt.email;
    if (email && hasServerRoutePath(email, routePath)) {
        console.log(`allowing access to ${routePath} for [${email}]`);
    } else {
        console.log(`prohibiting access to ${routePath} for [${email}]`);
        return buildResponse({ error: "unauthorized" });
    }

    if (false) {
    } else if (!orgId) {
        const qr = { error: "Unable to determine orgId" };
        return buildResponse(qr);
    } else if (!orgIz) {
        const qr = { error: "Unable to determine orgIz" };
        return buildResponse(qr);
    } else if (routePath === "/addEventConfig") {
        //var [qr, cacheMaxSeconds] = await ddbQueryRaceHistory(event.queryStringParameters);
        const jsonRC = await addEventConfig(JSON.parse(event.body), defaultTTL);
        return buildResponse(jsonRC);
    }
    //else if (routePath === "/addOrgConfig") {
    //	const jsonRC = await addOrgConfig(JSON.parse(event.body) );
    //	return buildResponse(jsonRC);
    //}
    else if (!defaultTTL) {
        const qr = { error: "Unable to determine default TTL" };
        return buildResponse(qr);
    } else if (routeMap[routePath] && routeMap[routePath].h) {
        console.log(
            "ph routeMap handling: " + routePath,
            " object:",
            routeMap[routePath]
        );

        const phandler = routeMap[routePath].h;
        console.log("routeMap handling: " + phandler);

        return await phandler(event);
        console.log("routeMap handled: " + routePath);
    }

    console.log("Unhandled Path: " + routePath + " ep: " + event.path);
    return buildResponse({
        status: "unhandled",
        error: "Unhandled",
    });
}
exports.handler = async function (event) {
    // console.log('Received event:', JSON.stringify(event, null, 4));
    if (event && event.path) {
        const response = await apiGatewayHandler(event);
        return response;
    }
    if (event.Records[0].Sns) {
        var snsMessage = event.Records[0].Sns.Message;
        const snsMessageJson = JSON.parse(snsMessage);

        console.log("sns topic: : ", snsMessageJson.snsTopicArn);
        console.log("sns polly: : ", process.env.PollyCompleteSnsArn);
        if (snsMessageJson.snsTopicArn === process.env.PollyCompleteSnsArn) {
            console.log("polly finished: ", snsMessageJson);
            await announceResults.propagateIot(snsMessageJson);
            return "Polly Success";
        }

        await snsApplyTimerHandler(snsMessageJson);
        return "Success";
    }

    console.log("unknown event: ", event);
    return "Error";
};

// changed.
