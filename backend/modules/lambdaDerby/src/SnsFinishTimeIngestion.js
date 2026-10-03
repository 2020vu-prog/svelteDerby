"use strict";
const log = require("loglevel");
const EntityFactory = require("./shared/EntityFactory.js");

class SnsFinishTimeIngestion {
    constructor({
        ddbUtils,
        requestContext,
        raceProgressionService,
        newAnnounceResults,
    }) {
        this.ddbUtils = ddbUtils;
        this.requestContext = requestContext;
        this.raceProgressionService = raceProgressionService;
        this.newAnnounceResults = newAnnounceResults;
    }

    async snsApplyPbLogMessage(snsMessageJson, snsPublishedTimestamp) {
        // add ssml markup.  (svelte does this for manual announcements.)
        const paMessage = `<speak>${snsMessageJson.logMessage.message}</speak>`;
        const orgId = snsMessageJson.timerConfig.orgId;
        const announceResults = this.newAnnounceResults();
        const mp3ObjectPath = await announceResults.submitToPolly(
            paMessage,
            orgId
        );

        log.debug(
            "snsApplyPbLogMessage: " + paMessage + " gave: ",
            mp3ObjectPath
        );

        await announceResults.propagateIotGeneric(orgId, mp3ObjectPath);
    }
    async snsApplyPbTimerHandler(snsMessageJson, snsPublishedTimestamp) {
        log.debug(
            "snsApplyPbTimerHandler Message received from SNS2 pb:",
            snsPublishedTimestamp,
            snsMessageJson
        );
        log.debug(
            "snsApplyPbTimerHandler finishBlocks:",
            snsMessageJson.finishBlocks
        );
        log.debug(
            "snsApplyPbTimerHandler newXmitMs:",
            snsMessageJson.newXmitMs
        );

        //const finishLineBlock = snsMessageJson.finishBlocks[0]; //needFilter!! //verify
        var finishLineBlockList = snsMessageJson.finishBlocks.filter(
            (flb) => flb.timerName === "Finish"
        );

        if (finishLineBlockList && finishLineBlockList.length == 1) {
            //ok
        } else {
            throw ("missing finishLineBlock", finishLineBlock);
        }
        const finishLineBlock = finishLineBlockList[0]; //change array to filtered object

        var l1Micros = parseInt(finishLineBlock.rpiNoseMicros[0]);
        var l2Micros = parseInt(finishLineBlock.rpiNoseMicros[1]);
        var byLine = "rpi.local";
        // don't publish fractional ms for gps.  it will inevitably conflict with elapsed times!
        if (finishLineBlock.gpsAvailable) {
            l1Micros = finishLineBlock.gpsNoseMs[0] * 1000;
            l2Micros = finishLineBlock.gpsNoseMs[1] * 1000;
            byLine = "rpi.gps";
            snsPublishedTimestamp = finishLineBlock.gpsNoseMs[0]; // mqtt qos 1 re-xmit can obscure snsPubTime!
            // need workaround for no gps, but this should help for gps
        }

        const rp = await this.getApplyableNextOnBlocks(
            parseInt(snsMessageJson.newXmitMs),
            snsPublishedTimestamp,
            finishLineBlock.timerConfig.orgId,
            finishLineBlock.timerConfig.orgIz
        );

        log.debug("snsApplyPbTimerHandler rp:", rp);
        //throw "snsApplyPbTimerHandler unfinished.";

        if (rp.cn[0] && !this.validNumericTime(l1Micros)) {
            throw `missing time [${l1Micros}] for car [${rp.cn}] in lane 1`;
        }
        if (rp.cn[1] && !this.validNumericTime(l2Micros)) {
            throw `missing time [${l2Micros}] for car [${rp.cn}] in lane 2`;
        }
        this.requestContext.setEntityFactory(
            new EntityFactory({
                orgId: finishLineBlock.timerConfig.orgId,
                by: byLine,
                TTL: rp.TTL,
            })
        );

        const req = {
            orgId: finishLineBlock.timerConfig.orgId,
            orgIz: finishLineBlock.timerConfig.orgIz,
            SK: rp.SK,
            phr: [this.dbFmtTimer(l1Micros), this.dbFmtTimer(l2Micros)],
        };
        log.debug("snsApplyPbTimerHandler formatted:", req);
        const applied = await this.raceProgressionService.applyFinishTime(req);
        log.debug("snsApplyPbTimerHandler aft rc:", applied);

        const fbJson = {
            PK: `${finishLineBlock.timerConfig.orgId}:RpElapsed`,
            SK: rp.SK,
            cn: rp.cn, //augment with car number(s)
            //fbList: JSON.stringify(finishLineBlockList),
            fbList: JSON.stringify(snsMessageJson.finishBlocks),
            TTL: rp.TTL,
        };
        await this.ddbUtils.ddbPut(fbJson, process.env.ElapsedTempDbTable);
    }
    dbFmtTimer(rpiTime) {
        if (isNaN(rpiTime)) {
            return 0; // dynamo won't save NaN
        }
        return rpiTime;
    }
    validNumericTime(rpiTime) {
        if (isNaN(rpiTime)) {
            return false;
        }
        if (!rpiTime) {
            return false;
        }
        return true;
    }
    async snsApplyTimerHandler(snsMessageJson, snsPublishedTimestamp) {
        log.debug(
            "applyTimerHandler Message received from SNS2 default:",
            snsPublishedTimestamp,
            snsMessageJson
        );

        const json = snsMessageJson;
        if (json && json.timerConfig && json.deltas && json.deltas.length > 0) {
            // sns gave us a timer config.  use that instead of
            //   waiting for another dynamo read
            const timerConfig = json.timerConfig;
            this.requestContext.setEntityFactory(
                new EntityFactory({
                    orgId: timerConfig.orgId,
                    by: "rpi.local",
                    TTL: timerConfig.TTL,
                })
            );

            const deltaLanes = json.deltas[0].lanes;
            const candidateBlock = json.deltas[0].cBlock;
            var cblockAuditTime = 0;
            if (candidateBlock && candidateBlock[0]) {
                const firstCblock = candidateBlock[0]; // first block is close enough for this edit
                log.debug(
                    "snsApplyTimerHandler auditCblock: first candidateBlock: ",
                    firstCblock
                );
                cblockAuditTime = firstCblock.pubTime;
            } else {
                log.debug(
                    "snsApplyTimerHandler auditCblock: finishTime not Audited.  missing cblock"
                );
                cblockAuditTime = 0;
            }
            const rp = await this.getApplyableNextOnBlocks(
                cblockAuditTime,
                snsPublishedTimestamp,
                json.timerConfig.orgId,
                json.timerConfig.orgIz
            );

            log.debug("applyTimerHandler nob:", rp);
            if (rp) {
                const l1Micros = deltaLanes.lane1.noseMicros;
                const l2Micros = deltaLanes.lane2.noseMicros;
                const req = {
                    orgId: json.timerConfig.orgId,
                    orgIz: json.timerConfig.orgIz,
                    SK: rp.SK,
                    phr: [l1Micros, l2Micros],
                };
                log.debug("applyTimerHandler formatted:", req);
                const applied =
                    await this.raceProgressionService.applyFinishTime(req);
                log.debug("applyTimerHandler rc:", applied);
            }
        } else {
            log.debug("applyTimerHandler invalid msg:", json);
        }
    }

    async getApplyableNextOnBlocks(
        recordMs,
        snsPublishedTimestamp,
        orgId,
        orgIz
    ) {
        const snsPubDate = Date.parse(snsPublishedTimestamp);

        const nextOnBlocks = await this.ddbUtils.ddbQueryRpNextOnBlocks(
            { orgId: orgId, orgIz: orgIz }
            //json.timerConfig // need orgId, orgIz
        );

        if (!nextOnBlocks.length > 0) {
            throw "getApplyableNextOnBlocks Message : blocks are empty 0.";
        }
        const rp = nextOnBlocks[0]; // TODO: get oldest!
        if (!rp) {
            throw "getApplyableNextOnBlocks Message : blocks are empty 1.";
            return;
        }
        log.debug(
            "getApplyableNextOnBlocks Message : snsPubDate:",
            snsPubDate,
            " rpDate:",
            rp.at
        );

        // wall time may slip on pi.   if sns time (from AWS datacenter) is older than NOB time. don't apply time.
        if (snsPublishedTimestamp < rp.at) {
            throw (
                "getApplyableNextOnBlocks Message : skipping stale SNS finish time : ",
                snsPubDate,
                " rpDate:",
                rp.at
            );
            return;
        }
        if (recordMs) {
            if (recordMs < rp.at) {
                throw "getApplyableNextOnBlocks auditRecordMs: ignoring finishTime that is older than nextOnBlocks";
                return;
            } else {
                log.debug(
                    "getApplyableNextOnBlocks auditRecordMs: allowing finishTime that is newer than nextOnBlocks"
                );
            }
        } else {
            log.debug(
                "getApplyableNextOnBlocks auditRecordMs: finishTime not Audited.  missing recordMs"
            );
        }
        return rp;
    }
}

module.exports = SnsFinishTimeIngestion;
