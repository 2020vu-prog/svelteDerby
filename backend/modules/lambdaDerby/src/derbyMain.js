"use strict";
const clientMinimumVersion = "1.1.24";
const derbyMainVersion = "1.1.15";
const { CognitoJwtVerifier } = require("aws-jwt-verify");
const awsCognitoSettings = JSON.parse(process.env.AwsCognitoSettingsJson);
const jwtVerifier = CognitoJwtVerifier.create({
    userPoolId: awsCognitoSettings.aws_user_pools_id,
    tokenUse: "id",
    //tokenUse: "access",
    clientId: awsCognitoSettings.aws_user_pools_hosted_client_id,
});
const crypto = require("crypto");
const path = require("path");
//const timer_protobuf_1 = require("timer_protobuf");
//    const timerConfig = new timer_protobuf_1.tutorial.TimerConfig();
//    console.log("tbp:",timer_protobuf_1.tutorial.TimerConfig.decode);

const { Base64 } = require("js-base64");
//const { CalcFinish, RawFacade, PbUtils } = require("@rr1.us/timer_protobuf/calcFinishPb");

const log = require("loglevel");

const EntityFactory = require("./shared/EntityFactory.js");
const { hasPermission } = require("./shared/PermissionLookup.js");
const ApiRouter = require("./ApiRouter.js");
const RoutePermission = require("./shared/RoutePermission.js");
const {
    getOrgId,
    getOrgIz,
    getEventKey,
    getTtl,
} = require("./eventRequestUtils.js");
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { IoTClient } = require("@aws-sdk/client-iot");
const { CopyObjectCommand, S3Client } = require("@aws-sdk/client-s3");
const {
    PublishCommand: SnsPublishCommand,
    SNSClient,
} = require("@aws-sdk/client-sns");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { GetParameterCommand, SSMClient } = require("@aws-sdk/client-ssm");

const ddbClient = new DynamoDBClient({ region: process.env.AwsRegion });
const sqsClient = new SQSClient({ region: process.env.AwsRegion });
const s3Client = new S3Client({ region: process.env.AwsRegion });
const ssmClient = new SSMClient({ region: process.env.AwsRegion });
const snsClient = new SNSClient({ region: process.env.AwsRegion });
const iotClient = new IoTClient({ region: process.env.AwsRegion });
const DdbUtils = require("./DdbUtils");
const ArchiveUtils = require("./ArchiveUtils");
const DiscordUtils = require("./DiscordUtils");
const AnnounceResults = require("./AnnounceResults");
const ApiRaceStanding = require("./ApiRaceStanding");
const LogUtils = require("./LogUtils");
const DriverDelegationService = require("./DriverDelegationService");
const ParticipantService = require("./ParticipantService");
const IotService = require("./IotService");
const S3MediaService = require("./S3MediaService");
const RaceProgressionService = require("./RaceProgressionService");
const { getShaCars, getSourceName } = require("./utils");
const { decodeS3EventKey, encodeS3CopySource } = require("./S3Utils");
const requestContext = require("./RequestContext");

const ddbUtils = new DdbUtils(ddbClient, sqsClient);
const archiveUtils = new ArchiveUtils(ddbUtils);
const discordUtils = new DiscordUtils(ddbUtils);
const logUtils = new LogUtils(ddbUtils);
const driverDelegationService = new DriverDelegationService(ddbUtils);
const participantService = new ParticipantService(ddbUtils);
const iotService = new IotService(iotClient, ddbUtils);
const s3MediaService = new S3MediaService(s3Client);
const raceProgressionService = new RaceProgressionService({
    ddbUtils,
    ddbClient,
    s3Client,
    newAnnounceResults,
    logUtils,
    iotService,
    requestContext,
});

function newAnnounceResults() {
    return new AnnounceResults(ddbUtils);
}

function newApiRaceStanding() {
    return new ApiRaceStanding(
        ddbUtils,
        newAnnounceResults(),
        logUtils,
        snsClient
    );
}

log.setLevel(log.levels.TRACE);

function frozenOrArchived(config) {
    log.debug("function frozenOrArchived passed ", config);
    if (!config) {
        return false;
    }
    const configEntity = requestContext.getEntityFactory().build(config);
    return configEntity.checkIfFrozenOrArchived()["status"];
}

const addOrgConfig = async (json) => {
    log.debug("addOrgConfig: " + JSON.stringify(json));
    json.PK = "OrgConfig"; // force
    json.SK = json.orgIz; // force
    const orgConfigEntityFactory = requestContext.getEntityFactory().copyWith({
        orgIz: json.orgIz,
    });

    return await requestContext.withEntityFactory(orgConfigEntityFactory, () =>
        ddbUtils.addSingle(json)
    );
};
const getSanitizedTimers = async () => {
    const timers = await getActiveTimers();
    timers.forEach(doNotPublishUuid);
    return timers;
};

async function queryTimerPbHistory(qsp) {
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
    return await ddbUtils.ddbQueryTimerPbHistory(
        qsp.timerName,
        qsp.loIso,
        qsp.hiIso
    );
}
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
async function getActivePbTimers() {
    const timers = await ddbUtils.ddbQueryPkAll(
        "TimerList:",
        process.env.TimerProtobufDbTable
    );

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
const addTimerPbConfig = async (json) => {
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
        ddbUtils.getEventConfig(eventKey),
        ddbUtils.ddbQueryPkSk(
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
    plist.push(ddbUtils.addSingle(json));
    plist.push(ddbUtils.ddbPut(pbJson, process.env.TimerProtobufDbTable));
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
        //plist.push(ddbUtils.ddbPut(pbJson, process.env.TimerProtobufDbTable))
    }
    const rc = await Promise.all(plist);
    log.debug("addTimerPbConfig gave:", rc);

    return rc[0];
};
const addNewEventPushSns = async (orgId, json) => {
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
        const sent = await snsClient.send(new SnsPublishCommand(params));
        console.log("AddEventSnsArn send Success", sent);
    } catch (err) {
        console.log("AddEventSnsArn send Error", err);
    }
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
    const eventConfig = await ddbUtils.getEventConfigByIds({
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

    ddbUtils.flushEventCache(); //TODO: flush event cache in other instances of lambda...
    const eventConfigResult = await ddbUtils.addSingle(eventConfig);
    const userDisplayNameResult = await refreshUserDisplayNamesFromOrgPerm({
        orgIz: eventConfig.orgIz || json.orgIz,
        orgId: eventConfig.orgId || json.orgId,
    });
    eventConfigResult.userDisplayNameResult = userDisplayNameResult;
    return eventConfigResult;
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

    const eventConfigEntityFactory = requestContext
        .getEntityFactory()
        .copyWith({
            orgId: json.orgId,
            TTL: json.TTL,
        });
    requestContext.setEntityFactory(eventConfigEntityFactory);
    const eventRC = await ddbUtils.addSingle(json);
    await logUtils.persistLogMessage({
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
    const userDisplayNameResult = await refreshUserDisplayNamesFromOrgPerm({
        orgIz: json.orgIz,
        orgId: json.orgId,
    });
    eventRC.userDisplayNameResult = userDisplayNameResult;

    await addNewEventPushSns(json.orgId, json);
    await addTimerConfig(json, true); // TODO: revisit default TimerConfig?
    return eventRC;
};

async function addParticipant2(json) {
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
        const existing = await ddbUtils.ddbQueryPkSk(
            `${json.orgId}:PTCP`,
            String(json.number)
        );
        if (existing && existing.maintainerHashes) {
            json.maintainerHashes = existing.maintainerHashes;
        }
    }
    const paTask = await newAnnounceResults().submitToPolly(
        "added driver: " + json.name,
        json.orgId
    );
    return await ddbUtils.addSingle(json);
}

async function getOrgRoles(event, apiProps) {
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
    return {
        // no roles on error
        roleList: [],
        email: apiProps.email.toLowerCase(),
    };
    return { statusCode: 403, error: "email not aligned" };
}
const routeMap = {
    "/iot/discover": {
        permission: RoutePermission.ANONYMOUS,
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        allowMissingOrgIz: true,
        h: async (event, apiProps) => {
            return buildResponse(await iotService.iotDiscover(event, apiProps));
        },
    },
    "/getOrgRoles": {
        permission: RoutePermission.ANONYMOUS,
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event, apiProps) => {
            return buildResponse(await getOrgRoles(event, apiProps));
        },
    },
    "/addEventConfig": {
        permission: RoutePermission.POWER,
        allowFrozen: true, // not really allowing frozen, but skip edit.  race not yet existent.
        allowMissingTtl: true,
        h: async (event) => {
            return buildResponse(await addEventConfig(event));
        },
    },
    "/updateEventConfig": {
        permission: RoutePermission.POWER,
        h: async (event) => {
            return buildResponse(
                await updateEventConfig(JSON.parse(event.body))
            );
        },
    },
    "/getActiveTimers": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        allowFrozen: true,
        h: async (event) => {
            return buildResponse(await getSanitizedTimers());
        },
    },
    "/getActivePbTimers": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        allowFrozen: true,
        h: async (event) => {
            return buildResponse(await getActivePbTimers());
        },
    },
    "/timerConfig": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        h: async (event) => {
            return buildResponse(
                await addTimerConfig(JSON.parse(event.body), false)
            );
        },
    },
    "/timerPbConfig": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        h: async (event) => {
            return buildResponse(
                await addTimerPbConfig(JSON.parse(event.body), false)
            );
        },
    },
    "/listOrgUser": {
        permission: RoutePermission.CAN_ADD_ORG_USER,
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event, apiProps) => {
            return buildResponse(await listOrgUser(event, apiProps));
        },
    },
    "/addOrgUser": {
        permission: RoutePermission.CAN_ADD_ORG_USER,
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event, apiProps) => {
            return buildResponse(
                await addOrgUser(JSON.parse(event.body), apiProps)
            );
        },
    },
    "/addParticipant": {
        permission: RoutePermission.CAN_ADD_PARTICIPANT,
        h: async (event) => {
            return buildResponse(await addParticipant2(JSON.parse(event.body)));
        },
    },
    "/addPending": {
        permission: RoutePermission.CAN_ADD_PENDING,
        h: async (event) => {
            return buildResponse(
                await raceProgressionService.addPending2(event)
            );
        },
    },
    "/addBlocks": {
        permission: RoutePermission.CAN_ADD_BLOCKS,
        h: async (event) => {
            return buildResponse(
                await raceProgressionService.addBlocks(JSON.parse(event.body))
            );
        },
    },
    "/deleteRacePhase": {
        permission: RoutePermission.CAN_DELETE_BLOCKS,
        h: async (event) => {
            return buildResponse(
                await raceProgressionService.deleteRacePhase(
                    JSON.parse(event.body)
                )
            );
        },
    },
    "/deleteRaceStanding": {
        permission: RoutePermission.CAN_DELETE_STANDING,
        h: async (event) => {
            return buildResponse(
                await newApiRaceStanding().deleteRaceStanding(
                    JSON.parse(event.body)
                )
            );
        },
    },
    "/getPhaseElapsed": {
        permission: RoutePermission.ANONYMOUS,
        allowFrozen: true,
        h: async (event) => {
            return buildResponse(
                await raceProgressionService.getPhaseElapsed(
                    event.queryStringParameters
                )
            );
        },
    },
    "/RaceStanding/addTag": {
        permission: RoutePermission.CAN_INITIATE_ANNOUNCEMENT,
        h: async (event) => {
            return buildResponse(
                await newApiRaceStanding().addTag(JSON.parse(event.body))
            );
        },
    },
    "/addChart": {
        permission: RoutePermission.CAN_ADD_CHART,
        h: async (event) => {
            return buildResponse(
                await raceProgressionService.addChartMetaData(
                    JSON.parse(event.body)
                )
            );
        },
    },
    "/addChartPosition": {
        permission: RoutePermission.CHART_POSITION,
        h: async (event) => {
            requestContext.resetErrorList(); // TODO: re-visit multiple low level error messages from advanceChartPos
            const localMsg =
                await raceProgressionService.addOrUpdateChartPosition(
                    JSON.parse(event.body)
                );
            const errorList = requestContext.getErrorList();
            if (errorList && errorList.length > 0) {
                return buildResponse(errorList[0]);
            } else {
                return buildResponse(localMsg);
            }
        },
    },
    "/doApplyFinishTime": {
        permission: RoutePermission.MANUAL_FINISH_TIME,
        h: async (event) => {
            const finishTimeRequest = JSON.parse(event.body);
            if (!finishTimeRequest.SK) {
                return buildResponse({
                    status: "error",
                    error: "Missing SK",
                    statusCode: 400,
                });
            }
            return buildResponse(
                await raceProgressionService.applyFinishTime(finishTimeRequest)
            );
        },
    },
    "/addBulk": {
        permission: RoutePermission.POWER,
        h: async (event) => {
            return buildResponse(
                await ddbUtils.addBulk(JSON.parse(event.body))
            );
        },
    },
    "/addLogMessage": {
        permission: RoutePermission.POWER,
        h: async (event) => {
            return buildResponse(
                await logUtils.persistLogMessage(JSON.parse(event.body))
            );
        },
    },
    "/ddbQuery": {
        permission: RoutePermission.POWER,
        allowFrozen: true,
        h: async (event) => {
            var qr = await ddbUtils.ddbQueryRsContains(JSON.parse(event.body));
            log.debug("ddbQuery: " + qr);
            return buildResponse({ Count: qr });
        },
    },
    "/getNextOnBlocks": {
        permission: RoutePermission.POWER,
        allowFrozen: true,
        h: async (event) => {
            const nob = await ddbUtils.ddbQueryRpNextOnBlocks(
                event.queryStringParameters
            );
            return buildResponse(nob);
        },
    },
    "/getRaceHistory": {
        permission: RoutePermission.ANONYMOUS,
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
        permission: RoutePermission.CAN_TIMER_CONFIG,
        allowFrozen: true,
        h: async (event) => {
            var qr = await queryTimerHistoryByOrgId(
                event.queryStringParameters
            );
            return buildResponse(qr);
        },
    },
    "/getTimerPbHistory": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        allowFrozen: true,
        h: async (event) => {
            var qr = await queryTimerPbHistory(event.queryStringParameters);
            return buildResponse(qr);
        },
    },
    "/listMediaPrefix": {
        permission: RoutePermission.ANONYMOUS,
        allowFrozen: true,
        h: async (event) => {
            var qr = await s3MediaService.s3QueryMediaPrefix(
                event.queryStringParameters
            );
            const cacheControl = "max-age=" + 15;
            return buildResponse(qr, cacheControl);
        },
    },
    "/listChartTypes": {
        permission: RoutePermission.CAN_ADD_CHART,
        allowFrozen: true,
        h: async (event) => {
            var chartTypes = await s3MediaService.s3QueryChartTypes();
            const cacheControl = "max-age=" + 3600 * 24 * 7;
            return buildResponse(chartTypes, cacheControl);
        },
    },
    "/initiateAnnouncement": {
        permission: RoutePermission.CAN_INITIATE_ANNOUNCEMENT,
        h: async (event) => {
            var json = JSON.parse(event.body);
            var paMessage = json.paMessage;
            var orgId = json.orgId;
            /*
            if (json.messageTag === "called") {
                await newApiRaceStanding().snsFanoutRaceStatus(json.carNumbers);
            }
            */

            const announceResults = newAnnounceResults();
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
        permission: RoutePermission.CAN_ADD_PARTICIPANT,
        h: async (event) => {
            var json = JSON.parse(event.body);
            var ssml = json.ssml;
            var orgId = json.orgId;
            const speechMp3 = await newAnnounceResults().submitToPolly(
                ssml,
                orgId
            );
            log.debug("requestTts: " + ssml + " gave: ", speechMp3);
            return buildResponse({ speechMp3: speechMp3 });
        },
    },
    "/requestMqttSubPermission": {
        permission: RoutePermission.ANONYMOUS,
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
            const data = await iotService.attachPrincipalPolicy(
                policyName,
                qsp.principal
            );
            return buildResponse(data);
        },
    },
    "/requestVideoUpload": {
        permission: RoutePermission.CAN_CAPTURE_VIDEO,
        h: async (event) => {
            //            var json = JSON.parse(event.body);
            const qsp = event.queryStringParameters;
            const vr = {
                orgId: qsp.orgId,
                orgIz: qsp.orgIz,
                timerName: qsp.timerName,
                tgtTimeMs: parseInt(qsp.tgtTimeMs),
                //prefix: `${qsp.orgId}-${qsp.tgtTimeMs}-TestUpload-${qsp.timerName}`,
                prefix: `${qsp.tgtTimeMs}-TestRemote`,
            };

            await iotService.requestIotVideoUploadRaw(vr);
            return buildResponse({ requested: qsp.timerName });
        },
    },
    "/requestServerEpochMS": {
        permission: RoutePermission.CAN_CAPTURE_VIDEO,
        h: async (event) => {
            //var json = JSON.parse(event.body);
            const epochMs = new Date().getTime();

            log.debug("requestServerEpochMS:  gave: ", epochMs);
            return buildResponse({ epochMS: epochMs });
        },
    },
    "/requestS3PutObjectUrl": {
        permission: RoutePermission.CAN_CAPTURE_VIDEO,
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
            return buildResponse(
                await s3MediaService.requestS3PutObjectUrl(orgId, qsp)
            );
        },
    },
    "/manageDiscord": {
        permission: RoutePermission.CAN_MANAGE_DISCORD,
        h: async (event) => {
            const qsp = event.queryStringParameters;
            if (!qsp) {
                qsp = {};
            }
            const orgId = getOrgId(event);
            await discordUtils.launchEc2Bot(orgId);
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

async function getDerbyMainVersionInfo() {
    const parameterName = `/deploy/${process.env.DeployEnvironment}/git-breadcrumb`;
    const gitBreadcrumbParameterResponse = await ssmClient.send(
        new GetParameterCommand({ Name: parameterName })
    );
    const gitBreadcrumb = gitBreadcrumbParameterResponse.Parameter.Value;
    try {
        const { buildTime } = JSON.parse(gitBreadcrumb);
        const buildTimeMs = Number(buildTime);
        const monitorTestEndTimeMs = buildTimeMs + 10 * 60 * 1000;
        const nowMs = Date.now();
        if (nowMs >= buildTimeMs && nowMs <= monitorTestEndTimeMs) {
            log.error(
                "ERROR CloudWatch monitor test from getDerbyMainVersionInfo"
            );
        }
    } catch (err) {
        log.warn("Unable to parse git breadcrumb buildTime");
    }
    return {
        version: derbyMainVersion,
        gitBreadcrumb,
    };
}

function registerPublicRoutes(router) {
    router.register("/testArchive", {
        permission: RoutePermission.PUBLIC,
        loadContext: false,
        handler: async () => {
            await archiveUtils.processExpiringEventConfig();
            return buildResponse({ tested: "ok" });
        },
    });
    router.register("/listOrgEvents", {
        permission: RoutePermission.PUBLIC,
        loadContext: false,
        handler: async (event) => {
            const result = await ddbUtils.ddbListEventConfigByOrg(
                getOrgIz(event)
            );
            return buildResponse(result, "max-age=307");
        },
    });
    router.register("/listOrgConfig", {
        permission: RoutePermission.PUBLIC,
        loadContext: false,
        handler: async () => {
            const result = await ddbUtils.ddbQueryOrgConfig();
            return buildResponse(result, "max-age=1807");
        },
    });
    router.register("/getAwsConfig", {
        permission: RoutePermission.PUBLIC,
        loadContext: false,
        handler: async () => {
            const aYear = 3600 * 24 * 360; // client will change cacheBuster key if environment changes
            return buildResponse(
                JSON.parse(process.env.AwsCognitoSettingsJson),
                `max-age=${aYear}`
            );
        },
    });
    router.register("/getDerbyMainVersion", {
        permission: RoutePermission.PUBLIC,
        loadContext: false,
        handler: async () =>
            buildResponse(await getDerbyMainVersionInfo(), "max-age=120"),
    });
}

function registerCoreRoutes(router) {
    Object.entries(routeMap).forEach(([path, definition]) => {
        const { h, ...metadata } = definition;
        router.register(path, { ...metadata, handler: h });
    });
}

async function authenticateApiRequest(event) {
    let decodedJwt = { email: "Anonymous" };
    try {
        const payload = await jwtVerifier.verify(event.headers.authorization);
        if (payload && payload.email) decodedJwt = payload;
    } catch (err) {
        log.debug("Token not valid; continuing as Anonymous", err);
    }
    return {
        claims: decodedJwt,
        email: decodedJwt.email,
        by: decodedJwt["cognito:username"] || decodedJwt.email,
    };
}

async function loadApiRequestContext(event, principal) {
    const eventKey = getEventKey(event);
    const orgId = getOrgId(event);
    const orgIz = getOrgIz(event);
    const config = await ddbUtils.getEventConfig(eventKey, event.headers);
    const defaultTTL = await getTtl(config);
    const roleList = await getUserRoles(orgIz, principal.email);

    requestContext.setEntityFactory(
        new EntityFactory({
            orgId,
            byEmail: principal.email,
            TTL: defaultTTL,
        })
    );
    return { config, defaultTTL, eventKey, orgId, orgIz, roleList };
}

function authorizeApiRequest(permission, context, principal) {
    const allowed = Boolean(
        principal.email && hasPermission(context.roleList, permission)
    );
    log.debug(
        `${allowed ? "allowing" : "prohibiting"} access to permission ` +
            `${permission} for [${principal.email}]`
    );
    return allowed;
}

function createApiRouter() {
    return new ApiRouter({
        pathPrefix: "/app",
        authenticate: authenticateApiRequest,
        authorize: authorizeApiRequest,
        loadContext: loadApiRequestContext,
        buildResponse,
        isFrozen: frozenOrArchived,
        log,
    })
        .use(registerPublicRoutes)
        .use(registerCoreRoutes)
        .use((router) =>
            driverDelegationService.registerRoutes(router, { buildResponse })
        )
        .use((router) =>
            participantService.registerRoutes(router, { buildResponse })
        );
}

const apiRouter = createApiRouter();

async function snsApplyPbLogMessage(snsMessageJson, snsPublishedTimestamp) {
    // add ssml markup.  (svelte does this for manual announcements.)
    const paMessage = `<speak>${snsMessageJson.logMessage.message}</speak>`;
    const orgId = snsMessageJson.timerConfig.orgId;
    const announceResults = newAnnounceResults();
    const mp3ObjectPath = await announceResults.submitToPolly(paMessage, orgId);

    log.debug("snsApplyPbLogMessage: " + paMessage + " gave: ", mp3ObjectPath);

    await announceResults.propagateIotGeneric(orgId, mp3ObjectPath);
}
async function snsApplyPbTimerHandler(snsMessageJson, snsPublishedTimestamp) {
    log.debug(
        "snsApplyPbTimerHandler Message received from SNS2 pb:",
        snsPublishedTimestamp,
        snsMessageJson
    );
    log.debug(
        "snsApplyPbTimerHandler finishBlocks:",
        snsMessageJson.finishBlocks
    );
    log.debug("snsApplyPbTimerHandler newXmitMs:", snsMessageJson.newXmitMs);

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

    const rp = await getApplyableNextOnBlocks(
        parseInt(snsMessageJson.newXmitMs),
        snsPublishedTimestamp,
        finishLineBlock.timerConfig.orgId,
        finishLineBlock.timerConfig.orgIz
    );

    log.debug("snsApplyPbTimerHandler rp:", rp);
    //throw "snsApplyPbTimerHandler unfinished.";

    if (rp.cn[0] && !validNumericTime(l1Micros)) {
        throw `missing time [${l1Micros}] for car [${rp.cn}] in lane 1`;
    }
    if (rp.cn[1] && !validNumericTime(l2Micros)) {
        throw `missing time [${l2Micros}] for car [${rp.cn}] in lane 2`;
    }
    requestContext.setEntityFactory(
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
        phr: [dbFmtTimer(l1Micros), dbFmtTimer(l2Micros)],
    };
    log.debug("snsApplyPbTimerHandler formatted:", req);
    const applied = await raceProgressionService.applyFinishTime(req);
    log.debug("snsApplyPbTimerHandler aft rc:", applied);

    const fbJson = {
        PK: `${finishLineBlock.timerConfig.orgId}:RpElapsed`,
        SK: rp.SK,
        cn: rp.cn, //augment with car number(s)
        //fbList: JSON.stringify(finishLineBlockList),
        fbList: JSON.stringify(snsMessageJson.finishBlocks),
        TTL: rp.TTL,
    };
    await ddbUtils.ddbPut(fbJson, process.env.ElapsedTempDbTable);
}
function dbFmtTimer(rpiTime) {
    if (isNaN(rpiTime)) {
        return 0; // dynamo won't save NaN
    }
    return rpiTime;
}
function validNumericTime(rpiTime) {
    if (isNaN(rpiTime)) {
        return false;
    }
    if (!rpiTime) {
        return false;
    }
    return true;
}
async function snsApplyTimerHandler(snsMessageJson, snsPublishedTimestamp) {
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
        requestContext.setEntityFactory(
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
        const rp = await getApplyableNextOnBlocks(
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
            const applied = await raceProgressionService.applyFinishTime(req);
            log.debug("applyTimerHandler rc:", applied);
        }
    } else {
        log.debug("applyTimerHandler invalid msg:", json);
    }
}

async function getApplyableNextOnBlocks(
    recordMs,
    snsPublishedTimestamp,
    orgId,
    orgIz
) {
    const snsPubDate = Date.parse(snsPublishedTimestamp);

    const nextOnBlocks = await ddbUtils.ddbQueryRpNextOnBlocks(
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
async function apiGatewayHandler(event) {
    return apiRouter.dispatch(event);
}
async function listOrgUser(event, apiProps) {
    const rolesByOrg = await ddbUtils.ddbQueryOrgPerms({
        orgIz: apiProps.orgIz,
    });
    return rolesByOrg;
}
async function addOrgUser(json, apiProps) {
    log.debug("addOrgUser: " + JSON.stringify(json));

    if (json.email) {
        json.email = json.email.trim();
    }
    const orgId = json.orgId || apiProps.orgId;
    const displayName = json.displayName || json.dn;
    if (json.email && json.orgIz && json.roleList && orgId && displayName) {
        json.PK = json.orgIz + ":OrgPerm"; // force OrgPerm
        json.SK = json.email;
        const tmpEntityFactory = requestContext.getEntityFactory().copyWith({
            orgIz: json.orgIz,
            orgId: undefined,
            TTL: undefined,
        });
        requestContext.setEntityFactory(tmpEntityFactory);

        const orgPermResult = await ddbUtils.addSingle(json);
        const userDisplayNameResult = await refreshUserDisplayNamesFromOrgPerm({
            orgIz: json.orgIz,
            orgId,
        });

        return {
            status:
                orgPermResult.status === "ok" &&
                userDisplayNameResult.status === "ok"
                    ? "ok"
                    : "error",
            orgPermResult,
            userDisplayNameResult,
        };
    } else {
        return { error: "missing field(s)" };
    }
}
async function refreshUserDisplayNamesFromOrgPerm(json) {
    log.debug("refreshUserDisplayNamesFromOrgPerm: " + JSON.stringify(json));

    const orgIz = json.orgIz;
    const orgId = json.orgId;
    if (!orgIz || !orgId) {
        return { error: "missing field(s)" };
    }

    const orgIzList = orgIz === "" ? [""] : ["", orgIz];
    const orgPermGroups = await Promise.all(
        orgIzList.map((orgIzForQuery) =>
            ddbUtils.ddbQueryOrgPerms({ orgIz: orgIzForQuery })
        )
    );
    for (const orgPermGroup of orgPermGroups) {
        if (!Array.isArray(orgPermGroup)) {
            return orgPermGroup;
        }
    }
    const orgPerms = orgPermGroups.flat();

    const bulk = [];
    let skipped = 0;
    for (const orgPerm of orgPerms) {
        const displayName = orgPerm.displayName || orgPerm.dn;
        if (!orgPerm.SK || !displayName) {
            skipped += 1;
            continue;
        }

        bulk.push({
            PK: "UserDisplayName",
            orgId,
            SK: requestContext.getEntityFactory().getHashFromEmail(orgPerm.SK),
            displayName,
        });
    }
    const bulkResult = bulk.length
        ? await ddbUtils.addBulk({ bulk })
        : { status: "ok", count: 0 };

    return {
        status: bulkResult.status,
        created: bulkResult.count,
        skipped,
        total: orgPerms.length,
        bulkResult,
    };
}
async function getUserRoles(orgIz, email) {
    const roleList = [];
    const orgPerms = await getUserRolesForOrgIz(orgIz, email);
    const globalPerms = await getUserRolesForOrgIz("", email);
    roleList.push(...orgPerms, ...globalPerms);
    return [...new Set(roleList)];
}
async function getUserRolesForOrgIz(orgIz, email) {
    var rolesByUser = await ddbUtils.ddbQueryOrgPerms({ orgIz: orgIz });
    log.debug(`rolesByUser event [${orgIz}:${email}]`, rolesByUser);

    if (!email || !rolesByUser || !rolesByUser.length) {
        return [];
    }
    rolesByUser = rolesByUser.filter(
        (ouser) => ouser.SK.toLowerCase() === email.toLowerCase()
    );
    if (rolesByUser && rolesByUser.length > 0 && rolesByUser[0].roleList) {
        return rolesByUser[0].roleList;
    }
    return [];
}
function lowercaseHeaders(event) {
    var headerKeys = Object.keys(event.headers);

    headerKeys.forEach((headerKey) => {
        if (headerKey !== headerKey.toLowerCase()) {
            event.headers[headerKey.toLowerCase()] = event.headers[headerKey];
        }
    });
}
async function lambdaHandler(event) {
    log.debug("Received event:", JSON.stringify(event, null, 4));
    if (event && event.path) {
        // api gateway format v1
        lowercaseHeaders(event);
        //log.debug("Modified event:", JSON.stringify(event, null, 4));
        const response = await apiGatewayHandler(event);
        return response;
    }
    if (event && event.rawPath) {
        // api gateway format v2 (lambda function url!)
        event.path = event.rawPath;
        const response = await apiGatewayHandler(event);
        return response;
    }

    if (event.source == "aws.events") {
        log.debug("handling archive rulefrom cron0");
        await archiveUtils.processExpiringEventConfig();
        return;
    }

    if (event.Records[0].Sns) {
        var snsMessage = event.Records[0].Sns.Message;
        const snsMessageJson = JSON.parse(snsMessage);
        log.debug(
            "snsTopic: ",
            snsMessageJson.snsTopicArn,
            " snsMessageJson:  ",
            snsMessageJson
        );

        log.debug("sns message: : ", snsMessageJson);
        // ugly workaround for cron events not invoking lambda directly
        //   12/2020 pressing polly sns topic back into use to deliver the cron event for archival
        if (snsMessageJson && snsMessageJson.source === "aws.events") {
            log.debug("handling archive poll from cron1");
            await archiveUtils.processExpiringEventConfig();

            return;
        }

        log.debug("sns topic: : ", snsMessageJson.snsTopicArn);
        log.debug("sns polly arn: : ", process.env.PollyCompleteSnsArn);
        if (snsMessageJson.snsTopicArn === process.env.PollyCompleteSnsArn) {
            log.debug("polly finished: ", snsMessageJson);
            await newAnnounceResults().propagateIotFromSns(snsMessageJson);
            return "Polly Success";
        }
        const snsTimestamp = event.Records[0].Sns.Timestamp;
        try {
            if (false) {
            } else if (snsMessageJson.recordType === "protobufFinishBlock") {
                await snsApplyPbTimerHandler(snsMessageJson, snsTimestamp);
            } else if (snsMessageJson.recordType === "protobufLogMessage") {
                await snsApplyPbLogMessage(snsMessageJson, snsTimestamp);
            } else {
                await snsApplyTimerHandler(snsMessageJson, snsTimestamp);
            }
            return "Success";
        } catch (err) {
            log.debug("snsApplyFinishError Error : ", err);
            return "SNS Error";
        }
    }
    if (event.Records[0].s3) {
        const s3Event = event.Records[0].s3;
        log.debug("s3 trigger:", s3Event);

        const sourceKey = decodeS3EventKey(s3Event.object.key);
        var basefile = path.basename(sourceKey);
        const tgtFile = basefile.replace("-", "/");
        const s3CopyParams = {
            CopySource: encodeS3CopySource(s3Event.bucket.name, sourceKey),
            Key: `media/${tgtFile}`,
            Bucket: process.env.DstBucket,
        };
        log.debug("s3 mp4 copyParams:", s3CopyParams);
        const s3copyDone = await s3Client.send(
            new CopyObjectCommand(s3CopyParams)
        );
        log.debug("s3 mp4 copyDone:", s3copyDone);

        const webmSrcKey = `inputs/${basefile}`.replace(".mp4", ".webm");
        const webmTgtKey = tgtFile.replace(".mp4", ".webm");
        const s3CopyParamsWebm = {
            CopySource: encodeS3CopySource(
                process.env.s3VideoWatch,
                webmSrcKey
            ),
            Key: `media/${webmTgtKey}`,
            Bucket: process.env.DstBucket,
        };
        log.debug("s3 webm copyParams:", s3CopyParamsWebm);
        const s3copyDoneWebm = await s3Client.send(
            new CopyObjectCommand(s3CopyParamsWebm)
        );
        log.debug("s3 webm copyDone:", s3copyDoneWebm);
        return "s3 success";
    }

    log.debug("unknown event: ", event);
    return "Error";
}

exports.handler = async function (event) {
    return requestContext.run(async () => {
        requestContext.reset();
        try {
            return await lambdaHandler(event);
        } finally {
            requestContext.reset();
        }
    });
};

// changed.
