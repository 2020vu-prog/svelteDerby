// from: https://github.com/serverless/examples/blob/master/aws-ffmpeg-layer/serverless.yml

const { spawnSync } = require("child_process");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const AWS = require("aws-sdk");

const s3 = new AWS.S3();

module.exports.mkopus = async (event, context) => {
  if (!event.Records) {
    console.log("not an s3 invocation!");
    return;
  }
  for (const record of event.Records) {
    if (!record.s3) {
      console.log("not an s3 invocation!");
      continue;
    }
    if (! record.s3.object.key.endsWith(".mp3")) {
      console.log(`skipping [${record.s3.object.key}] not an mp3`);
      continue;
    }
    // get the file
    const s3Object = await s3
      .getObject({
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key
      })
      .promise();
    // write file to disk
    writeFileSync(`/tmp/${record.s3.object.key}`, s3Object.Body);
    // convert to opus!
    spawnSync(
      "/opt/ffmpeg/ffmpeg",
      [
        "-i",
        `/tmp/${record.s3.object.key}`,
        "-f", "opus",
        "-b:a", "12k",
        `/tmp/${record.s3.object.key}.opus`
      ],
      { stdio: "inherit" }
    );
    // read opus from disk
    const opusFile = readFileSync(`/tmp/${record.s3.object.key}.opus`);
    // delete the temp files
    unlinkSync(`/tmp/${record.s3.object.key}.opus`);
    unlinkSync(`/tmp/${record.s3.object.key}`);
    // upload gif to s3
    await s3
      .putObject({
        Bucket: record.s3.bucket.name,
        Key: `${record.s3.object.key}.opus`,
        Body: opusFile
      })
      .promise();
  }
};
