"use strict";
const log = require("loglevel");
const { PublishCommand: SnsPublishCommand } = require("@aws-sdk/client-sns");
const { getSourceName } = require("./utils");

class EventConfigService {
    constructor({
        ddbUtils,
        snsClient,
        logUtils,
        requestContext,
        timerConfigService,
        newAnnounceResults,
        refreshUserDisplayNamesFromOrgPerm,
    }) {
        this.ddbUtils = ddbUtils;
        this.snsClient = snsClient;
        this.logUtils = logUtils;
        this.requestContext = requestContext;
        this.timerConfigService = timerConfigService;
        this.newAnnounceResults = newAnnounceResults;
        this.refreshUserDisplayNamesFromOrgPerm =
            refreshUserDisplayNamesFromOrgPerm;
    }

    async addOrgConfig(json) {
        log.debug("addOrgConfig: " + JSON.stringify(json));
        json.PK = "OrgConfig"; // force
        json.SK = json.orgIz; // force
        const orgConfigEntityFactory = this.requestContext
            .getEntityFactory()
            .copyWith({
                orgIz: json.orgIz,
            });

        return await this.requestContext.withEntityFactory(
            orgConfigEntityFactory,
            () => this.ddbUtils.addSingle(json)
        );
    }
    async addNewEventPushSns(orgId, json) {
        const AddEventSnsArn = process.env.AddEventSnsArn;
        const environ = process.env.DeployEnvironment;
        var params = {
            Message: `new event for org: ${json.orgIz}\nName: ${json.name}`,
            TopicArn: AddEventSnsArn,
            Subject: `RR1 [${environ}] new event`,

            MessageAttributes: {
                orgId: {
                    DataType: "String",
                    StringValue: orgId,
                },
            },
        };

        try {
            console.log("SNS json    AddEventSnsArn:", json);
            console.log("SNS sending AddEventSnsArn:", params);
            //console.log("SNS module1 AddEventSnsArn:", snsModule);
            const sent = await this.snsClient.send(
                new SnsPublishCommand(params)
            );
            console.log("AddEventSnsArn send Success", sent);
        } catch (err) {
            console.log("AddEventSnsArn send Error", err);
        }
    }

    async updateEventConfig(json) {
        log.debug("updateEventConfig: stub: " + JSON.stringify(json));
        json.PK = "EventConfig"; // force EventConfig
        const eventConfig = await this.ddbUtils.getEventConfigByIds({
            orgIz: json.orgIz,
            orgId: json.orgId,
        });
        if (!eventConfig) {
            return { statusCode: 404, error: "Event config not found" };
        }
        eventConfig.paUri = json.paUri;
        eventConfig.pendingRule = json.pendingRule;
        eventConfig.lcl1 = json.lcl1;
        eventConfig.name = json.name;

        this.ddbUtils.flushEventCache(); //TODO: flush event cache in other instances of lambda...
        const eventConfigResult = await this.ddbUtils.addSingle(eventConfig);
        const userDisplayNameResult =
            await this.refreshUserDisplayNamesFromOrgPerm({
                orgIz: eventConfig.orgIz || json.orgIz,
                orgId: eventConfig.orgId || json.orgId,
            });
        eventConfigResult.userDisplayNameResult = userDisplayNameResult;
        return eventConfigResult;
    }
    async addEventConfig(event) {
        const json = JSON.parse(event.body);

        log.debug("addEventConfig: " + JSON.stringify(json));

        const orgConfig = await this.ddbUtils.ddbQueryPkSk(
            `OrgConfig`,
            json.orgIz
        );

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

        const eventConfigEntityFactory = this.requestContext
            .getEntityFactory()
            .copyWith({
                orgId: json.orgId,
                TTL: json.TTL,
            });
        this.requestContext.setEntityFactory(eventConfigEntityFactory);
        const eventRC = await this.ddbUtils.addSingle(json);
        await this.logUtils.persistLogMessage({
            orgId: json.orgId,
            message: `Added event: ${json.name || json.orgId}`,
            level: "debug",
            source: getSourceName(),
            detail: {
                orgIz: json.orgIz,
                orgId: json.orgId,
                name: json.name,
            },
        });
        const userDisplayNameResult =
            await this.refreshUserDisplayNamesFromOrgPerm({
                orgIz: json.orgIz,
                orgId: json.orgId,
            });
        eventRC.userDisplayNameResult = userDisplayNameResult;

        await this.addNewEventPushSns(json.orgId, json);
        await this.timerConfigService.addTimerConfig(json, true); // TODO: revisit default TimerConfig?
        return eventRC;
    }

    async addParticipant2(json) {
        log.debug("addParticipant2: " + JSON.stringify(json));
        json.PK = ":PTCP"; // force Participant
        if (json.maintainerHashes === undefined && json.number != null) {
            // addSingle is a full-record PutItem -- there's no partial-attribute
            // update for entity records, so any field missing from `json` is
            // permanently erased from what's stored. Ordinary staff edits (the
            // single-driver Update form) never carry maintainerHashes in their
            // payload, so without this, saving a routine name/sponsor/notes
            // change would silently wipe out every QR-code delegation grant on
            // that driver. Preserve the existing value whenever the caller
            // doesn't explicitly supply one, same read-modify-write convention
            // DriverDelegationService uses for this same field.
            const existing = await this.ddbUtils.ddbQueryPkSk(
                `${json.orgId}:PTCP`,
                String(json.number)
            );
            if (existing && existing.maintainerHashes) {
                json.maintainerHashes = existing.maintainerHashes;
            }
        }
        const paTask = await this.newAnnounceResults().submitToPolly(
            "added driver: " + json.name,
            json.orgId
        );
        return await this.ddbUtils.addSingle(json);
    }
}

module.exports = EventConfigService;
