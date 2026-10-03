"use strict";

const log = require("loglevel");
const {
    ListObjectsV2Command,
    PutObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { getAllKeys } = require("./S3Utils");

/**
 * S3 operations behind the media and chart-list routes of the derbyMain
 * Lambda: listing chart types and media keys, and issuing presigned upload
 * URLs. Extracted from derbyMain.js (step 3 of
 * docs/TODO/DerbyMainRefactorProposal.md); the method bodies are unchanged
 * apart from reaching the S3 client through `this`.
 */
class S3MediaService {
    /**
     * @param s3Client the S3Client
     */
    constructor(s3Client) {
        this.s3Client = s3Client;
    }

    async s3QueryChartTypes() {
        var params = {
            Bucket: process.env.ChartS3BucketName,
            Prefix: "data/brackets",
        };
        try {
            const data = await this.s3Client.send(
                new ListObjectsV2Command(params)
            );
            return data;
        } catch (err) {
            log.debug("s3 list Error", err);
            return { error: "s3 list buckets Failed" };
        }
    }

    async s3QueryMediaPrefix(queryStringParameters) {
        const prefix = queryStringParameters.prefix
            ? queryStringParameters.prefix
            : "";
        const params = {
            Bucket: process.env.DstBucket,
            Prefix: `media/${prefix}`,
        };
        const allKeys = await getAllKeys(this.s3Client, params);
        log.debug("s3QueryMediaPrefix: ", params, allKeys);
        return allKeys;
    }

    async requestS3PutObjectUrl(orgId, qsp) {
        var bucket = "";
        var key = "";
        if (process.env.s3VideoWatch && true) {
            bucket = process.env.s3VideoWatch;
            key = `inputs/${orgId}-${qsp.key}`; // watch bucket won't see sub dirs :-(
        } else {
            bucket = process.env.DstBucket;
            key = `media/${orgId}/${qsp.key}`;
        }
        const mimeType = "video/webm";
        var params = {
            Bucket: bucket,
            Key: key,
            ContentType: mimeType,
        };
        var signedUrl = await getSignedUrl(
            this.s3Client,
            new PutObjectCommand(params),
            { expiresIn: 600 } // allow for slow video upload
        );
        log.debug("For params:", params, " The signed URL is", signedUrl);

        return {
            signedUrl: signedUrl,
            issuedMs: Date.now(),
        };
    }
}

module.exports = S3MediaService;
