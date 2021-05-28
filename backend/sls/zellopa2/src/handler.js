const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const mainZello = require("./index");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

var fileCount = 0;
const s3 = new AWS.S3();

console.log("zelloPA2:INIT:init"); // used to detect coldstart!
const opusDir = "/tmp/opus";
if (!fs.existsSync(opusDir)) {
    fs.mkdirSync(opusDir);
}

async function cleanOldFiles() {
    try {
        const arrayOfFiles = fs.readdirSync(opusDir);
        console.log("stale:", arrayOfFiles);
    } catch (e) {
        console.log("stale error:", e);
    }
}
// empty opus file is used to trigger lambda restart.
//   it will fire a couple extra times (re-try).
//   since there is no audio, the users shouldn't notice.
//   (other than hopefully it starts working again.)
function potentiallyAbortLambdaWhenZelloIsActingUp(s3Object) {
    if (s3Object.ContentLength == 0) {
        console.log("zelloPA2:INIT:exit"); // used to detect coldstart!
        process.exit(99); // hoping to abort lambda instance and force cold start
    }
}
module.exports.zelloStream = async (event, context) => {
    console.log("zelloPA2:INIT:streamopus: ", fileCount++); // used to detect coldstart!
    console.log("stale0");
    cleanOldFiles(); // intentionally not awaited
    console.log("stale1");

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

        potentiallyAbortLambdaWhenZelloIsActingUp(s3Object);

        // write file to disk
        const utmp = uuidv4();
        const tmpFile = `${opusDir}/${utmp}.opus`;
        //writeFileSync(`/tmp/${record.s3.object.key}`, s3Object.Body);
        writeFileSync(tmpFile, s3Object.Body);

        const mzRc = await mainZello(tmpFile);
        console.log("DONE: stream to zello mzRc:", mzRc);
        unlinkSync(tmpFile);
    }
};
