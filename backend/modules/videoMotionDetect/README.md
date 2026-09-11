# Video motion-detect prototype

Implements the technique from
[`docs/VideoCarAppearanceDetectionProposal.md`](../../../docs/VideoCarAppearanceDetectionProposal.md):
detects the frame where a car first appears in an uploaded clip via
whole-frame adjacent-frame differencing, with no finish-line ROI or
per-track calibration.

Deployed as a standalone Lambda Function URL
(`videoMotionDetect.tf` at the backend root) -- deliberately not wired into
`cloudfront.tf` or `derbyMain.js`, so it can be built out and iterated on
without touching the existing request path. It reads and writes tags on the
same S3 objects `derbyMain`'s `/listMediaPrefix` already serves
(`aws_s3_bucket.dstBucket`'s `media/` prefix); no new bucket.

## API

`GET <function_url>?key=<S3 key under media/>`

```json
{"status": "found", "offsetMs": 2333}
{"status": "no_motion"}
{"status": "decode_error"}
{"status": "not_found"}
```

Idempotent: the result is persisted as S3 object tags on the clip itself
(`motionStatus`, and `motionOffsetMs` when found). A second request for the
same key returns the stored tags instead of reprocessing -- this also makes
the endpoint reusable to re-run detection against already-archived clips for
further validation, not just newly-uploaded ones.

## Building

```
cd src
make            # builds package.zip (needs bin/ffmpeg, bin/ffprobe already present)
./build.sh      # only when bumping the pinned ffmpeg version -- needs Docker,
                # takes several minutes, produces bin/ffmpeg and bin/ffprobe
```

`bin/ffmpeg`/`bin/ffprobe` are committed to the repo (see
[`src/THIRD_PARTY_LICENSES.md`](src/THIRD_PARTY_LICENSES.md)) specifically
so `make package.zip` -- and therefore every deploy -- doesn't pay the
several-minutes ffmpeg compile on every run. Only `build.sh` needs Docker;
`make` alone does not.

`test_local.py` runs the detection algorithm directly against a local video
file (no S3), for manual validation against sample clips.
