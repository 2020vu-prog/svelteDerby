// from: https://github.com/serverless/examples/blob/master/aws-ffmpeg-layer/serverless.yml

const { spawnSync } = require("child_process");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const AWS = require("aws-sdk");

const s3 = new AWS.S3();

module.exports.mkopus = async (event, context) => {
    console.log("event: ", JSON.stringify(event));
    if (event.mp3Key && event.mp3Bucket) {
        const opusResponse = await createOpus(event.mp3Bucket, event.mp3Key);
        return opusResponse;
    }

    if (!event.Records) {
        console.log("not a record invocation!");
        return;
    }
    for (const record of event.Records) {
        if (!record.s3) {
            console.log("not an s3 invocation!");
            continue;
        }
        if (!record.s3.object.key.endsWith(".mp3")) {
            console.log(`skipping [${record.s3.object.key}] not an mp3`);
            continue;
        }
        await createOpus(record.s3.bucket.name, record.s3.object.key);
    }
};
async function createOpus(mp3Bucket, mp3Key) {
    // get the file
    const s3Object = await s3
        .getObject({
            Bucket: mp3Bucket,
            Key: mp3Key,
        })
        .promise();
    const tmpFile = `/tmp/tgt.mp3`; // fails when s3 object has paths...
    writeFileSync(tmpFile, s3Object.Body);
    // convert to opus!
    spawnSync(
        "/opt/ffmpeg/ffmpeg",
        ["-i", tmpFile, "-f", "opus", "-b:a", "12k", `${tmpFile}.opus`],
        { stdio: "inherit" }
    );
    // read opus from disk
    const opusFile = readFileSync(`${tmpFile}.opus`);
    // delete the temp files
    unlinkSync(`${tmpFile}.opus`);
    unlinkSync(`${tmpFile}`);
    // upload gif to s3
    await s3
        .putObject({
            Bucket: mp3Bucket,
            Key: `${mp3Key}.opus`,
            Body: opusFile,
        })
        .promise();
    return {
        opusBucket: mp3Bucket,
        opusKey: `${mp3Key}.opus`,
    };
}
