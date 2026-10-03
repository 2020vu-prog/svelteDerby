"use strict";

const log = require("loglevel");
const { AttachPrincipalPolicyCommand } = require("@aws-sdk/client-iot");
const {
    IoTDataPlaneClient,
    PublishCommand: IotPublishCommand,
} = require("@aws-sdk/client-iot-data-plane");

/**
 * IoT operations for the derbyMain Lambda: attaching device policies,
 * publishing video-upload requests, and answering /iot/discover. Extracted
 * from derbyMain.js (step 2 of docs/TODO/DerbyMainRefactorProposal.md); the
 * method bodies are unchanged apart from reaching their collaborators through
 * `this`.
 */
class IotService {
    /**
     * @param iotClient the IoT control-plane client (IoTClient)
     * @param ddbUtils the DdbUtils instance
     * @param createIotDataClient builds the IoT data-plane client for an
     *   endpoint URL; injectable so tests do not create a real client
     */
    constructor(
        iotClient,
        ddbUtils,
        createIotDataClient = (endpoint) => new IoTDataPlaneClient({ endpoint })
    ) {
        this.iotClient = iotClient;
        this.ddbUtils = ddbUtils;
        this.createIotDataClient = createIotDataClient;
        // The data-plane client is created lazily, on the first publish.
        this.iotdata = "";
    }

    async attachPrincipalPolicy(policyName, principal) {
        try {
            const data = await this.iotClient.send(
                new AttachPrincipalPolicyCommand({
                    policyName: policyName,
                    principal: principal,
                })
            );
            log.debug("attachPrincipalPolicy Data", data);
        } catch (err) {
            log.debug("attachPrincipalPolicy Error", err);
        }
    }

    getLowestPhrMillis(rp) {
        const lowest = Math.min(rp.phr);
        return Math.floor(lowest / 1000); // micros->millis
    }
    async requestIotVideoUploadByRP(tgtRp) {
        let tgtTimeMs = this.getLowestPhrMillis(tgtRp);
        if (!tgtTimeMs) {
            // allow capture to proceed.... helpful for testing...
            tgtTimeMs = Date.now();
            //return;
        }
        const timerName = "Finish"; //finish timer
        const vr = {
            orgId: tgtRp.orgId,
            orgIz: tgtRp.orgIz,
            tgtTimeMs: tgtTimeMs,
            timerName,
            prefix: `RP-${tgtRp.SK}`,
        };
        await this.requestIotVideoUploadRaw(vr);
    }
    async requestIotVideoUploadRaw(videoRequest) {
        if (!this.iotdata) {
            // first time
            this.iotdata = this.createIotDataClient(
                `https://${process.env.IotEndpoint}`
            );
        }
        const payload = {
            ...videoRequest,
            issuedMs: Date.now(),
        };
        const params = {
            topic: `derby/${videoRequest.orgId}/video/${videoRequest.timerName}`,
            payload: JSON.stringify(payload),
            qos: 0,
        };
        try {
            log.debug("requestIotVideoUpload request:", params);
            var data = await this.iotdata.send(new IotPublishCommand(params));
            log.debug("requestIotVideoUpload Success.", params);
            return { status: "ok", detail: "Published" };
        } catch (err) {
            log.debug("requestIotVideoUpload Error.", err);
            log.debug(err, err.stack); // an error occurred
            return { error: err };
        }
    }

    async iotDefaultPri(event) {
        let backendPri = 5;

        const environ = process.env.DeployEnvironment;
        if (environ.search(/test/i) >= 0) {
            backendPri = 100;
        }
        if (environ.search(/stage/i) >= 0) {
            backendPri = 200;
        }
        if (environ.search(/go-derby-prod/i) >= 0) {
            backendPri = 500;
        }
        return backendPri;
    }
    async iotOverridePri(event) {
        const discoverOvrd = await this.ddbUtils.ddbQueryRawPkSk(
            `DiscoverTimerOverride`,
            event.headers["x-rr1-timer"],
            process.env.TimerProtobufDbArn
        );
        log.debug("iotOverridePri: ddbRC:", discoverOvrd);

        if (
            discoverOvrd &&
            discoverOvrd.Items.length &&
            discoverOvrd.Items[0].pri
        ) {
            log.debug("iotOverridePri: using:", discoverOvrd.Items[0].pri);
            return discoverOvrd.Items[0].pri.N;
        }
        return 0;
    }
    async iotDiscover(event, apiProps) {
        const backendPri = Math.max(
            await this.iotDefaultPri(event),
            await this.iotOverridePri(event)
        );

        return {
            priority: backendPri,
            backends: [
                "go.rr1.us",
                "cf.test.rr1.us",
                "test.rr1.us",
                "stage.rr1.us",
                "cf.www.rr1.us",
                "c.comicNotARealDomainButKKindOfLongish",
            ],
            authUrl: `${process.env.IotPiAccessUrl}iot/auth`,
            bundleUrl: "https://cf.test.rr1.us/gpsRelay.tar.zst",
        };
        //authUrl: "https://xcfoeorhj5s4ubgaawz2rv45re0nxyqh.lambda-url.us-east-2.on.aws/iot/auth",
    }
}

module.exports = IotService;
