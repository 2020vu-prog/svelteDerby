"use strict";
const path = require("path");
const log = require("loglevel");
const { CopyObjectCommand } = require("@aws-sdk/client-s3");
const { decodeS3EventKey, encodeS3CopySource } = require("./S3Utils");

// The outermost Lambda trigger adapter: works out which kind of event
// invoked the function (API Gateway v1 or v2, EventBridge cron, SNS, or S3)
// and hands it to the right collaborator.
class LambdaEventDispatch {
    constructor({
        apiRouter,
        archiveUtils,
        newAnnounceResults,
        snsFinishTimeIngestion,
        s3Client,
    }) {
        this.apiRouter = apiRouter;
        this.archiveUtils = archiveUtils;
        this.newAnnounceResults = newAnnounceResults;
        this.snsFinishTimeIngestion = snsFinishTimeIngestion;
        this.s3Client = s3Client;
    }

    async apiGatewayHandler(event) {
        return this.apiRouter.dispatch(event);
    }
    lowercaseHeaders(event) {
        var headerKeys = Object.keys(event.headers);

        headerKeys.forEach((headerKey) => {
            if (headerKey !== headerKey.toLowerCase()) {
                event.headers[headerKey.toLowerCase()] =
                    event.headers[headerKey];
            }
        });
    }
    async dispatch(event) {
        log.debug("Received event:", JSON.stringify(event, null, 4));
        if (event && event.path) {
            // api gateway format v1
            this.lowercaseHeaders(event);
            //log.debug("Modified event:", JSON.stringify(event, null, 4));
            const response = await this.apiGatewayHandler(event);
            return response;
        }
        if (event && event.rawPath) {
            // api gateway format v2 (lambda function url!)
            event.path = event.rawPath;
            const response = await this.apiGatewayHandler(event);
            return response;
        }

        if (event.source == "aws.events") {
            log.debug("handling archive rulefrom cron0");
            await this.archiveUtils.processExpiringEventConfig();
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
                await this.archiveUtils.processExpiringEventConfig();

                return;
            }

            log.debug("sns topic: : ", snsMessageJson.snsTopicArn);
            log.debug("sns polly arn: : ", process.env.PollyCompleteSnsArn);
            if (
                snsMessageJson.snsTopicArn === process.env.PollyCompleteSnsArn
            ) {
                log.debug("polly finished: ", snsMessageJson);
                await this.newAnnounceResults().propagateIotFromSns(
                    snsMessageJson
                );
                return "Polly Success";
            }
            const snsTimestamp = event.Records[0].Sns.Timestamp;
            try {
                if (false) {
                } else if (
                    snsMessageJson.recordType === "protobufFinishBlock"
                ) {
                    await this.snsFinishTimeIngestion.snsApplyPbTimerHandler(
                        snsMessageJson,
                        snsTimestamp
                    );
                } else if (snsMessageJson.recordType === "protobufLogMessage") {
                    await this.snsFinishTimeIngestion.snsApplyPbLogMessage(
                        snsMessageJson,
                        snsTimestamp
                    );
                } else {
                    await this.snsFinishTimeIngestion.snsApplyTimerHandler(
                        snsMessageJson,
                        snsTimestamp
                    );
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
            const s3copyDone = await this.s3Client.send(
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
            const s3copyDoneWebm = await this.s3Client.send(
                new CopyObjectCommand(s3CopyParamsWebm)
            );
            log.debug("s3 webm copyDone:", s3copyDoneWebm);
            return "s3 success";
        }

        log.debug("unknown event: ", event);
        return "Error";
    }
}

module.exports = LambdaEventDispatch;
