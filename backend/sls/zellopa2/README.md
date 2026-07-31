# zellopa2

`zellopa2` is a Serverless Framework AWS Lambda service that streams Derby PA audio into a Zello channel.

The Lambda is triggered by the `ZelloPushSns` SNS topic. Each SNS message points at an MP3 object in S3 and includes the target Zello channel. `zellopa2` downloads the MP3, converts it to Opus with the configured ffmpeg Lambda layer, then opens a Zello Channel API websocket and streams the Opus packets in real time.

## Flow

1. SNS invokes `src/handler.zelloStream`.
2. `convertAndAnnounce2()` reads:
   - `MessageAttributes.path.Value`
   - `MessageAttributes.bucket.Value`
   - `MessageAttributes.zelloChannel.Value`
3. The MP3 is downloaded from S3 into `/tmp/tgt.mp3`.
4. `/opt/ffmpeg/ffmpeg` converts it to `/tmp/tgt.mp3.opus`.
5. `src/index.js` logs into Zello using JWT plus username/password credentials.
6. `src/opus-file-stream.js` parses the Ogg/Opus file and emits packets with timing based on the Opus packet duration.
7. The Lambda sends `start_stream`, audio packets, then `stop_stream` over `wss://zello.io/ws`.

## AWS Resources

Defined in `serverless.yml`:

- Service: `zellopa2`
- Runtime: `nodejs14.x`
- Region: `us-east-2`
- Memory: `512 MB`
- Timeout: `30 seconds`
- Reserved concurrency: `1`
- Trigger: SNS topic from SSM parameter `/sns/ZelloPushSns/arn`
- Layer: ffmpeg layer from SSM parameter `FfmpegLayerArn`

The Lambda has broad access to `s3:GetObject` and `lambda:InvokeFunction`. The invoke permission is legacy support for the older `convertAndAnnounce()` path that calls the `zellopa1` Lambda.

## Configuration

The deployment expects these environment variables:

- `ZELLO_ISSUER`
- `ZELLO_PRIVATE_KEY`
- `ZelloUsername`
- `ZelloPassword`

`ZELLO_PRIVATE_KEY` must be base64-encoded. At runtime it is decoded and used to create a short-lived RS256 JWT for Zello auth.

The deployment also expects these SSM parameters:

- `FfmpegLayerArn`
- `zelloPa1LambdaArn`
- `/sns/ZelloPushSns/arn`

## Install

From the service source directory:

```sh
cd backend/sls/zellopa2/src
npm install
```

## Deploy

From the service directory:

```sh
cd backend/sls/zellopa2
serverless deploy
```

Make sure AWS credentials, the required environment variables, and the SSM parameters are available before deploying.

## Operational Notes

- Reserved concurrency is intentionally set to `1` so two PA messages do not stream to Zello at the same time.
- Temporary audio files are written under `/tmp`; stale files are logged on each invocation.
- A zero-byte S3 object causes the Lambda process to exit with code `99`. This is an intentional cold-start nudge for cases where Zello appears wedged.
- The deprecated S3 `.opus` trigger path is still present in `handler.js`, but the active path is SNS plus MP3 conversion.
- `convertAndAnnounce()` is the older path that invokes `zellopa1`; `convertAndAnnounce2()` is the active inline conversion path.

## Key Files

- `serverless.yml`: AWS Lambda, IAM, layer, and SNS trigger configuration.
- `src/handler.js`: Lambda handler, S3 download, MP3-to-Opus conversion, and temp file cleanup.
- `src/index.js`: Zello websocket auth and streaming lifecycle.
- `src/opus-file-stream.js`: Ogg/Opus parser and packet reader.
- `src/tokenmanager.js`: Zello JWT creation.
