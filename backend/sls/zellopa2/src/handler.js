const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const { spawnSync } = require("child_process");
const mainZello = require("./index");
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

var fileCount = 0;
const s3 = new AWS.S3();
const lambda = new AWS.Lambda({ apiVersion: "2015-03-31" });

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
    console.log("event: ", JSON.stringify(event));

    if (!event.Records) {
        console.log("not a records  invocation!");
        return;
    }
    for (const record of event.Records) {
        if (record.Sns) {
            await convertAndAnnounce2(record.Sns);
            continue;
        }

        // deprecated s3 trigger 2021Jun2
        if (!record.s3) {
            console.log("not an s3 invocation!");
            continue;
        }
        if (!record.s3.object.key.endsWith(".opus")) {
            console.log(`skipping [${record.s3.object.key}] not an opus`);
            continue;
        }
        await announceFromS3(record.s3.bucket.name, record.s3.object.key);
    }
};
async function convertAndAnnounce(sns) {
    const mp3Key = sns.MessageAttributes.path.Value;
    const mp3Bucket = sns.MessageAttributes.bucket.Value;
    console.log(`convertAndAnnounce [${mp3Bucket} ${mp3Key}] `);

    const lambdaParams = {
        FunctionName: process.env.ZelloPa1LambdaArn,
        // RequestResponse is important here. Without it we won't get the result Payload
        InvocationType: "RequestResponse",
        LogType: "None", // other option is 'None'
        Payload: JSON.stringify({
            mp3Key: mp3Key,
            mp3Bucket: mp3Bucket,
        }),
    };
    const lambdaResult = await lambda.invoke(lambdaParams).promise();

    console.log(`lambda gave [${JSON.stringify(lambdaResult)}] `);
    const payload = JSON.parse(lambdaResult.Payload);
    await announceFromS3(payload.opusBucket, payload.opusKey);
}
async function convertAndAnnounce2(sns) {
    const mp3Key = sns.MessageAttributes.path.Value;
    const mp3Bucket = sns.MessageAttributes.bucket.Value;
    console.log(`convertAndAnnounce2 [${mp3Bucket} ${mp3Key}] `);
    await createAndStreamOpus(mp3Bucket, mp3Key);
}
async function announceFromS3(bucketName, bucketKey) {
    // get the file
    const s3Object = await s3
        .getObject({
            Bucket: bucketName,
            Key: bucketKey,
        })
        .promise();

    potentiallyAbortLambdaWhenZelloIsActingUp(s3Object);

    // write file to disk
    const utmp = uuidv4();
    const tmpFile = `${opusDir}/${utmp}.opus`;
    //writeFileSync(`/tmp/${bucketKey}`, s3Object.Body);
    writeFileSync(tmpFile, s3Object.Body);

    const mzRc = await mainZello(tmpFile);
    console.log("DONE: stream to zello mzRc:", mzRc);
    unlinkSync(tmpFile);
}

async function createAndStreamOpus(mp3Bucket, mp3Key) {
    // get the file
    const s3Object = await s3
        .getObject({
            Bucket: mp3Bucket,
            Key: mp3Key,
        })
        .promise();
    console.log("got s3 bytes");

    potentiallyAbortLambdaWhenZelloIsActingUp(s3Object);

    const tmpFile = `/tmp/tgt.mp3`; // fails when s3 object has paths...
    writeFileSync(tmpFile, s3Object.Body);
    console.log("wrote to /tmp");
    // convert to opus!
    spawnSync(
        "/opt/ffmpeg/ffmpeg",
        ["-i", tmpFile, "-f", "opus", "-b:a", "12k", `${tmpFile}.opus`],
        { stdio: "inherit" }
    );
    console.log("converted to opus");
    const mzRc = await mainZello(`${tmpFile}.opus`);
    // read opus from disk
    //        const opusFile = readFileSync(`${tmpFile}.opus`);
    // delete the temp files
    unlinkSync(`${tmpFile}.opus`);
    unlinkSync(`${tmpFile}`);
    //return opusFile;
}
