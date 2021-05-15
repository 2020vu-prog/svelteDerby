const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const mainZello = require("./index");
const AWS = require("aws-sdk");

const s3 = new AWS.S3();

module.exports.zelloStream = async (event, context) => {
    if (!event.Records) {
        console.log("not an s3 invocation!");
        return;
    }
    for (const record of event.Records) {
        if (!record.s3) {
            console.log("not an s3 invocation!");
            continue;
        }
        if (!record.s3.object.key.endsWith(".opus")) {
            console.log(`skipping [${record.s3.object.key}] not an opus`);
            continue;
        }
        // get the file
        const s3Object = await s3
            .getObject({
                Bucket: record.s3.bucket.name,
                Key: record.s3.object.key,
            })
            .promise();
        // write file to disk
        const tmpFile = "/tmp/announce.opus"; // TODO: mktemp?
        //writeFileSync(`/tmp/${record.s3.object.key}`, s3Object.Body);
        writeFileSync(tmpFile, s3Object.Body);

        console.log("TODO: stream to zello x!");
        // TODO: stream to zello
        //const mzRc = await mainZello(`/tmp/${record.s3.object.key}`);
        const mzRc = await mainZello(tmpFile);
        console.log("DONE: stream to zello mzRc:", mzRc);
        unlinkSync(tmpFile);
    }
};
