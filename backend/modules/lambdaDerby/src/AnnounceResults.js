class AnnounceResults {
    AWS = null;
    iotdata;

    constructor(AWS) {
        this.AWS = AWS;
    }

    // invoked on callback with known mp3 file.
    async propagateIot(json) {
        console.log("Iot Begin broadcast:", json);
        var orgId = json.outputUri.replace(/.*media\//, "");
        console.log(`orgId1: ${orgId}`);
        orgId = orgId.replace(/\/.*/, "");
        console.log(`orgId2: ${orgId}`);
        if (!this.iotdata) {
            // first time
            this.iotdata = new this.AWS.IotData({
                endpoint: process.env.IotEndpoint,
            });
        }
        const params = {
            topic: `derby/${orgId}/pa`,
            payload: JSON.stringify(json),
            qos: 0,
        };
        try {
            var data = await this.iotdata.publish(params).promise();
            console.log("Iot PA broadcast Success.", params);
            return { status: "ok", detail: "Published" };
        } catch (err) {
            console.log("Iot PA Error.", err);
            console.log(err, err.stack); // an error occurred
            return { error: err };
        }
    }
    async submitToPolly(msg, orgId) {
        if (!this.AWS) {
            console.log("Polly unavailable. AWS is null");
            return;
        }
        var polly = new this.AWS.Polly({ apiVersion: "2016-06-10" });
        var params = {
            OutputFormat: "mp3",
            OutputS3BucketName: process.env.DstBucket /*required */,
            Text: msg,
            VoiceId: "Joanna",
            Engine: "standard",
            LanguageCode: "en-US",
            OutputS3KeyPrefix: `media/${orgId}/msg`,
            SampleRate: "8000",
            SnsTopicArn: process.env.PollyCompleteSnsArn,
            TextType: "text",
        };
        try {
            const pollyTask = await polly
                .startSpeechSynthesisTask(params)
                .promise();
            console.log("pollyTask ok:", pollyTask); // successful response
        } catch (err) {
            console.log("pollyTask err:", err); // successful response
        }
    }
    announceResults(tgtRs) {
        var rc = "";
        var aPhaseMsg = "";
        var aWinCarNumber = "";
        var bWinCarNumber = "";
        var overallWinCarNumber = "";
        var aPhaseMsg = "";
        var bPhaseMsg = "";
        var overallMsg = "";
        [aWinCarNumber, aPhaseMsg] = this.formatMsg(
            "Phase AE ",
            tgtRs.carNumbers,
            tgtRs.phase1DeltaMS
        );

        if (tgtRs.phase1DeltaMS && !tgtRs.phase2DeltaMS) {
            rc += aPhaseMsg;
            return rc;
        }
        if (tgtRs.phase2DeltaMS) {
            [bWinCarNumber, bPhaseMsg] = this.formatMsg(
                "Phase B ",
                tgtRs.carNumbers,
                tgtRs.phase2DeltaMS
            );
            [overallWinCarNumber, overallMsg] = this.formatMsg(
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
            } else if (bWinCarNumber === overallWinCarNumber) {
                rc +=
                    " That is enough ... " +
                    this.expandDigitsForSpeech(bWinCarNumber.toString());
            } else {
                rc += " However, that is not enough ... ";
            }
            rc += overallMsg;
        }
        console.log("ANNOUNCEMENT RESULT: ", rc);
        return rc;
    }
    expandDigitsForSpeech(cn) {
        return String(cn).replace("", " ");
    }
    formatMsg(phaseDescriptor, cnArray, phaseResultMS) {
        var returnCarNumber = "";
        var returnMessage = "";
        if (phaseResultMS == 0) {
            returnMessage += " THE " + phaseDescriptor + " Result is a Tie. ";
        }
        if (phaseResultMS < 0) {
            returnCarNumber = cnArray[1];
            returnMessage += this.formatMsgWithCar(
                returnCarNumber,
                phaseDescriptor,
                phaseResultMS
            );
        }
        if (phaseResultMS > 0) {
            returnCarNumber = cnArray[0];
            returnMessage += this.formatMsgWithCar(
                returnCarNumber,
                phaseDescriptor,
                phaseResultMS
            );
        }
        returnMessage += " ";
        return [returnCarNumber, returnMessage];
    }
    formatMsgWithCar(winningCar, phaseDescriptor, phaseResultMS) {
        var rc = "";
        const spokenCar = this.expandDigitsForSpeech(winningCar.toString());
        const spokenDriver = this.getDrivenByPhoneticName(winningCar);
        rc += `Your ${phaseDescriptor} Winner is Car ${spokenCar}, ${spokenDriver}`;
        rc += " ... ";
        const spokenTime = this.expandDigitsForSpeech(Math.abs(phaseResultMS));
        //TODO: %03d
        rc += ` The ${phaseDescriptor} time is ${spokenTime} `;
        rc += " ... ";
        return rc;
    }

    getDrivenByPhoneticName(winningCar) {
        var phoneticName = ""; //racerCache.lookupPhoneticName(winningCar);
        //TODO: lookup phoenetic name
        // lousy hack for missing phonetic name on db.
        if (phoneticName) {
            return ` driven by ${phoneticName} `;
        }
        return "";
    }
}

module.exports = AnnounceResults;
