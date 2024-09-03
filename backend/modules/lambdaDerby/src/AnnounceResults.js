const crypto = require("crypto");
const EntityFactory = require("./shared/EntityFactory.js");
const log = require("loglevel");

function isDefined(x) {
    return !(typeof x === "undefined" || x === null);
}
class AnnounceResults {
    AWS = null;
    iotdata;
    ddbUtils = null;
    namesByCarNumber = {};

    constructor(AWS, ddbUtils) {
        this.AWS = AWS;
        this.ddbUtils = ddbUtils;
    }

    async propagateIotFromSns(json) {
        log.debug("Iot Begin broadcast:", json);
        var orgId = json.outputUri.replace(/.*media\//, "");
        log.debug(`orgId1: ${orgId}`);
        orgId = orgId.replace(/\/.*/, "");
        log.debug(`orgId2: ${orgId}`);
        await this.propagateIotGeneric(orgId, json.outputUri);
    }

    // invoked on callback with known mp3 file.
    async propagateIotGeneric(orgId, mp3Path) {
        await this.propagateIotMqtt(orgId, mp3Path);
        await this.propagateIotZelloSns(orgId, mp3Path);
    }
    async getZelloChannelFromOrg(orgId) {
        const eventConfig = await this.ddbUtils.getEventConfig(orgId); // should resolve from cache, no IO wait.
        /*
        if (orgId.startsWith("chi.")) {
            return "AASBD Chicago P.A";
        }
        if (orgId.startsWith("Test.")) {
            return "AASBD Test P.A.";
        }
        */
        if (
            eventConfig &&
            eventConfig.paUri &&
            eventConfig.paUri.startsWith("zello:")
        ) {
            const zelloChannel = eventConfig.paUri.replace(/^zello:/i, "");
            log.debug("using zelloChannel:", zelloChannel);
            return zelloChannel;
        }

        log.debug("missing zelloChannel:", eventConfig);
        return null;
    }
    async propagateIotZelloSns(orgId, mp3Path) {
        const zelloChannel = await this.getZelloChannelFromOrg(orgId);
        const zelloArn = process.env.ZelloPushSnsArn;
        if (!zelloChannel) return;
        //const cnstring = json.stringify(jsonCalledNumbers);
        var params = {
            //Message: JSON.stringify(jsonCarNumbers),
            Message: mp3Path,
            TopicArn: zelloArn,
            Subject: `announcement for org: ${orgId}`,

            MessageAttributes: {
                orgId: {
                    DataType: "String",
                    StringValue: orgId,
                },
                zelloChannel: {
                    DataType: "String",
                    StringValue: zelloChannel,
                },
                path: {
                    DataType: "String",
                    StringValue: mp3Path,
                },
                bucket: {
                    DataType: "String",
                    StringValue: process.env.DstBucket,
                },
            },
        };

        try {
            console.log("SNS sending zelloArn:", params);
            const sent = await new this.AWS.SNS({ apiVersion: "2010-03-31" })
                .publish(params)
                .promise();
            console.log("SNS send Success", sent);
        } catch (err) {
            console.log("SNS send Error", err);
        }
    }
    async propagateIotMqtt(orgId, mp3Path) {
        if (!this.iotdata) {
            // first time
            this.iotdata = new this.AWS.IotData({
                endpoint: process.env.IotEndpoint,
            });
        }
        const payload = { outputUri: "/" + mp3Path };
        const params = {
            topic: `derby/${orgId}/pa`,
            payload: JSON.stringify(payload),
            qos: 0,
        };
        try {
            log.debug("Iot PA broadcast request:", params);
            var data = await this.iotdata.publish(params).promise();
            log.debug("Iot PA broadcast Success.", params);
            return { status: "ok", detail: "Published" };
        } catch (err) {
            log.debug("Iot PA Error.", err);
            log.debug(err, err.stack); // an error occurred
            return { error: err };
        }
    }
    randomPollyVoice() {
        const voices = ["Joanna", "Matthew"];
        const voice = voices[Math.floor(Math.random() * voices.length)];

        //return "Joanna";
        return voice;
    }
    async submitToPolly(msg, orgId, mediaPrefix) {
        if (!this.AWS) {
            log.debug("Polly unavailable. AWS is null");
            return;
        }
        if (msg.includes("ResetPollyAA466430-D313-488D-A485-22CC00FE84B0")) {
            console.log("Polly resetting zello. ");
            return this.saveToS3(orgId, ""); // empty file!
        }

        console.log("Polly msg: ", msg);
        var polly = new this.AWS.Polly({ apiVersion: "2016-06-10" });
        //OutputS3BucketName: process.env.DstBucket /*required */,
        //OutputS3KeyPrefix: `media/${orgId}/msg`,
        //SnsTopicArn: process.env.PollyCompleteSnsArn,
        var params = {
            Engine: "standard",
            LanguageCode: "en-US",
            OutputFormat: "mp3",
            SampleRate: "8000",
            Text: msg,
            TextType: "ssml",
            VoiceId: this.randomPollyVoice(),
        };
        try {
            const pollySpeech = await polly.synthesizeSpeech(params).promise();
            log.debug(`pollySpeech ok: ${pollySpeech.RequestCharacters}`); // successful response

            return this.saveToS3(orgId, pollySpeech.AudioStream);
        } catch (err) {
            log.debug("pollySpeech err:", err); // successful response
        }
    }
    async saveToS3(orgId, bytes) {
        const s3 = new this.AWS.S3({ apiVersion: "2006-03-01" });
        const now = new Date().getTime();
        var s3Params = {
            Body: bytes,
            Bucket: process.env.DstBucket,
            Key: `media/${orgId}/msg/${now}.mp3`,
        };

        log.debug(`pollySpeech s3 saving:`, s3Params); // successful response
        const s3Response = await s3.putObject(s3Params).promise();
        log.debug(`pollySpeech s3 saved:`, s3Response); // successful response
        return s3Params.Key;
    }
    async ttsAndPropagate(orgId, paMessage, mediaPrefix) {
        log.debug(`paMessage: ${orgId} ssml:`, paMessage);
        const mp3ObjectPath = await this.submitToPolly(
            paMessage,
            orgId,
            mediaPrefix
        );
        log.debug("mp3ObjectPath:", mp3ObjectPath);
        await this.propagateIotGeneric(orgId, mp3ObjectPath);
    }
    async formatAndSubmitCallToRace(tgtRs) {
        log.debug("formatAndSubmitCallToRace rs: ", tgtRs);
        const orgId = tgtRs.orgId;
        const mediaPrefix = this.getMediaPrefix(tgtRs);
        const paMessage = await this.formatCallToRaceAnnouncement(orgId, tgtRs);
        await this.ttsAndPropagate(orgId, paMessage, mediaPrefix);
    }
    async formatAndSubmitNextOnBlocks(tgtRs, tgtRp) {
        log.debug("formatAndSubmitNextOnBlocks rs: ", tgtRs, " rp: ", tgtRp);
        const orgId = tgtRp.orgId;
        const mediaPrefix = this.getMediaPrefix(tgtRp);
        const paMessage = await this.formatNextOnBlockAnnouncement(
            orgId,
            tgtRs,
            tgtRp
        );
        await this.ttsAndPropagate(orgId, paMessage, mediaPrefix);
    }
    async formatAndSubmitResults(tgtRs, tgtRp) {
        const orgId = tgtRs.orgId;
        const mediaPrefix = this.getMediaPrefix(tgtRp);

        const paMessage = await this.formatResultAnnouncement(tgtRs, orgId);
        await this.ttsAndPropagate(orgId, paMessage, mediaPrefix);
    }
    // parameter could be Rp or Rs
    getMediaPrefix(tgtRp) {
        var prefixSeed = 0;
        if (tgtRp && tgtRp.phr && tgtRp.phr.length > 0) {
            prefixSeed = Math.min(...tgtRp.phr);
        }
        if (prefixSeed == 0) {
            prefixSeed = tgtRp.SK;
        }
        const sha = crypto
            .createHash("sha256")
            .update(prefixSeed.toString())
            .digest("hex");
        return `SHA_${sha}`;

        //return sha.toString().replaceAll(/=/g, "");
    }
    async lookupNames(cnList, orgId) {
        const promises = [];
        cnList.forEach((element) => {
            promises.push(this.lookupName(element.toString(), orgId));
        });
        await Promise.all(promises);
        log.debug(`lookupNames: ${orgId} cars:`, this.namesByCarNumber);
    }
    async lookupName(carNumber, orgId) {
        if (!carNumber) {
            log.debug(`lookupName: SKIPPING: [${carNumber}] org: ${orgId}`);
            return;
        }
        if (this.ddbUtils) {
            const ptcp = await this.ddbUtils.ddbQueryPkSk(
                `${orgId}:PTCP`,
                carNumber
            );
            log.debug(`lookupName: ${carNumber} org: ${orgId}`, ptcp);
            if (ptcp) {
                const entityFactory = new EntityFactory({});
                var ptcpEntity = entityFactory.build(ptcp);
                this.namesByCarNumber[carNumber] = ptcpEntity.ssmlName;
            }
        } else {
            log.debug(`lookupName: missing name query ${carNumber}`);
        }
    }

    async formatCallToRaceAnnouncement(orgId, tgtRs) {
        await this.lookupNames(tgtRs.carNumbers, orgId);
        var rc = "";
        const [
            spokenCarAndDriver1,
            spokenCarAndDriver2,
        ] = tgtRs.carNumbers.map((cn) => this.getSpokenCarAndDriver(cn));

        rc += `Call to race for ${spokenCarAndDriver1}.<p/>  Call to Race for ${spokenCarAndDriver2}.`;
        const ssml = `<speak>${rc}</speak>`;
        log.debug("callToRace ANNOUNCEMENT ssml: ", ssml);
        return ssml;
    }
    async formatNextOnBlockAnnouncement(orgId, tgtRs, tgtRp) {
        await this.lookupNames(tgtRp.carNumbers, orgId);
        var rc = "";

        const spokenPhase = this.expandPhaseForSpeech(tgtRp.pl, tgtRp.pt);

        rc += `Attention race fans! Next up ${spokenPhase}. `;
        if (tgtRp.carNumbers[0]) {
            const spokenCarAndDriver = this.getSpokenCarAndDriver(
                tgtRp.carNumbers[0]
            );
            rc += ` In lane 1, is ${spokenCarAndDriver}.`;
        }
        if (tgtRp.carNumbers[1]) {
            const spokenCarAndDriver = this.getSpokenCarAndDriver(
                tgtRp.carNumbers[1]
            );
            rc += ` In lane 2, is ${spokenCarAndDriver}.`;
        }

        const ssml = `<speak>${rc}</speak>`.replace(
            new RegExp("  *", "g"),
            " "
        );

        log.debug("NOB ANNOUNCEMENT RESULT ssml: ", ssml);
        return ssml;
    }
    async formatResultAnnouncement(tgtRs, orgId) {
        console.log("formatResultAnnouncement:", tgtRs);
        var rc = "";
        var aPhaseMsg = "";
        var aWinCarNumber = "";
        var bWinCarNumber = "";
        var overallWinCarNumber = "";
        var aPhaseMsg = "";
        var bPhaseMsg = "";
        var overallMsg = "";

        await this.lookupNames(tgtRs.carNumbers, orgId);

        [aWinCarNumber, aPhaseMsg] = this.formatResultMsg(
            this.expandPhaseForSpeech("A", ""),
            tgtRs.carNumbers,
            tgtRs.phase1DeltaMS
        );

        if (isDefined(tgtRs.phase1DeltaMS) && !isDefined(tgtRs.phase2DeltaMS)) {
            rc += aPhaseMsg;
        }
        if (isDefined(tgtRs.phase2DeltaMS)) {
            [bWinCarNumber, bPhaseMsg] = this.formatResultMsg(
                this.expandPhaseForSpeech("B", ""),
                tgtRs.carNumbers,
                tgtRs.phase2DeltaMS
            );
            [overallWinCarNumber, overallMsg] = this.formatResultMsg(
                "Overall",
                tgtRs.carNumbers,
                tgtRs.phase1DeltaMS + tgtRs.phase2DeltaMS
            );
            rc += bPhaseMsg;
            if (
                bWinCarNumber &&
                aWinCarNumber &&
                aWinCarNumber === bWinCarNumber
            ) {
                //double phase, no interjection
            } else if (!aWinCarNumber && !bWinCarNumber) {
                // overall tie. leave out "enough"  (either way).  no interjection
            } else if (bWinCarNumber === overallWinCarNumber) {
                rc += " That is enough <p/> ";
            } else {
                rc += " However, that is not enough <p/> ";
            }
            rc += overallMsg;
        }

        const ssml = `<speak>${rc}</speak>`;
        log.debug("ANNOUNCEMENT RESULT ssml: ", ssml);
        return ssml;
    }
    expandPhaseForSpeech(pl, pt) {
        if (!pt || pt === "R") {
            return `Phase <say-as interpret-as="characters" >${pl}</say-as>`;
        }
        if (pt.startsWith("T")) {
            return `is a Trial Run`;
        }
        if (pt.startsWith("F")) {
            return `is a Fun Run`;
        }
        if (pt.startsWith("H")) {
            return `is a Hot Run`;
        }
        if (pt.startsWith("B")) {
            return `is a Bye Run`;
        }
        return "Unknown Phase Type";
    }
    expandDigitsForSpeech(cn) {
        return `<say-as interpret-as="characters" >${cn}</say-as>`;
    }
    formatResultMsg(phaseDescriptor, cnArray, phaseResultMS) {
        var returnCarNumber = "";
        var returnMessage = "";
        if (phaseResultMS == 0) {
            returnMessage += " The " + phaseDescriptor + " Result is a Tie. ";
        }
        if (phaseResultMS < 0) {
            returnCarNumber = cnArray[1];
            returnMessage += this.formatResultMsgWithCar(
                returnCarNumber,
                phaseDescriptor,
                phaseResultMS
            );
        }
        if (phaseResultMS > 0) {
            returnCarNumber = cnArray[0];
            returnMessage += this.formatResultMsgWithCar(
                returnCarNumber,
                phaseDescriptor,
                phaseResultMS
            );
        }
        returnMessage += " ";
        return [returnCarNumber, returnMessage];
    }
    getSpokenCarAndDriver(carNumber) {
        const spokenCar = this.expandDigitsForSpeech(carNumber.toString());
        let rc = ` Car ${spokenCar}`;
        const spokenDriver = this.getDrivenByPhoneticName(carNumber);
        if (spokenDriver) {
            rc += `, ${spokenDriver}`;
        }
        //return ` Car ${spokenCar}, ${spokenDriver} `;
        return rc;
    }
    formatResultMsgWithCar(winningCar, phaseDescriptor, phaseResultMS) {
        var rc = "";
        const spokenCarAndDriver = this.getSpokenCarAndDriver(winningCar);
        rc += `Your ${phaseDescriptor} Winner is ${spokenCarAndDriver}`;
        rc += " <p/> ";
        const spokenTime = this.expandDigitsForSpeech(
            Math.abs(phaseResultMS).toString().padStart(3, "0")
        );
        rc += ` The ${phaseDescriptor} time is ${spokenTime} `;
        rc += " <p/> ";
        return rc;
    }

    getDrivenByPhoneticName(carNumber) {
        var phoneticName = this.namesByCarNumber[carNumber.toString()];
        //TODO: lookup phoenetic name
        // lousy hack for missing phonetic name on db.
        if (phoneticName) {
            return `<break strength="weak"/> driven by ${phoneticName} `;
        }
        return "";
    }
}

module.exports = AnnounceResults;
