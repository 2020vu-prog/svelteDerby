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
//const timer_protobuf_1 = require("timer_protobuf");
//    const timerConfig = new timer_protobuf_1.tutorial.TimerConfig();
//    console.log("tbp:",timer_protobuf_1.tutorial.TimerConfig.decode);

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
const { S3Client } = require("@aws-sdk/client-s3");
const { SNSClient } = require("@aws-sdk/client-sns");
const { SQSClient } = require("@aws-sdk/client-sqs");
const { SSMClient } = require("@aws-sdk/client-ssm");

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
const TimerConfigService = require("./TimerConfigService");
const EventConfigService = require("./EventConfigService");
const OrgUserService = require("./OrgUserService");
const SnsFinishTimeIngestion = require("./SnsFinishTimeIngestion");
const LambdaEventDispatch = require("./LambdaEventDispatch");
const { createResponseHelpers } = require("./response");
const { getShaCars } = require("./utils");
const requestContext = require("./RequestContext");

const { buildResponse, getDerbyMainVersionInfo } = createResponseHelpers({
    ssmClient,
    clientMinimumVersion,
    derbyMainVersion,
});

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
const timerConfigService = new TimerConfigService(ddbUtils);
const orgUserService = new OrgUserService({ ddbUtils, requestContext });
const snsFinishTimeIngestion = new SnsFinishTimeIngestion({
    ddbUtils,
    requestContext,
    raceProgressionService,
    newAnnounceResults,
});
const eventConfigService = new EventConfigService({
    ddbUtils,
    snsClient,
    logUtils,
    requestContext,
    timerConfigService,
    newAnnounceResults,
    orgUserService,
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
            return buildResponse(
                await orgUserService.getOrgRoles(event, apiProps)
            );
        },
    },
    "/addEventConfig": {
        permission: RoutePermission.POWER,
        allowFrozen: true, // not really allowing frozen, but skip edit.  race not yet existent.
        allowMissingTtl: true,
        h: async (event) => {
            return buildResponse(
                await eventConfigService.addEventConfig(event)
            );
        },
    },
    "/updateEventConfig": {
        permission: RoutePermission.POWER,
        h: async (event) => {
            return buildResponse(
                await eventConfigService.updateEventConfig(
                    JSON.parse(event.body)
                )
            );
        },
    },
    "/getActiveTimers": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        allowFrozen: true,
        h: async (event) => {
            return buildResponse(await timerConfigService.getSanitizedTimers());
        },
    },
    "/getActivePbTimers": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        allowFrozen: true,
        h: async (event) => {
            return buildResponse(await timerConfigService.getActivePbTimers());
        },
    },
    "/timerConfig": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        h: async (event) => {
            return buildResponse(
                await timerConfigService.addTimerConfig(
                    JSON.parse(event.body),
                    false
                )
            );
        },
    },
    "/timerPbConfig": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        h: async (event) => {
            return buildResponse(
                await timerConfigService.addTimerPbConfig(
                    JSON.parse(event.body),
                    false
                )
            );
        },
    },
    "/listOrgUser": {
        permission: RoutePermission.CAN_ADD_ORG_USER,
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event, apiProps) => {
            return buildResponse(
                await orgUserService.listOrgUser(event, apiProps)
            );
        },
    },
    "/addOrgUser": {
        permission: RoutePermission.CAN_ADD_ORG_USER,
        allowFrozen: true,
        allowMissingTtl: true,
        allowMissingOrgId: true,
        h: async (event, apiProps) => {
            return buildResponse(
                await orgUserService.addOrgUser(
                    JSON.parse(event.body),
                    apiProps
                )
            );
        },
    },
    "/addParticipant": {
        permission: RoutePermission.CAN_ADD_PARTICIPANT,
        h: async (event) => {
            return buildResponse(
                await eventConfigService.addParticipant2(JSON.parse(event.body))
            );
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
            var qr = await timerConfigService.queryTimerHistoryByOrgId(
                event.queryStringParameters
            );
            return buildResponse(qr);
        },
    },
    "/getTimerPbHistory": {
        permission: RoutePermission.CAN_TIMER_CONFIG,
        allowFrozen: true,
        h: async (event) => {
            var qr = await timerConfigService.queryTimerPbHistory(
                event.queryStringParameters
            );
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
            const qsp = event.queryStringParameters || {};
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
            const qsp = event.queryStringParameters || {};
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
            const qsp = event.queryStringParameters || {};
            const orgId = getOrgId(event);
            await discordUtils.launchEc2Bot(orgId);
        },
    },
};

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
    const roleList = await orgUserService.getUserRoles(orgIz, principal.email);

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
const lambdaEventDispatch = new LambdaEventDispatch({
    apiRouter,
    archiveUtils,
    newAnnounceResults,
    snsFinishTimeIngestion,
    s3Client,
});

exports.handler = async function (event) {
    return requestContext.run(async () => {
        requestContext.reset();
        try {
            return await lambdaEventDispatch.dispatch(event);
        } finally {
            requestContext.reset();
        }
    });
};

// changed.
