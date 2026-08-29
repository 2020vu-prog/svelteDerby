# Proposal: detecting when a car first appears in an uploaded video clip

Date: 2026-08-29

## Acronym glossary

- **CV** — Computer Vision (image/video analysis techniques, as opposed to a human watching)
- **FPS** — Frames Per Second
- **MP4** — a video container format (`.mp4`); MediaConvert's transcode output here
- **ROI** — Region Of Interest (a specific sub-area of a video frame)
- **SNS** — (AWS) Simple Notification Service, a pub/sub messaging service
- **VOD** — Video On Demand (the general category AWS's reference automation this repo already deploys is built for)
- **WebM** — a video container format (`.webm`); the format `CaptureVideo.svelte` records and uploads

## What this is, in one paragraph

`CaptureVideo.svelte` uploads short WebM clips to S3 whenever a race finishes; an existing AWS-provided watchfolder pipeline transcodes them to MP4. This proposal is for a new Lambda that identifies the first frame in each clip where a car becomes visible — **not** where it crosses a finish line. That distinction matters: the app runs on many different physical tracks with different camera mounts, so any technique that depends on a calibrated region of the frame (a finish-line position, a lane layout, a camera angle) doesn't generalize across sites. "When does something start moving" is a question answerable identically regardless of track, camera, or mount — no per-site setup required.

## How this was scoped (worth recording, not just the conclusion)

The first framing of this problem — "find the frame where the first car crosses the finish line" — turned out to be the wrong problem for two independent reasons, both surfaced by testing against two real sample clips rather than reasoning in the abstract:

1. **The embedded timing metadata isn't trustworthy.** `CaptureVideo.svelte`'s `embedMeta()` bakes a hardware-timer-derived `toMs` (expected finish offset) into the uploaded clip's S3 key, and that looked like a natural anchor for narrowing a frame search. Per direct confirmation: it's clock drift between the timer and the capture device, inconsistent in magnitude, and aligning it to server time didn't fix it. Any scheme that leans on it as ground truth — even as a soft hint — inherits that unreliability. It's dropped from the design entirely.
2. **A finish-line ROI doesn't generalize.** Initial analysis of the sample footage went looking for a fixed finish-line gate to calibrate a region against. That's fundamentally the wrong shape of solution for an app that runs on different tracks with different physical setups — a calibrated ROI is exactly the kind of per-site configuration this needs to avoid. The actual objective is simpler: not "where's the line", just "when does a car show up."

## The technique, validated against real footage

**Whole-frame adjacent-frame differencing**, no ROI, no scene-specific configuration:

1. Extract every frame at native FPS (clips are short — the sample was 135 frames / 9s at 15fps — so this is cheap; no need to sub-sample or seed from metadata).
2. For each frame, compute the count of pixels that changed significantly from the previous frame (grayscale, coarse-sampled grid for speed).
3. Establish a noise floor from the clip's own median changed-pixel count (robust across different lighting/camera/compression conditions without per-track tuning), and flag the first frame that begins a sustained run of 2+ consecutive frames clearing a multiple of that floor (see "Broader validation" below for why a single-frame threshold crossing isn't enough on its own).

Tested against both provided samples (`x.webm`, the raw browser capture, and `x.mp4`, the MediaConvert-transcoded output of the same clip) using `prototype_frame_detect.py`:

```
clip: 135 frames, noise floor (median)=0, threshold=30
  webm_all_036.png: changed_pixels=498   <-- onset
  webm_all_037.png: changed_pixels=1729
  webm_all_038.png: changed_pixels=2927
  webm_all_039.png: changed_pixels=3860
  webm_all_040.png: changed_pixels=3979
  ...
```

The signal is unambiguous: every frame before 036 sits at 0-9 changed pixels (pure sensor/compression noise); frame 036 jumps to 498 and climbs steeply from there. Same onset frame (036) on both the raw WebM and the transcoded, pillarboxed MP4, despite different compression and letterboxing — the technique is insensitive to exactly the kind of per-format variation a finish-line-ROI approach would have been fragile to.

This also means the detector can subscribe to the **raw upload** (the same S3 `PUT` event the existing MediaConvert watchfolder Lambda reacts to — see `backend/modules/vodTranscode/src/convert.py`) rather than waiting on transcode completion: no need for the MP4 at all, so no extra latency and no pillarboxing to account for.

## Broader validation against real archived footage

The org's actual S3 archive (`media/NDR.45e15/`, reachable at production via the same `/media` proxy path the frontend already uses) has hundreds of real clips from actual events, not just two hand-picked samples. Pulled a diverse batch of 8 clips spanning four different days and re-ran the same script, unmodified, against all of them.

Result: **3 of 8 clips produced a false-positive onset** — an isolated single-frame noise spike (not real, sustained motion) that happened to land *before* the real car-motion sequence and clear the threshold on its own. In every one of those 3 cases, the real, correct signal (a run of frames with steadily climbing changed-pixel counts) was clearly present in the data a few frames later — the algorithm just wasn't requiring the crossing to be part of a sustained run.

Fix: require `CONSECUTIVE_FRAMES_REQUIRED` (2) consecutive frames at/above threshold before accepting the first one as the onset, instead of accepting any single frame that clears it. Re-ran the full batch with that change:

| Clip | Result |
| --- | --- |
| 6 of 8 | Clean, confident onset frame — sustained multi-frame growth, no ambiguity |
| 2 of 8 | Correctly reported "no motion onset detected" — no sustained run ever appeared |
| Any | **Zero false positives** — no clip returned a confidently-wrong frame |

That 2-of-8 "no event" outcome turned out to matter more than it first looked like — see "no detection is an anomaly" below.

**Extended the batch**: pulled 30 more real (`RP-`-prefixed, i.e. actually photoeye-triggered, not manually-triggered test clicks) clips, spread across the full ~276-clip archive rather than a handful of nearby ones, and re-ran unmodified.

| Outcome | Count |
| --- | --- |
| Clean, confident onset frame | 25 |
| No motion onset detected | 2 |
| Video failed to decode (corrupt/unusual encoding — ffmpeg hung or errored, not a detection outcome) | 3 |

Combined across both batches (37 real photoeye-triggered clips attempted, 34 successfully decoded): **31 of 34 (91%) clean detections, 3 of 34 (9%) no-detection, zero false positives** in either batch. The 3 undecodable clips are a separate, real finding of their own — worth a bounded per-file timeout and an explicit "couldn't decode" outcome in the production Lambda, distinct from "decoded fine, no motion found".

## Where this fits in existing infrastructure

- **Trigger**: new Lambda on the same S3 upload-prefix event `convert.py` already reacts to (parallel path, not sequential after MediaConvert).
- **Runtime**: Python + Pillow is sufficient — this is classical per-pixel differencing, not machine learning, and doesn't need GPU/Rekognition. The `codex/ffmpeg-lambda-pilot` branch already proved the pattern of bundling a license-clean tool (there, a static FFmpeg build) and running it directly against an S3 object downloaded to `/tmp`; this Lambda follows the same shape.
- **Output**: just the detected offset (ms from clip start), not a frame image — see "Persisting the offset" below for why and how.

## Persisting the offset (no frame image needed)

Per direct confirmation, a resulting frame image isn't needed right now — just the numeric offset, persisted somewhere `MediaViewer.svelte` can read it, so the existing seek-to-finish flow can seek to it directly.

`MediaViewer.svelte` already has exactly this mechanism, driven by the unreliable `toMs` value this proposal set out to replace:

- `extractS3VideoMeta()` (`frontend/src/utils.js:634`) parses the S3 key's embedded metadata and computes `meta.tgtTimeMs = meta.toMs + meta.snipStart`.
- `MediaViewer.svelte`'s `setTgtTimeSeconds()` derives `tgtTimeSeconds = (tgtTimeMs - snipStart) / 1000` from that, and the existing checkered-flag button's `seekToFinish()` sets the `<video>` element's `currentTime` to it.

So the integration point already exists — it's just fed by the wrong (unreliable) source today. Proposed change:

1. The Lambda writes the detected offset as an **S3 object tag** on the already-uploaded clip (`PutObjectTagging` — no need to mutate the object body or its key, unlike the frame-image approach this replaces).
2. `/listMediaPrefix`'s backing handler (`s3QueryMediaPrefix`, `backend/modules/lambdaDerby/src/derbyMain.js:1451`) is extended to include that tag in its response alongside the existing `Key`/`LastModified` fields — additive, no schema change, no new endpoint.
3. `MediaList.svelte` (which already fetches this listing and sets `$videoHref` before rendering `<MediaViewer/>`) sets a new store, e.g. `$detectedOffsetMs`, from the same response.
4. `setTgtTimeSeconds()` prefers `$detectedOffsetMs` when present, falling back to the current `toMs`-derived value only when the Lambda found no motion (see the anomaly-handling note below) — no change to the seek-to-finish UX itself, just a more accurate source feeding it.

This keeps the change additive and low-risk: one existing endpoint gets one more field in its response, one existing frontend function gets a preferred-value fallback, no new API surface or backend storage.

## Open questions worth deciding explicitly

- **No detection is an anomaly, not an accepted outcome** — per direct confirmation, every real capture is triggered by a physical photoeye at the finish line, so a clip with no detected motion means something went wrong (bad camera aim/coverage, an obstruction, a false trigger), not a normal "no event" case to design around gracefully. The production Lambda should treat this as an alertable condition (e.g. a CloudWatch metric) for `RP-`-prefixed (real, photoeye-triggered) keys specifically — measured at roughly 9% of real clips across 34 successfully-decoded samples, worth a look at whether that rate is itself acceptable or points at a systemic capture/framing issue. One caveat: `TestClick`/`TestRemote`-prefixed keys are manually-triggered test captures, not photoeye events — confirmed one of the original 8 clips with zero detected motion was a `TestRemote` clip, which fits that category rather than being a genuine anomaly. The other no-detection cases (real `RP-` clips) only ever show a small, isolated, non-sustained pixel blip with no obvious car visible in frame at that moment — left genuinely unresolved rather than guessed at; a real example of what anomaly investigation will need real tooling for, not just a one-off script run.
- **The 3 undecodable clips found during the extended batch** (see above) need their own handling path in the Lambda — distinct from "decoded fine, no motion found" — and are worth a quick look to see whether they're genuinely corrupt uploads or an ffmpeg edge case with a specific encoding pattern.
