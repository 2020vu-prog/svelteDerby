const crypto = require("crypto");
const EntityFactory = require("./shared/EntityFactory.js");

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
        console.log("Iot Begin broadcast:", json);
        var orgId = json.outputUri.replace(/.*media\//, "");
        console.log(`orgId1: ${orgId}`);
        orgId = orgId.replace(/\/.*/, "");
        console.log(`orgId2: ${orgId}`);
        await this.propagateIotGeneric(orgId, json.outputUri);
    }

    // invoked on callback with known mp3 file.
    async propagateIotGeneric(orgId, mp3Path) {
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
            console.log("Iot PA broadcast request:", params);
            var data = await this.iotdata.publish(params).promise();
            console.log("Iot PA broadcast Success.", params);
            return { status: "ok", detail: "Published" };
        } catch (err) {
            console.log("Iot PA Error.", err);
            console.log(err, err.stack); // an error occurred
            return { error: err };
        }
    }
    async submitToPolly(msg, orgId, mediaPrefix) {
        if (!this.AWS) {
            console.log("Polly unavailable. AWS is null");
            return;
        }
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
            VoiceId: "Joanna",
        };
        try {
            const pollySpeech = await polly.synthesizeSpeech(params).promise();
            console.log(`pollySpeech ok: ${pollySpeech.RequestCharacters}`); // successful response
            const s3 = new this.AWS.S3({ apiVersion: "2006-03-01" });

            const now = new Date().getTime();
            var s3Params = {
                Body: pollySpeech.AudioStream,
                Bucket: process.env.DstBucket,
                Key: `media/${orgId}/msg/${now}.mp3`,
            };

            console.log(`pollySpeech s3 saving:`, s3Params); // successful response
            const data = await s3.putObject(s3Params).promise();
            console.log(`pollySpeech s3 saved:`, data); // successful response

            return s3Params.Key;
            /*
            data = {
                AudioStream: <Binary String>, 
                ContentType: "audio/mpeg", 
                RequestCharacters: 37
               }
               */
        } catch (err) {
            console.log("pollySpeech err:", err); // successful response
        }
    }
    async formatAndSubmitNextOnBlocks(tgtRs, tgtRp) {
        console.log("formatAndSubmitNextOnBlocks rs: ", tgtRs, " rp: ", tgtRp);
        const orgId = tgtRs.orgId;
        const mediaPrefix = this.getMediaPrefix(tgtRp);
        const paMessage = await this.formatNextOnBlockAnnouncement(
            orgId,
            tgtRs,
            tgtRp
        );
        console.log(`paMessage: ${orgId} ssml:`, paMessage);
        const mp3ObjectPath = await this.submitToPolly(
            paMessage,
            orgId,
            mediaPrefix
        );
        console.log("mp3ObjectPath:", mp3ObjectPath);
        await this.propagateIotGeneric(orgId, mp3ObjectPath);
    }
    async formatAndSubmitResults(tgtRs, tgtRp) {
        const orgId = tgtRs.orgId;
        const mediaPrefix = this.getMediaPrefix(tgtRp);

        const paMessage = await this.formatResultAnnouncement(tgtRs, orgId);
        console.log(`paMessage: ${orgId} ssml:`, paMessage);
        const mp3ObjectPath = await this.submitToPolly(
            paMessage,
            orgId,
            mediaPrefix
        );
        console.log("mp3ObjectPath:", mp3ObjectPath);
        await this.propagateIotGeneric(orgId, mp3ObjectPath);
    }
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
        console.log(`lookupNames: ${orgId} cars:`, this.namesByCarNumber);
    }
    async lookupName(carNumber, orgId) {
        if (this.ddbUtils) {
            const ptcp = await this.ddbUtils.ddbQueryPkSk(
                `${orgId}:PTCP`,
                carNumber
            );
            console.log(`lookupName: ${carNumber} org: ${orgId}`, ptcp);
            if (ptcp) {
                const entityFactory = new EntityFactory({});
                var ptcpEntity = entityFactory.build(ptcp);
                this.namesByCarNumber[carNumber] = ptcpEntity.ssmlName;
            }
        } else {
            console.log(`lookupName: missing name query ${carNumber}`);
        }
    }

    async formatNextOnBlockAnnouncement(orgId, tgtRs, tgtRp) {
        await this.lookupNames(tgtRp.carNumbers, orgId);
        var rc = "";

        const spokenCarAndDriver1 = this.getSpokenCarAndDriver(
            tgtRp.carNumbers[0]
        );
        const spokenCarAndDriver2 = this.getSpokenCarAndDriver(
            tgtRp.carNumbers[1]
        );
        const spokenPhase = this.expandPhaseForSpeech(tgtRp.pl);
        rc += `Attention race fans! Next up ${spokenPhase}. In lane 1, is ${spokenCarAndDriver1}. In lane 2, is${spokenCarAndDriver2}`;
        const ssml = `<speak>${rc}</speak>`;
        console.log("NOB ANNOUNCEMENT RESULT ssml: ", ssml);
        return ssml;
    }
    async formatResultAnnouncement(tgtRs, orgId) {
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
            this.expandPhaseForSpeech("A"),
            tgtRs.carNumbers,
            tgtRs.phase1DeltaMS
        );

        if (isDefined(tgtRs.phase1DeltaMS) && !isDefined(tgtRs.phase2DeltaMS)) {
            rc += aPhaseMsg;
        }
        if (isDefined(tgtRs.phase2DeltaMS)) {
            [bWinCarNumber, bPhaseMsg] = this.formatResultMsg(
                this.expandPhaseForSpeech("B"),
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
        console.log("ANNOUNCEMENT RESULT ssml: ", ssml);
        return ssml;
    }
    expandPhaseForSpeech(pl) {
        return `Phase <say-as interpret-as="characters" >${pl}</say-as>`;
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
        const spokenDriver = this.getDrivenByPhoneticName(carNumber);
        return ` Car ${spokenCar}, ${spokenDriver} `;
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
