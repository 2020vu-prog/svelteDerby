"use strict";

const log = require("loglevel");
const TmpCache = require("./tmpCache.js");
const { getSourceName } = require("./utils");
const {
    getEventKey,
    stringIsTrue,
    noopAsync,
} = require("./eventRequestUtils.js");

/**
 * Race progression for the derbyMain Lambda: adding pending races and race
 * phases, applying finish times, and advancing winners and losers through
 * bracket charts. Extracted from derbyMain.js (step 4 of
 * docs/TODO/DerbyMainRefactorProposal.md); the method bodies are unchanged
 * apart from reaching their collaborators through `this`.
 */
class RaceProgressionService {
    /**
     * @param ddbUtils the DdbUtils instance
     * @param ddbClient the DynamoDBClient (for the temporary cache)
     * @param s3Client the S3Client (for the temporary cache)
     * @param newAnnounceResults builds an AnnounceResults for each use
     * @param logUtils the LogUtils instance
     * @param iotService the IotService (finish-time video upload requests)
     * @param requestContext the shared RequestContext
     * @param createTmpCache builds a TmpCache; injectable so tests need no
     *   real clients
     */
    constructor({
        ddbUtils,
        ddbClient,
        s3Client,
        newAnnounceResults,
        logUtils,
        iotService,
        requestContext,
        createTmpCache = (ddbClient, s3Client) =>
            new TmpCache(ddbClient, s3Client),
    }) {
        this.ddbUtils = ddbUtils;
        this.ddbClient = ddbClient;
        this.s3Client = s3Client;
        this.newAnnounceResults = newAnnounceResults;
        this.logUtils = logUtils;
        this.iotService = iotService;
        this.requestContext = requestContext;
        this.createTmpCache = createTmpCache;
    }

    async addPending2(event) {
        const eventKey = getEventKey(event);
        const cfg = await this.ddbUtils.getEventConfig(eventKey);
        if (!cfg) {
            return {
                status: "error",
                error: "No Event config found.",
            };
        }

        const json = JSON.parse(event.body);
        log.debug("BEGIN: addPending2: " + JSON.stringify(json));
        json.PK = ":RS"; // force RaceStanding

        const alreadyExistsMessage =
            await this.ddbUtils.ddbQueryRsAlreadyPending(json, cfg.pendingRule);
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
        return await this.ddbUtils.addSingle(json);
    }
    async applyFinishTime(json) {
        log.debug("applyFinishTime 413: " + JSON.stringify(json));
        const tgtRpList = await this.ddbUtils.ddbQueryRpByKey(json);
        if (tgtRpList.length == 0) {
            return {
                status: "error",
                error: "No eligible target for update.",
            };
        }
        const tgtRp = tgtRpList[0];
        tgtRp.phr = json.phr; //TODO: verify client sent array of ints in "phr"
        let rsPromise = noopAsync(); // default to noop.
        if (this.isPendingNeeded(tgtRp)) {
            rsPromise = this.ddbUtils.ddbQueryRsByKey({
                orgId: tgtRp.orgId,
                SK: tgtRp.rs,
            });
        }

        const rpUpdatePromise = this.ddbUtils.addSingle(tgtRp);
        const iotVideoRequestPromise =
            this.iotService.requestIotVideoUploadByRP(tgtRp);

        const [rsFoundList, rpUpdate, iotVideoResult] = await Promise.all([
            rsPromise,
            rpUpdatePromise,
            iotVideoRequestPromise,
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
            await this.ddbUtils.addSingle(tgtRs);

            var finishPromises = [];
            finishPromises.push(
                this.newAnnounceResults().formatAndSubmitResults(tgtRs, tgtRp)
            );

            // TODO: cloneRS messes with announcement on tie when there is a bracket
            await Promise.all(finishPromises);
            finishPromises = [];
            //End TODO:

            if (tgtRs.isComplete()) {
                if (tgtRs.isOverallTie()) {
                    finishPromises.push(this.cloneRs(tgtRs));
                } else {
                    finishPromises.push(this.advanceChartPos(tgtRs));
                }
            }
            await Promise.all(finishPromises);
        } else {
            if (this.isPendingNeeded(tgtRp)) {
                return {
                    status: "error",
                    error: "No raceStanding found!",
                };
            }
        }

        // if using magic car 00008, auto create another trial run when we mark one complete.
        //   intended to 'log' elapsed times while running an adjacent race on another org/ AWS account.
        if (tgtRp && tgtRp.cn && tgtRp.cn[0] === "00008" && tgtRp.pt === "T") {
            await this.addBlocks({
                orgId: tgtRp.orgId,
                orgIz: tgtRp.orgIz,
                cn: ["00008", "00009"],
                pt: "T",
            });
        }

        return {
            status: "ok",
        };
    }
    // srcRs / bracketPos can be null.  Not both.
    async advanceChartPos(srcRs, bracketPos) {
        log.debug("BEGIN: advanceChartPos");
        if (!srcRs && bracketPos) {
            //populate srcRS
            srcRs = await this.loadRaceStandingFromBracketPos(bracketPos);
            log.debug("advanceChartPos loaded srcRS:", srcRs);
        } else if (srcRs && !bracketPos) {
            //populate bracketPos
            if (!srcRs.Bp) {
                log.debug("advanceChartPos: not a raceBracket RS");
                return;
            }
            bracketPos = await this.loadBracketPosFromRaceStanding(srcRs);
            log.debug("advanceChartPos loaded bracketPos:", bracketPos);
        }

        if (srcRs) {
            if (srcRs.del) {
                srcRs = null;
            }
        }

        if (!srcRs && bracketPos.isReadyToAddPending) {
            const pendingRC = await this.addPendingFromChartPos(
                srcRs,
                bracketPos
            );
            // new pending with participants won't need to advance.
            // fall thru to advance anyway to handle bye/forfeit.
        }

        log.debug("advanceChartPos: Bp:", bracketPos.SK);
        const chartId = bracketPos.SK.replace(/:.*/, "");
        const heatNumber = bracketPos.SK.replace(/.*:/, "");
        const [bmd, combined] = await this.getCachedBmd(
            bracketPos.orgId,
            chartId
        );
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

            await this.applyPtcpToChartPos(
                true,
                readyToCede.winner,
                winnerDest,
                bmd
            );
            await this.applyPtcpToChartPos(
                false,
                readyToCede.loser,
                loserDest,
                bmd
            );
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
            await this.applyPtcpToChartPos(
                true,
                winnerPtcpObj,
                winnerDest,
                bmd
            );
            await this.applyPtcpToChartPos(false, loserPtcpObj, loserDest, bmd);
        }
    }

    async loadRaceStandingFromBracketPos(bracketPos) {
        //TODO: override RS add to use bracketPos SK for RS SK
        return await this.ddbUtils.ddbQueryPkSk(
            `${bracketPos.orgId}:RS`,
            bracketPos.SK
        );
    }

    async logPendingFromChartPosError(bracketPos, pendingRC) {
        this.requestContext.pushError(pendingRC);
        const heatNumber = bracketPos.heatNumber || bracketPos.SK;
        const chartId = bracketPos.SK.replace(/:.*/, "");
        const chartMetaData = await this.ddbUtils.ddbQueryPkSk(
            `${bracketPos.orgId}:Bmd`,
            chartId
        );
        const chartName = chartMetaData?.bracketName || chartId;
        const carNumbers = [
            bracketPos.getPtcpNumber("A"),
            bracketPos.getPtcpNumber("B"),
        ].filter((carNumber) => carNumber);
        await this.logUtils.persistLogMessage({
            orgId: bracketPos.orgId,
            message: `Unable to add pending race for [${chartName}] heat [${heatNumber}] with cars [${carNumbers.join(
                " and "
            )}]: ${pendingRC.error}`,
            level: "warn",
            source: getSourceName(),
            detail: {
                chartId,
                chartName,
                bracketPosKey: bracketPos.SK,
                heatNumber,
                carNumbers,
                addPendingResult: pendingRC,
            },
        });
    }

    async loadBracketPosFromRaceStanding(rs) {
        return await this.ddbUtils.ddbQueryPkSk(`${rs.orgId}:Bp`, rs.Bp);
    }

    async addPendingFromChartPos(rs, bracketPos) {
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
            const pendingRC = await this.addPending2({
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
                await this.logPendingFromChartPosError(bracketPos, pendingRC);
            }
        }
    }

    getChartDestination(destinationChartPos, srcHeatLetter, didWin) {
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
    }
    async applyPtcpToChartPos(didWin, ptcpObject, destinationChartPos, bmd) {
        const srcHeatLetter = ptcpObject.heatLetter;
        delete ptcpObject.heatLetter;

        const [destHeatNumber, destHeatLetter] = this.getChartDestination(
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
        await this.addOrUpdateChartPosition(tgtBracketPos);
    }

    //TODO: put this method in RS object!
    isRaceStandingAdhoc(srcRs) {
        return !srcRs.SK.includes(":");
    }
    async cloneRs(srcRs) {
        if (this.isRaceStandingAdhoc(srcRs)) {
            const clone = {
                PK: ":RS", // force RaceStanding
                cn: srcRs.cn,
                orgId: srcRs.orgId,
                by: srcRs.by,
            };
            log.debug("cloneRs: ", JSON.stringify(clone));
            return await this.ddbUtils.addSingle(clone);
        } else {
            // don't generate a new key if this RS is tied to the charts!
            delete srcRs.ph1;
            delete srcRs.ph2;
            return await this.ddbUtils.addSingle(srcRs);
        }
    }

    async getPhaseElapsed(json) {
        if (!json) {
            json = {};
        }
        log.debug("getPhaseElapsed: " + JSON.stringify(json));
        const rc = await this.ddbUtils.ddbQueryPkSk(
            `${json.orgId}:RpElapsed`,
            `${json.sk}`,
            process.env.ElapsedTempDbTable
        );
        log.debug("getPhaseElapsed", rc);
        return rc;
    }
    async deleteRacePhase(json) {
        log.debug("deleteRacePhase: " + JSON.stringify(json));
        const rpFound = await this.ddbUtils.ddbQueryPkSk(
            `${json.orgId}:RP`,
            json.SK
        );
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
        return await this.ddbUtils.addSingle(rpFound);
    }

    isPendingNeeded(racePhase) {
        return typeof racePhase.pt === "null" || racePhase.pt === "R";
    }
    async addBlocks(json) {
        log.debug("addBlocks: " + JSON.stringify(json), typeof json.pt);
        json.PK = ":RP"; // force RacePhase

        const pendingNeeded = this.isPendingNeeded(json);
        log.debug("addBlocks 2: " + JSON.stringify(json), pendingNeeded);
        const waitRp = this.ddbUtils.ddbQueryRpNextOnBlocks({
            orgId: json.orgId,
        });
        //const waitRp = this.ddbUtils.ddbQueryRpDuplicateCheck(json);
        let waitRs = noopAsync(); // default to noop.
        if (pendingNeeded) {
            waitRs = this.ddbUtils.ddbQueryRsExistsAndPendingCheck(json);
        }
        const [rpFound, rsFound] = await Promise.all([waitRp, waitRs]);
        log.debug("rpFound", rpFound);
        log.debug("rsFound", rsFound);
        if (rpFound.length > 0) {
            return {
                status: "error",
                error:
                    "There is already a race on the blocks: " +
                    rpFound[0].carNumbers.toString(),
            };
        }
        if (pendingNeeded) {
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

            // link racePhase to RaceStanding!
            json["rs"] = rsFound[0].SK;

            json["pl"] = rsFound[0].getPhaseLiteral(json.cn);
            if (rsFound[0].Bp) json["Bp"] = rsFound[0].Bp;
        }

        const rpResult = await this.ddbUtils.addSingle(json);
        log.debug("addBlocks tgtRp:", rpResult);

        await this.newAnnounceResults().formatAndSubmitNextOnBlocks(
            pendingNeeded ? rsFound[0] : null,
            rpResult.entity
        );
        return rpResult;
    }

    async addChartMetaData(json) {
        log.debug("addChartMetaData: " + JSON.stringify(json));
        json.PK = ":Bmd"; // force BracketMetaData
        if (!json.SK) {
            const uu6 = this.ddbUtils.create_UUID().substring(0, 6);
            json.SK = uu6;
        }

        const bmdFound = await this.ddbUtils.ddbQueryBracketMdExistsCheck(json);
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

        const rc = await this.ddbUtils.addSingle(json);

        rc.chartId = json.SK.replace(/:.*/, "");
        log.debug("addChartMetaData returning: ", rc);
        return rc;
    }

    async getCachedBmd(orgId, chartId) {
        const tmpCache = this.createTmpCache(this.ddbClient, this.s3Client);

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
    }
    async addOrUpdateChartPosition(json) {
        log.debug("BEGIN: addOrUpdateChartPosition: " + JSON.stringify(json));

        json.PK = ":Bp"; // force BracketPosition
        if (!json.SK) {
            json.SK = `${json.chartId}:${json.heatNumber}`;
        }

        const posFound = await this.ddbUtils.ddbQueryPkSk(
            `${json.orgId}:Bp`,
            json.SK
        );
        log.debug("posFound", posFound);
        if (!posFound) {
            log.debug("addOrUpdateChartPosition add needed:", posFound);
            // Add
            //return await this.ddbUtils.addSingle(json);
        } else {
            log.debug("addOrUpdateChartPosition update needed:", posFound);
            const mergedPos = Object.assign(posFound.pos, json.pos);
            log.debug("addOrUpdateChartPosition mergedPos:", mergedPos);
            json = posFound;
            json.pos = mergedPos;
        }

        const posRC = await this.ddbUtils.addSingle(json);

        if (posRC.status == "ok" && posRC.entity) {
            const posE = posRC.entity;
            await this.advanceChartPos(null, posE);
        }
        return posRC;
    }
}

module.exports = RaceProgressionService;
