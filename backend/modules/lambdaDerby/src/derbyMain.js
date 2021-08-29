"use strict";
const clientMinimumVersion = "1.1.24";
const derbyMainVersion = "1.1.14";
const crypto = require("crypto");
const path = require("path");

const log = require("loglevel");

const EntityFactory = require("./shared/EntityFactory.js");
const {
    hasServerRoutePath,
    getLegacyRoles,
} = require("./shared/PermissionLookup.js");
const AWS = require("aws-sdk");
const { DynamoDB } = require("@aws-sdk/client-dynamodb-v2-node");
const ddbClient = new DynamoDB({ region: process.env.AwsRegion });
const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
const s3 = new AWS.S3({ apiVersion: "2006-03-01" });
var jwt = require("jsonwebtoken");
const TmpCache = require("./tmpCache.js");
const DdbUtils = require("./DdbUtils");
const ArchiveUtils = require("./ArchiveUtils");
const AnnounceResults = require("./AnnounceResults");
const ApiRaceStanding = require("./ApiRaceStanding");

const ddbUtils = new DdbUtils(AWS, ddbClient, sqs);
const archiveUtils = new ArchiveUtils(AWS, ddbUtils);

const announceResults = new AnnounceResults(AWS, ddbUtils);
const apiRaceStanding = new ApiRaceStanding(AWS, ddbUtils, announceResults);

let globalErrorList = [];

log.setLevel(log.levels.TRACE);

const s3QueryChartTypes = async () => {
    var params = {
        Bucket: process.env.ChartS3BucketName,
        Prefix: "data/brackets",
    };
    try {
        const data = await s3.listObjectsV2(params).promise();
        return data;
    } catch (err) {
        log.debug("s3 list Error", err);
        return { error: "s3 list buckets Failed" };
    }
};
async function s3QueryMediaPrefix(queryStringParameters) {
    const prefix = queryStringParameters.prefix
        ? queryStringParameters.prefix
        : "";
    const params = {
        Bucket: process.env.DstBucket,
        Prefix: `media/${prefix}`,
    };
    const allKeys = await getAllKeys(params);
    log.debug("s3QueryMediaPrefix: ", params, allKeys);
    return allKeys;
}
async function getAllKeys(params, allKeys = []) {
    const response = await s3.listObjectsV2(params).promise();
    log.debug("getAllKeys count:", response.Contents.length);
    response.Contents.forEach((obj) =>
        allKeys.push({ Key: obj.Key, LastModified: obj.LastModified })
    );

    if (response.NextContinuationToken) {
        params.ContinuationToken = response.NextContinuationToken;
        await getAllKeys(params, allKeys); // RECURSIVE CALL
    }
    return allKeys;
}
const attachPrincipalPolicy = async (policyName, principal) => {
    try {
        const data = await new AWS.Iot()
            .attachPrincipalPolicy({
                policyName: policyName,
                principal: principal,
            })
            .promise();
        log.debug("attachPrincipalPolicy Data", data);
    } catch (err) {
        log.debug("attachPrincipalPolicy Error", err);
    }
};

const getTtl = async (config) => {
    if (config) {
        return config.TTL;
    }
    return null;
    //return Math.round((new Date().getTime() / 1000) + config.ttlIncrement);
};
function frozenOrArchived(config) {
    log.debug("function frozenOrArchived passed ", config);
    if (!config) {
        return false;
    }
    const configEntity = entityFactory.build(config);
    return configEntity.checkIfFrozenOrArchived()["status"];
}
var entityFactory;

const addPending2 = async (event) => {
    const eventKey = getEventKey(event);
    const cfg = await ddbUtils.getEventConfig(eventKey);
    if (!cfg) {
        return {
            status: "error",
            error: "No Event config found.",
        };
    }

    const json = JSON.parse(event.body);
    log.debug("BEGIN: addPending2: " + JSON.stringify(json));
    json.PK = ":RS"; // force RaceStanding

    const alreadyExistsMessage = await ddbUtils.ddbQueryRsAlreadyPending(
        json,
        cfg.pendingRule
    );
    if (alreadyExistsMessage) {
        return {
            error: `Pending already exists: ${alreadyExistsMessage}`,
            status: "error",
        };
    }

    if (stringIsTrue(cfg.lcl1)) {
        //low car lane 1?
        json.cn.sort();
        log.debug("addPending2: sorted: ", json.cn);
    } else {
        log.debug("addPending2: unsorted: ", json.cn);
    }
    return await ddbUtils.addSingle(json);
};
const stringIsTrue = (stringValue) => {
    return stringValue.toLowerCase() == "true" ? true : false;
};

const applyFinishTime = async (json) => {
    log.debug("applyFinishTime 413: " + JSON.stringify(json));
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

    log.debug("applyFinishTime 413 rsFoundList: ", rsFoundList);

    if (rsFoundList.length > 0) {
        const tgtRs = rsFoundList[0];
        // match means A phase.
        const phase = tgtRp.phaseLiteral;
        log.debug("applyFinishTime 413 phase: ", phase);

        if (phase === "A") {
            tgtRs.phase1Results = json.phr;
        } else {
            tgtRs.phase2Results = json.phr.reverse();
        }
        await ddbUtils.addSingle(tgtRs);

        var finishPromises = [];
        finishPromises.push(
            announceResults.formatAndSubmitResults(tgtRs, tgtRp)
        );

        // TODO: cloneRS messes with announcement on tie when there is a bracket
        await Promise.all(finishPromises);
        finishPromises = [];
        //End TODO:

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
    log.debug("BEGIN: advanceChartPos");
    if (!srcRs && bracketPos) {
        //populate srcRS
        srcRs = await loadRaceStandingFromBracketPos(bracketPos);
        log.debug("advanceChartPos loaded srcRS:", srcRs);
    } else if (srcRs && !bracketPos) {
        //populate bracketPos
        if (!srcRs.Bp) {
            log.debug("advanceChartPos: not a raceBracket RS");
            return;
        }
        bracketPos = await loadBracketPosFromRaceStanding(srcRs);
        log.debug("advanceChartPos loaded bracketPos:", bracketPos);
    }

    if (srcRs) {
        if (srcRs.del) {
            srcRs = null;
        }
    }

    if (!srcRs && bracketPos.isReadyToAddPending) {
        const pendingRC = await addPendingFromChartPos(srcRs, bracketPos);
        // new pending with participants won't need to advance.
        // fall thru to advance anyway to handle bye/forfeit.
    }

    log.debug("advanceChartPos: Bp:", bracketPos.SK);
    const chartId = bracketPos.SK.replace(/:.*/, "");
    const heatNumber = bracketPos.SK.replace(/.*:/, "");
    const [bmd, combined] = await getCachedBmd(bracketPos.orgId, chartId);
    if (!combined) {
        log.debug("advanceChartPos: missing combined json");
        return;
    }
    log.debug("advanceChartPos: combined:", combined);
    if (!combined.progress) {
        log.debug("advanceChartPos: missing combined json progress");
        return;
    }
    if (!combined.progress[heatNumber]) {
        log.debug(
            "advanceChartPos: missing combined json progress for heat: ",
            heatNumber
        );
        return;
    }

    const progress = combined.progress[heatNumber];
    log.debug("advanceChartPos: applying progress using: ", progress);
    const winnerDest = progress.WinnerDest;
    const loserDest = progress.LoserDest;
    let winnerPtcpObj = "";
    let loserPtcpObj = "";
    let winCount = 0;
    const readyToCede = bracketPos.isReadyToCedeUncontested;
    if (readyToCede) {
        log.debug("advanceChartPos: readyToCede : ", readyToCede);

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
        log.debug("addPendingFromChartPos: standing down, rs exists.");
        return;
    }

    log.debug(
        "BEGIN addPendingFromChartPos: isReadyToAddPending:",
        bracketPos.isReadyToAddPending
    );
    if (bracketPos.isReadyToAddPending) {
        log.debug("isReadyToAddPending Bp:", bracketPos);
        const pendingRC = await addPending2({
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
        if (pendingRC && pendingRC.error) {
            globalErrorList.push(pendingRC);
        }
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
        log.debug(
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
    log.debug(
        "BEGIN: applyPtcpToChartPos: ptcp:",
        ptcpObject,
        " destinationChartPos: ",
        destinationChartPos
    );
    //const tgtBracketPos = await ddbQueryPkSk(`${bmd.orgId}:Bp`, sk);
    //log.debug("applyPtcpToChartPos: found:", tgtBracketPos);
    const tgtBracketPos = {
        orgId: bmd.orgId,
        orgIz: bmd.orgId.replace(/\..*/, ""), // TODO: unhack orgIz
        chartId: bmd.SK,
        pos: {},
        heatNumber: destHeatNumber,
    };
    tgtBracketPos.pos[destHeatLetter] = ptcpObject;
    // this may recurse... (consider bye/forfeit/2nd racer advances, needs pending)
    log.debug(
        "applyPtcpToChartPos: potential recursion into addOrUpdateChartPosition:",
        tgtBracketPos
    );
    await addOrUpdateChartPosition(tgtBracketPos);
};

//TODO: put this method in RS object!
function isRaceStandingAdhoc(srcRs) {
    return !srcRs.SK.includes(":");
}
async function cloneRs(srcRs) {
    if (isRaceStandingAdhoc(srcRs)) {
        const clone = {
            PK: ":RS", // force RaceStanding
            cn: srcRs.cn,
            orgId: srcRs.orgId,
            by: srcRs.by,
        };
        log.debug("cloneRs: ", JSON.stringify(clone));
        return await ddbUtils.addSingle(clone);
    } else {
        // don't generate a new key if this RS is tied to the charts!
        delete srcRs.ph1;
        delete srcRs.ph2;
        return await ddbUtils.addSingle(srcRs);
    }
}

const deleteRacePhase = async (json) => {
    log.debug("deleteRacePhase: " + JSON.stringify(json));
    const rpFound = await ddbUtils.ddbQueryPkSk(`${json.orgId}:RP`, json.SK);
    log.debug("rpFound", rpFound);

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

async function addBlocks(json) {
    log.debug("addBlocks: " + JSON.stringify(json));
    json.PK = ":RP"; // force RacePhase

    const waitRp = ddbUtils.ddbQueryRpNextOnBlocks({ orgId: json.orgId });
    //const waitRp = ddbUtils.ddbQueryRpDuplicateCheck(json);
    const waitRs = ddbUtils.ddbQueryRsExistsAndPendingCheck(json);
    const [rpFound, rsFound] = await Promise.all([waitRp, waitRs]);
    log.debug("rpFound", rpFound);
    log.debug("rsFound", rsFound);
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
                "There is already a race on the blocks: " +
                rpFound[0].carNumbers.toString(),
        };
    }

    // link racePhase to RaceStanding!
    json["rs"] = rsFound[0].SK;

    json["pl"] = rsFound[0].getPhaseLiteral(json.cn);
    if (rsFound[0].Bp) json["Bp"] = rsFound[0].Bp;

    const rpResult = await ddbUtils.addSingle(json);
    log.debug("addBlocks tgtRp:", rpResult);

    await announceResults.formatAndSubmitNextOnBlocks(
        rsFound[0],
        rpResult.entity
    );
    return rpResult;
}

const addChartMetaData = async (json) => {
    log.debug("addChartMetaData: " + JSON.stringify(json));
    json.PK = ":Bmd"; // force BracketMetaData
    if (!json.SK) {
        const uu6 = ddbUtils.create_UUID().substring(0, 6);
        json.SK = uu6;
    }

    const bmdFound = await ddbUtils.ddbQueryBracketMdExistsCheck(json);
    log.debug("bmdFound", bmdFound);
    if (bmdFound.length == 0) {
        log.debug("addChartMetaData add needed:", bmdFound);
        // fall thru to  Add
    } else {
        // update
        const userJson = json;
        json = bmdFound[0];
        json.bracketName = userJson.bracketName;
        json.del = userJson.del;
        log.debug("addChartMetaData updating:", json);
    }

    const rc = await ddbUtils.addSingle(json);

    rc.chartId = json.SK.replace(/:.*/, "");
    log.debug("addChartMetaData returning: ", rc);
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
    log.debug("found cached bmd:", bmd);
    if (bmd) {
        const combinedJson = await tmpCache.getObject({
            Bucket: process.env.ChartS3BucketName,
            Key: "data/brackets" + "/" + bmd.jsonPath,
        });
        log.debug("found cached combined:", combinedJson);
        return [bmd, combinedJson];
    }
    return [];
};
const addOrUpdateChartPosition = async (json) => {
    log.debug("BEGIN: addOrUpdateChartPosition: " + JSON.stringify(json));

    json.PK = ":Bp"; // force BracketPosition
    if (!json.SK) {
        json.SK = `${json.chartId}:${json.heatNumber}`;
    }

    const posFound = await ddbUtils.ddbQueryPkSk(`${json.orgId}:Bp`, json.SK);
    log.debug("posFound", posFound);
    if (!posFound) {
        log.debug("addOrUpdateChartPosition add needed:", posFound);
        // Add
        //return await ddbUtils.addSingle(json);
    } else {
        log.debug("addOrUpdateChartPosition update needed:", posFound);
        const mergedPos = Object.assign(posFound.pos, json.pos);
        log.debug("addOrUpdateChartPosition mergedPos:", mergedPos);
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
    log.debug("addOrgConfig: " + JSON.stringify(json));
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

async function queryTimerHistoryByOrgId(qsp) {
    const [activeTimers, timerConfig] = await Promise.all([
        getActiveTimers(),
        ddbUtils.getTimerConfigByOrgId(qsp.orgId),
    ]);
    if (!timerConfig) {
        return { error: "queryTimerHistoryByOrgId Missing timerConfig" };
    }
    var selectedTimerUuid = undefined;
    activeTimers.forEach((timer) => {
        if (timer.sha === timerConfig.sha) selectedTimerUuid = timer.uuid;
    });
    log.debug(
        `queryTimerHistoryByOrgId selectedTimerUuid ${selectedTimerUuid} `
    );
    if (!selectedTimerUuid) {
        return { error: "Missing selectedTimerUuid" };
    }
    return await ddbUtils.ddbQueryTimerHistoryByUuid(selectedTimerUuid);
}
async function getActiveTimers() {
    const timers = await ddbUtils.ddbQueryPkAll(
        "registered",
        process.env.TimerDbTable
    );
    timers.forEach(registeredTimerSha);

    return timers;
}
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
        log.debug("addTimerConfig: applying selected timer sha:", json.sha);
        await registerEventWithTimer(json);
    } else {
        log.debug("addTimerConfig: no sha found.");
    }
    return await ddbUtils.addSingle(json);
};
const registerEventWithTimer = async (timerConfigJson) => {
    //
    const selectedSha = timerConfigJson.sha;
    log.debug("registerEventWithTimer: ", timerConfigJson);
    const timers = await getActiveTimers();
    const selectedTimers = timers.filter((timer) => timer.sha === selectedSha);
    if (selectedTimers.length == 0) {
        log.debug("registerEventWithTimer: sha not found: ", selectedSha);
        return;
    }
    const selectedTimer = selectedTimers[0];

    log.debug("registerEventWithTimer: selectedTimer: ", selectedTimer);
    const timerTableTc = Object.assign({}, timerConfigJson);
    timerTableTc.PK = selectedTimer.uuid;
    timerTableTc.SK = `^${timerConfigJson.orgId}`;
    timerConfigJson.sha = timerTableTc.sha; // save on original --flows back to derbyMain Ddb

    delete timerTableTc.sha;
    log.debug("registerEventWithTimer: registration: ", timerTableTc);

    await ddbUtils.ddbPut(timerTableTc, process.env.TimerDbTable);
};
const updateEventConfig = async (json) => {
    log.debug("updateEventConfig: stub: " + JSON.stringify(json));
    json.PK = "EventConfig"; // force EventConfig
    const eventConfig = await ddbUtils.getEventConfig(json.orgId); // should resolve from cache, no IO wait.
    eventConfig.paUri = json.paUri;
    eventConfig.pendingRule = json.pendingRule;
    eventConfig.lcl1 = json.lcl1;
    eventConfig.name = json.name;

    ddbUtils.flushEventCache(); //TODO: flush event cache in other instances of lambda...
    return await ddbUtils.addSingle(eventConfig);
};
const addEventConfig = async (event) => {
    const json = JSON.parse(event.body);

    log.debug("addEventConfig: " + JSON.stringify(json));

    const orgConfig = await ddbUtils.ddbQueryPkSk(`OrgConfig`, json.orgIz);

    json.PK = "EventConfig"; // force
    json.SK = json.orgIz + ":" + json.orgId; // force

    if (!json.paUri) {
        json.paUri = orgConfig.paUri;
    } else {
        log.debug("addEventConfig: using api paUri: ");
    }

    log.debug(
        "addEventConfig: paUri: " +
            JSON.stringify(json) +
            ` orgConfig: ${JSON.stringify(orgConfig)} `
    );
    // use prior ttl if found (API cannot change ttl of in progress event!)
    if (!orgConfig.defaultTTL) {
        orgConfig.defaultTTL = 3600 * 24 * 1;
    }

    const nowEpochSeconds = Math.round(new Date().getTime() / 1000);
    const newTtl = nowEpochSeconds + orgConfig.defaultTTL;

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

async function addParticipant2(json) {
    log.debug("addParticipant2: " + JSON.stringify(json));
    json.PK = ":PTCP"; // force Participant
    const paTask = await announceResults.submitToPolly(
        "added driver: " + json.name,
        json.orgId
    );
    return await ddbUtils.addSingle(json);
}
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
async function getOrgRoles(event, apiProps) {
    const json = JSON.parse(event.body);

    log.debug("getOrgRoles: apiEmail:", apiProps);
    log.debug("getOrgRoles: qsEmail:", event.queryStringParameters);
    if (
        event &&
        event.queryStringParameters &&
        event.queryStringParameters.userEmail &&
        apiProps &&
        apiProps.email
    ) {
        if (
            apiProps.email.toLowerCase() ===
            event.queryStringParameters.userEmail.toLowerCase()
        ) {
            return {
                roleList: apiProps.roleList,
                email: apiProps.email.toLowerCase(),
            };
        }
    }
    return { statusCode: 403, error: "email not aligned" };
}
const routeMap = {
    "/getOrgRoles": {
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event, apiProps) => {
            return buildResponse(await getOrgRoles(event, apiProps));
        },
    },
    "/addEventConfig": {
        allowFrozen: true, // not really allowing frozen, but skip edit.  race not yet existent.
        allowMissingTtl: true,
        h: async (event) => {
            return buildResponse(await addEventConfig(event));
        },
    },
    "/updateEventConfig": {
        h: async (event) => {
            return buildResponse(
                await updateEventConfig(JSON.parse(event.body))
            );
        },
    },
    "/getActiveTimers": {
        allowFrozen: true,
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
    "/listOrgUser": {
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event, apiProps) => {
            return buildResponse(
                await listOrgUser(JSON.parse(event.body), apiProps)
            );
        },
    },
    "/addOrgUser": {
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event) => {
            return buildResponse(await addOrgUser(JSON.parse(event.body)));
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
                await apiRaceStanding.deleteRaceStanding(JSON.parse(event.body))
            );
        },
    },
    "/RaceStanding/addTag": {
        h: async (event) => {
            return buildResponse(
                await apiRaceStanding.addTag(JSON.parse(event.body))
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
            globalErrorList = []; // TODO: re-visit multiple low level error messages from advanceChartPos
            const localMsg = await addOrUpdateChartPosition(
                JSON.parse(event.body)
            );
            if (globalErrorList && globalErrorList.length > 0) {
                return buildResponse(globalErrorList[0]);
            } else {
                return buildResponse(localMsg);
            }
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
        allowFrozen: true,
        h: async (event) => {
            var qr = await ddbUtils.ddbQueryRsContains(JSON.parse(event.body));
            log.debug("ddbQuery: " + qr);
            return buildResponse({ Count: qr });
        },
    },
    "/getNextOnBlocks": {
        allowFrozen: true,
        h: async (event) => {
            const nob = await ddbUtils.ddbQueryRpNextOnBlocks(
                event.queryStringParameters
            );
            return buildResponse(nob);
        },
    },
    "/getRaceHistory": {
        allowFrozen: true,
        h: async (event) => {
            var [qr, cacheMaxSeconds] = await ddbUtils.ddbQueryRaceHistory(
                event.queryStringParameters
            );
            const cacheControl = "max-age=" + cacheMaxSeconds;
            return buildResponse(qr, cacheControl);
        },
    },
    "/getTimerHistory": {
        allowFrozen: true,
        h: async (event) => {
            var qr = await queryTimerHistoryByOrgId(
                event.queryStringParameters
            );
            return buildResponse(qr);
        },
    },
    "/listMediaPrefix": {
        allowFrozen: true,
        h: async (event) => {
            var qr = await s3QueryMediaPrefix(event.queryStringParameters);
            const cacheControl = "max-age=" + 15;
            return buildResponse(qr, cacheControl);
        },
    },
    "/listChartTypes": {
        allowFrozen: true,
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
            /*
            if (json.messageTag === "called") {
                await apiRaceStanding.snsFanoutRaceStatus(json.carNumbers);
            }
            */

            const mp3ObjectPath = await announceResults.submitToPolly(
                paMessage,
                orgId
            );
            log.debug("announceTask: " + paMessage + " gave: ", mp3ObjectPath);
            log.debug("initiateAnnouncement:", mp3ObjectPath);
            await announceResults.propagateIotGeneric(orgId, mp3ObjectPath);
            return buildResponse({ announced: mp3ObjectPath });
        },
    },
    "/requestTts": {
        h: async (event) => {
            var json = JSON.parse(event.body);
            var ssml = json.ssml;
            var orgId = json.orgId;
            const speechMp3 = await announceResults.submitToPolly(ssml, orgId);
            log.debug("requestTts: " + ssml + " gave: ", speechMp3);
            return buildResponse({ speechMp3: speechMp3 });
        },
    },
    "/requestMqttSubPermission": {
        h: async (event) => {
            const qsp = event.queryStringParameters;
            if (!qsp) {
                qsp = {};
            }
            if (!qsp.principal) {
                log.debug(
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
    "/requestS3PutObjectUrl": {
        h: async (event) => {
            const qsp = event.queryStringParameters;
            if (!qsp) {
                qsp = {};
            }
            if (!qsp.key) {
                log.debug("/requestS3PutObjectUrl : Unknown or missing key");
                const qr = { error: "Unknown or missing key" };
                return buildResponse(qr);
            }

            const orgId = getOrgId(event);
            var bucket = "";
            var key = "";
            if (process.env.s3VideoWatch && true) {
                bucket = process.env.s3VideoWatch;
                key = `inputs/${orgId}-${qsp.key}`; // watch bucket won't see sub dirs :-(
            } else {
                bucket = process.env.DstBucket;
                key = `media/${orgId}/${qsp.key}`;
            }
            const mimeType = "video/webm";
            var params = {
                Expires: 600, // allow for slow video upload
                Bucket: bucket,
                Key: key,
                ContentType: mimeType,
            };
            var signedUrl = s3.getSignedUrl("putObject", params);
            log.debug("For params:", params, " The signed URL is", signedUrl);

            return buildResponse({ signedUrl: signedUrl });
        },
    },
};

function buildResponse(jsonObj, cacheControl = "no-cache") {
    if (!jsonObj) {
        jsonObj = {};
    }
    return {
        statusCode: jsonObj.statusCode ? jsonObj.statusCode : 200,
        headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Cache-Control": cacheControl,
            "x-client-minimum": clientMinimumVersion,
            "x-derby-main-version": derbyMainVersion,
        },
        body: JSON.stringify(jsonObj),
    };
}

async function snsApplyTimerHandler(snsMessageJson) {
    log.debug("applyTimerHandler Message received from SNS2:", snsMessageJson);
    log.debug("applyTimerHandler Message received from SNS2:", snsMessageJson);
    const json = snsMessageJson;
    if (json && json.timerConfig && json.deltas && json.deltas.length > 0) {
        // sns gave us a timer config.  use that instead of
        //   waiting for another dynamo read
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
        const candidateBlock = json.deltas[0].cBlock;

        if (candidateBlock && candidateBlock[0]) {
            const firstCblock = candidateBlock[0]; // first block is close enough for this edit
            log.debug(
                "auditCblock: first candidateBlock: ",
                firstCblock,
                " vs: ",
                nextOnBlocks
            );
            if (firstCblock.pubTime < nextOnBlocks.at) {
                log.debug(
                    "auditCblock: ignoring finishTime that is older than nextOnBlocks"
                );
                return;
            } else {
                log.debug(
                    "auditCblock: allowing finishTime that is newer than nextOnBlocks"
                );
            }
        } else {
            log.debug("auditCblock: finishTime not Audited.  missing cblock");
        }
        // TODO: do not apply times from an sns event prior to
        //    the racephase add time
        log.debug("applyTimerHandler nob:", nextOnBlocks);
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
            log.debug("applyTimerHandler formatted:", req);
            const applied = await applyFinishTime(req);
            log.debug("applyTimerHandler rc:", applied);
        }
    } else {
        log.debug("applyTimerHandler invalid msg:", json);
    }
}

async function apiGatewayHandler(event) {
    const dbArn = process.env.DynamoDbArn;

    log.debug("event.path: ", event.path);

    const routePath = event.path.replace(/^\/app/, "");
    if (routePath === "/testArchive") {
        await archiveUtils.processExpiringEventConfig();
        return buildResponse({ tested: "ok" });
    }

    if (routePath === "/listOrgEvents") {
        const qr = await ddbUtils.ddbListEventConfigByOrg(getOrgIz(event));
        log.debug("getEventConfig 23232:", qr);
        return buildResponse(qr, "max-age=307");
    }
    if (routePath === "/listOrgConfig") {
        const qr = await ddbUtils.ddbQueryOrgConfig();
        log.debug("listOrgConfig :", qr);
        return buildResponse(qr, "max-age=1807");
    }
    if (routePath === "/getAwsConfig") {
        const aYear = 3600 * 24 * 360; // client will change cacheBuster key if environment changes
        return buildResponse(
            JSON.parse(process.env.AwsCognitoSettingsJson),
            `max-age=${aYear}`
        );
    }

    const decodedJwt = jwt.decode(event.headers.Authorization);
    const eventKey = getEventKey(event);
    const orgId = getOrgId(event);
    const orgIz = getOrgIz(event);
    const config = await ddbUtils.getEventConfig(eventKey, event.headers);
    const defaultTTL = await getTtl(config);

    const by = decodedJwt["cognito:username"]
        ? decodedJwt["cognito:username"]
        : decodedJwt.email;
    entityFactory = new EntityFactory({
        orgId: orgId,
        by: by,
        TTL: defaultTTL,
    });
    ddbUtils.setEntityFactory(entityFactory);
    log.debug("Begin event", event, " with config: ", config);

    const email = decodedJwt.email;

    const roleList = await getUserRoles(orgIz, email);
    if (email && hasServerRoutePath(orgIz, roleList, routePath)) {
        log.debug(`allowing access to ${routePath} for [${email}]`);
    } else {
        log.debug(`prohibiting access to ${routePath} for [${email}]`);
        return buildResponse({ error: "unauthorized", statusCode: 401 });
    }

    if (!orgId && !routeMap[routePath].allowMissingOrgId) {
        const qr = { error: "Unable to determine orgId" };
        return buildResponse(qr);
    }

    if (!orgIz && !routeMap[routePath].allowMissingOrgIz) {
        const qr = { error: "Unable to determine orgIz" };
        return buildResponse(qr);
    }

    if (!routeMap[routePath].allowMissingTtl && !defaultTTL) {
        const qr = { error: "Unable to determine default TTL" };
        return buildResponse(qr);
    }

    if (routeMap[routePath] && routeMap[routePath].h) {
        log.debug(
            "ph routeMap handling: " + routePath,
            " object:",
            routeMap[routePath]
        );

        if (!routeMap[routePath].allowFrozen && frozenOrArchived(config)) {
            return buildResponse({
                error: "Can't edit a frozen/archived race",
            });
        }

        const phandler = routeMap[routePath].h;
        log.debug("routeMap handling: " + phandler);

        return await phandler(event, {
            orgIz: orgIz,
            orgId: orgId,
            email: email,
            roleList: roleList,
        });
    }

    log.debug("Unhandled Path: " + routePath + " ep: " + event.path);
    return buildResponse({
        status: "unhandled",
        error: "Unhandled",
    });
}
async function listOrgUser(json, apiProps) {
    const rolesByOrg = await ddbUtils.ddbQueryOrgPerms({
        orgIz: apiProps.orgIz,
    });
    return rolesByOrg;
}
async function addOrgUser(json) {
    log.debug("addOrgUser: " + JSON.stringify(json));

    if (json.email && json.orgIz && json.roleList) {
        json.PK = json.orgIz + ":OrgPerm"; // force OrgPerm
        json.SK = json.email;
        const by = entityFactory.propOverrides.by;
        const nowEpochSeconds = Math.round(new Date().getTime() / 1000);

        const tmpEntityFactory = new EntityFactory({
            orgIz: json.orgIz,
            by: by,
        });

        ddbUtils.setEntityFactory(tmpEntityFactory);
        return await ddbUtils.addSingle(json);
    } else {
        return { error: "missing field(s)" };
    }
}
async function getUserRoles(orgIz, email) {
    var roleList = getLegacyRoles(orgIz, email);
    var rolesByUser = await ddbUtils.ddbQueryOrgPerms({ orgIz: orgIz });
    log.debug("rolesByUser event", rolesByUser);

    /*
    if (rolesByUser && rolesByUser[email] && rolesByUser[email].roleList) {
        roleList = [...roleList, ...rolesByUser[email].roleList];
    }
    */
    if (rolesByUser && rolesByUser.length > 0) {
        rolesByUser = rolesByUser.filter(
            (ouser) => ouser.SK.toLowerCase() === email.toLowerCase()
        );
        if (rolesByUser && rolesByUser.length > 0 && rolesByUser[0].roleList) {
            roleList = [...roleList, ...rolesByUser[0].roleList];
        }
    }
    return roleList;
}
exports.handler = async function (event) {
    log.debug("Received event:", JSON.stringify(event, null, 4));
    if (event && event.path) {
        const response = await apiGatewayHandler(event);
        return response;
    }
    if (event.Records[0].Sns) {
        var snsMessage = event.Records[0].Sns.Message;
        const snsMessageJson = JSON.parse(snsMessage);

        log.debug("sns message: : ", snsMessageJson);
        // ugly workaround for cron events not invoking lambda directly
        //   12/2020 pressing polly sns topic back into use to deliver the cron event for archival
        if (snsMessageJson && snsMessageJson.source === "aws.events") {
            log.debug("handling archive poll from cron");
            await archiveUtils.processExpiringEventConfig();

            return;
        }

        log.debug("sns topic: : ", snsMessageJson.snsTopicArn);
        log.debug("sns polly arn: : ", process.env.PollyCompleteSnsArn);
        if (snsMessageJson.snsTopicArn === process.env.PollyCompleteSnsArn) {
            log.debug("polly finished: ", snsMessageJson);
            await announceResults.propagateIotFromSns(snsMessageJson);
            return "Polly Success";
        }

        await snsApplyTimerHandler(snsMessageJson);
        return "Success";
    }
    if (event.Records[0].s3) {
        const s3Event = event.Records[0].s3;
        log.debug("s3 trigger:", s3Event);

        var basefile = path.basename(s3Event.object.key);
        const tgtFile = basefile.replace("-", "/");
        const s3CopyParams = {
            CopySource: encodeURI(
                `/${s3Event.bucket.name}/${s3Event.object.key}`
            ),
            Key: `media/${tgtFile}`,
            Bucket: process.env.DstBucket,
        };
        log.debug("s3 mp4 copyParams:", s3CopyParams);
        const s3copyDone = await s3.copyObject(s3CopyParams).promise();
        log.debug("s3 mp4 copyDone:", s3copyDone);

        const webmSrcKey = `inputs/${basefile}`.replace(".mp4", ".webm");
        const webmTgtKey = tgtFile.replace(".mp4", ".webm");
        const s3CopyParamsWebm = {
            CopySource: encodeURI(`/${process.env.s3VideoWatch}/${webmSrcKey}`),
            Key: `media/${webmTgtKey}`,
            Bucket: process.env.DstBucket,
        };
        log.debug("s3 webm copyParams:", s3CopyParamsWebm);
        const s3copyDoneWebm = await s3.copyObject(s3CopyParamsWebm).promise();
        log.debug("s3 webm copyDone:", s3copyDoneWebm);
        return "s3 success";
    }

    log.debug("unknown event: ", event);
    return "Error";
};

// changed.
