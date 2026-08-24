# Video transcode workflow

The established workflow submits uploads under `inputs/` to MediaConvert.

This module also supplies an isolated direct-Lambda pilot:

| Upload prefix | Processor | Output prefix |
| --- | --- | --- |
| `inputs/` | MediaConvert | existing MediaConvert output layout |
| `ffmpeg-inputs/` | `vod-transcode-stack-ffmpeg-convert` | `ffmpeg/` |

The pilot has no SQS queue or long-polling worker. S3 invokes Lambda
asynchronously; failed invocations retry twice and then publish to the module's
existing SNS topic. It is intentionally not connected to the application video
paths yet.

The direct converter produces an MP4 with FFmpeg's native MPEG-4 video encoder
and AAC audio encoder. It is a cost and operational pilot, not a replacement
for the H.264 MediaConvert workflow. The bundled FFmpeg is compiled from pinned
source with GPL and non-free components disabled. See
[`src/THIRD_PARTY_LICENSES.md`](src/THIRD_PARTY_LICENSES.md) before changing
the build or shipping the artifact.
