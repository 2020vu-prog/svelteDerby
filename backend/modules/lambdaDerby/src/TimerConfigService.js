"use strict";
const crypto = require("crypto");
const { Base64 } = require("js-base64");
const log = require("loglevel");
const { getEventKey } = require("./eventRequestUtils.js");

class TimerConfigService {
    constructor(ddbUtils) {
        this.ddbUtils = ddbUtils;
    }

    async getSanitizedTimers() {
        const timers = await this.getActiveTimers();
        timers.forEach(this.doNotPublishUuid);
        return timers;
    }

    async queryTimerPbHistory(qsp) {
        log.debug(`queryTimerPbHistory qsp ${qsp} `);
        if (!qsp.timerName) {
            return { error: "Missing timerName" };
        }
        if (!qsp.loIso) {
            const lowMS = 1000 * 3600 * 0.1;
            const loIso = new Date(new Date().getTime() - lowMS).toISOString();
            qsp.loIso = loIso;
        }
        if (!qsp.hiIso) {
            const hiIso = new Date().toISOString();
            qsp.hiIso = hiIso;
        }
        return await this.ddbUtils.ddbQueryTimerPbHistory(
            qsp.timerName,
            qsp.loIso,
            qsp.hiIso
        );
    }
    async queryTimerHistoryByOrgId(qsp) {
        const [activeTimers, timerConfig] = await Promise.all([
            this.getActiveTimers(),
            this.ddbUtils.getTimerConfigByOrgId(qsp.orgId),
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
        return await this.ddbUtils.ddbQueryTimerHistoryByUuid(
            selectedTimerUuid
        );
    }
    async getActiveTimers() {
        const timers = await this.ddbUtils.ddbQueryPkAll(
            "registered",
            process.env.TimerDbTable
        );
        timers.forEach(this.registeredTimerSha);

        return timers;
    }
    async getActivePbTimers() {
        const timers = await this.ddbUtils.ddbQueryPkAll(
            "TimerList:",
            process.env.TimerProtobufDbTable
        );

        return timers;
    }

    registeredTimerSha(timer) {
        const sha = crypto
            .createHash("sha256")
            .update(timer.uuid)
            .digest("hex");
        //timer.sha = sha.substring(0, 6);
        timer.sha = sha;
    }
    doNotPublishUuid(timer) {
        delete timer.uuid;
    }
    async addTimerPbConfig(json) {
        if (!json.orgIz) {
            return { error: "Missing orgIz" };
        }
        if (!json.orgId) {
            return { error: "Missing orgId" };
        }
        if (!json.pb) {
            return { error: "Missing protobuf" };
        }
        const eventKey = getEventKey(json);

        const [cfg, oldTimerPbMain] = await Promise.all([
            this.ddbUtils.getEventConfig(eventKey),
            this.ddbUtils.ddbQueryPkSk(
                `${json.orgId}:TimerPbConfig`,
                `${json.timerName}`
            ),
        ]);
        if (!cfg) {
            return {
                status: "error",
                error: "No Event config found.",
            };
        }

        log.debug("addTimerPbConfig oldTimerPbMain:", oldTimerPbMain);
        if (oldTimerPbMain && oldTimerPbMain.at != json.at) {
            return {
                status: "error",
                error: "Update request ignored due to stale data.  Refresh your Browser.",
            };
        }
        //let decoded = timer_protobuf_1.tutorial.TimerConfig.decode(bdata)
        //let decoded = timer_protobuf.Timer.TimerConfig.decode(bdata);
        //   log.debug("addTimerPbConfig: decoded:", decoded);
        json.PK = ":TimerPbConfig"; // force
        log.debug("addTimerPbConfig:", json);

        const pbJson = {
            PK: `T:${json.timerMqttClientId}`,
            SK: `9999:${eventKey}`, // short iso year, sort to last!
            data: Base64.toUint8Array(json.pb),
            TTL: cfg.TTL,
        };
        const plist = [];
        plist.push(this.ddbUtils.addSingle(json));
        plist.push(
            this.ddbUtils.ddbPut(pbJson, process.env.TimerProtobufDbTable)
        );
        if (oldTimerPbMain && oldTimerPbMain.SK !== json.timerName) {
            //if timerMqttClientID changes, the OLD timer needs deleted (logical)
            //  from p2.  this is b/c of key change.   p1 key is unchanged...
            const pbDelete = {
                PK: `T:${json.timerName}`, // should be mqtt client id
                SK: `9999:${eventKey}`, // short iso year, sort to last!
                pb: "",
                TTL: 1,
            };
            log.debug("addTimerPbConfig deleting:", pbDelete);
            log.debug(
                "addTimerPbConfig TODO: need to get old mqttClient from OldTimerPbMain"
            );
            //plist.push(this.ddbUtils.ddbPut(pbJson, process.env.TimerProtobufDbTable))
        }
        const rc = await Promise.all(plist);
        log.debug("addTimerPbConfig gave:", rc);

        return rc[0];
    }
    async addTimerConfig(json, initialLoad) {
        if (!json.orgIz) {
            return { error: "Missing orgIz" };
        }
        if (!json.orgId) {
            return { error: "Missing orgId" };
        }
        var prevTC = {};
        if (!initialLoad) {
            const prevTC = await this.ddbUtils.ddbQueryPkSk(
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
            await this.registerEventWithTimer(json);
        } else {
            log.debug("addTimerConfig: no sha found.");
        }
        return await this.ddbUtils.addSingle(json);
    }
    async registerEventWithTimer(timerConfigJson) {
        //
        const selectedSha = timerConfigJson.sha;
        log.debug("registerEventWithTimer: ", timerConfigJson);
        const timers = await this.getActiveTimers();
        const selectedTimers = timers.filter(
            (timer) => timer.sha === selectedSha
        );
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

        await this.ddbUtils.ddbPut(timerTableTc, process.env.TimerDbTable);
    }
}

module.exports = TimerConfigService;
