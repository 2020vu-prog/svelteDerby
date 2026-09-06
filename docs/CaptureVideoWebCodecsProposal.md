# Proposal: WebCodecs-based capture video page (heat fix)

Date: 2026-09-06
File: `frontend/src/CaptureVideo.svelte`

## The problem

`CaptureVideo.svelte` overheats phones during trackside use. The root cause is visible directly in the code: `handleGotMedia` starts **two full `MediaRecorder` instances that run continuously and permanently** (`recordStream()` calls at lines 587-588), each re-started forever from its own `onstop` handler (line 790), driven by `myTimer`/`captureOldest` on a `setInterval`. Both recorders encode the same canvas-captured stream, offset by half the configured snip length, so a complete recent clip is always available the moment a capture is requested.

That two-recorder design is deliberate, not accidental: `MediaRecorder`'s chunked WebM output (`start(timesliceMs)`) is only self-contained from the first chunk onward — later chunks lack the EBML/Segment/Track header a player needs — so there's no way to slice an arbitrary recent window out of one recorder's output after the fact. Running two full recorders, staggered, was the workaround. The cost is that two persistent software video encoders run at all times the page is armed, not just around capture events. That's the dominant heat source.

A secondary, smaller waste: the canvas preview redraw (`drawTimestampedPreview`, lines 641-672) runs via `requestAnimationFrame` at full display refresh rate, regardless of the configured capture `frameRate` (default 15fps) — extra draw/scale work with no benefit to the actual recording.

## Proposed fix

A **new page**, built on the WebCodecs API, with **one** encoder feeding a ring buffer of already-encoded frames, muxed into a WebM file only on demand when a capture is actually requested. This goes in alongside the existing page — which stays untouched — under its own menu entry, so the two can be field-tested side by side before either is retired.

### Architecture

1. **One `VideoEncoder`** instead of two `MediaRecorder`s — halves sustained encoder CPU load, the actual heat source. Configure `hardwareAcceleration: "prefer-hardware"` (a control `MediaRecorder` never exposed). Codec stays pinned to `vp8`, matching the app's existing default in `stores.js` (`videoCaptureCodec`) and avoiding `vp9`'s WebCodecs profile-string complexity and heavier software-encode cost.
2. **Frame source**: `MediaStreamTrackProcessor` turns the camera track into a stream of `VideoFrame`s, fed straight to the encoder when no overlay/scaling is needed. This also eliminates the rAF-waste problem as a side effect — there's no canvas draw loop at all on that path. When the timestamp overlay is on, or scaling is required, fall back to a canvas draw loop paced to the actual encode cadence (not `requestAnimationFrame`), feeding `new VideoFrame(canvas, {timestamp})` to the encoder instead.
3. **Periodic forced keyframes** (`encoder.encode(frame, {keyFrame: true})` on a timer) so a splice point is always nearby. A new, independent Advanced setting, `keyframeIntervalSeconds` (default ~3s), decoupled from `snipLengthSeconds` — that pairing in the old code was an artifact of "restart a whole recorder," not a real constraint here — and tuned instead against `snipAgeSeconds`: a keyframe interval too close to the retention window risks the nearest keyframe for a late-window request already being pruned, an outright capture miss that's worse than any failure mode in the current design.
4. **Ring buffer** of `{chunk: EncodedVideoChunk, wallClockMs, isKey}` records, pruned by age the same way `accrueSnips()` already does (lines 705-728) — wall-clock based rather than per-snip.
5. **Timestamp domain**: don't stamp wall-clock time inside the encoder's `output` callback — when the encode queue grows under load or thermal throttling, that callback fires after variable encode latency, which can shift the requested race window enough to select the wrong frames. Instead, record `wallClockMs = Date.now()` at the moment each `VideoFrame` is fed into the encoder, keyed by that frame's own `timestamp` (a small `Map` from frame timestamp → wall-clock ms, pruned in step with the ring buffer). `EncodedVideoChunk.timestamp` preserves the timestamp of the input frame it came from, so in the `output` callback, look up the wall-clock stamp via `chunk.timestamp` instead of calling `Date.now()` there. This keeps the mapping accurate regardless of encode latency, and avoids introducing a second, incompatible time system — `videoClientTimeAdjustmentMs`/`calcClientTimeAdjustmentMs` (server clock sync) are reused untouched.
6. **On capture request**: find the buffered range from the nearest keyframe at-or-before the window start through the window end (adding a short pre-roll past the end too, mirroring the existing `deferredCapture` pattern, since encode has latency), mux **only that slice** into a fresh WebM file, and feed the resulting Blob into the **existing, unmodified** `doUploadToServer()` (lines 345-419) by building the same shape it already expects: `{snipVideoData: [muxedBlob], snipStart, snipEnd, tgtTimeMs}`. `embedMeta()` (lines 302-340) needs zero changes either. No backend changes — same `.webm` container the S3 → MediaConvert pipeline already ingests.
7. **A simplification this design enables**: `findSnipMatch`/`isTimeInSnip`/`getSnipDistance` (lines 259-296) — a distance-scored search over a discrete snip list — collapses to one check: does the requested window start fall within `[oldest, newest]` of the continuous ring buffer, with a keyframe before it.

### Muxer library

The obvious small pure-JS muxer for this (`webm-muxer`, ~10KB, built to wrap WebCodecs `EncodedVideoChunk`s into WebM) is **deprecated upstream** in favor of **Mediabunny**, from the same author. Mediabunny is a much larger, general-purpose media toolkit (~10MB unpacked, multi-container/codec support) rather than a single-purpose muxer — whole-package size is irrelevant if it tree-shakes down to just the WebM-muxing path, but that needs to be verified, not assumed, along with its actual chunk-muxing API shape (it differs from `webm-muxer`'s). This is one of the Phase 0 spike items below.

### New files / changes

All net-new; **`CaptureVideo.svelte` and the backend are not touched.**

- **`frontend/src/CaptureVideoWebCodecs.svelte`** — new component, name open to bikeshedding, structurally mirrors `CaptureVideo.svelte`. Functions reused **verbatim by duplication** (not import — they're closures over component-local reactive state in a `.svelte` file we're deliberately not modifying): `doUploadToServer`, `embedMeta`, `auditClientTime`, `calcClientTimeAdjustmentMs`, `handleRemoteRequest`'s wait/sleep/pushMessage flow, `refreshVideoDevices`, `stopBothVideoAndAudio`, `resolveCaptureSize`, `refreshZoomCapabilities`/`setZoom`, `drawFittedFrame`, `formatOverlayTime`, `handleTimerSelect`, `nowFloor`, `clickedRequestCapture`, `parseRez`/`getVideoWidth`/`getVideoHeight`. This duplication is a deliberate, flagged short-term cost, worth extracting into a shared module once the new page is proven (see Phase 3). Functions **replaced**: `handleGotMedia`, `drawTimestampedPreview`, and everything encoder-related (`captureOldest`/`myTimer`/`accrueSnips`/`recordStream`/`growBlob`/`findSnipMatch`/`isTimeInSnip`/`getSnipDistance`, all deleted).
- **`frontend/src/videoRingBuffer.js`** — new pure module (no DOM/Svelte imports, unit-testable the way `routeRegistry.test.mjs` already is in this repo): `pushChunk`, `pruneChunks`, `sliceForWindow(buffer, loWallMs, hiWallMs)`, `getOldestWallMs`/`getNewestWallMs`.
- **`frontend/src/videoMux.js`** — thin wrapper around Mediabunny's muxing API: `muxChunksToBlob(chunkRecords, encoderConfig) → Blob`, owning timestamp rebasing to 0 and threading through the `decoderConfig` metadata the encoder's `output` callback delivers (needed for valid track headers).
- **`frontend/src/routes/routeDefinitions.js`** — one new entry mirroring the existing `captureVideo` entry (lines 409-414):
  ```js
  {
      id: "captureVideoWebCodecs",
      path: "/captureVideoWebCodecs",
      component: "CaptureVideoWebCodecs",
      permission: RoutePermission.CAN_CAPTURE_VIDEO,
      menu: adminMenu("Capture Video (WebCodecs)", 75),
  },
  ```
  placed right after `captureVideo` (order 70), before `logMessages` (order 90) — consistent with the existing admin order sequence.
- **`frontend/src/routes/routeComponents.js`** — add `import CaptureVideoWebCodecs from "../CaptureVideoWebCodecs.svelte";` plus the matching `CaptureVideoWebCodecs,` key in the exported object (the key must exactly match the `component:` string above — nothing ties them together at compile time).
- **`frontend/package.json`** — add Mediabunny as a dependency. Build tooling is Webpack 5 via plain npm with no private registry or offline constraint, so adding a dependency is mechanically low-risk; the open question is bundle size, not installability.

### Feature detection / fallback

Mirror the existing `isIos()` unsupported-browser message (lines 96-101): on mount, check for `window.VideoEncoder` and `window.MediaStreamTrackProcessor`; if either is missing, show an equivalent "use the other Capture Video page" message rather than partially initializing. This isn't a new platform constraint in practice — the existing page already tells iOS users video capture doesn't work for them, and WebCodecs/`MediaStreamTrackProcessor` are Chrome/Android-only today.

### Other implementation details worth flagging now (real work in Phase 1, not blocking the decision to proceed)

- **Manual backpressure**: unlike `MediaRecorder`'s opaque internal buffering, WebCodecs requires checking `encoder.encodeQueueSize` before each `encode()` call and dropping frames if the encoder falls behind (e.g. under thermal throttling). Only `VideoFrame` needs explicit resource release — call `.close()` on every frame once it's been fed to the encoder (or drawn to the canvas) and on every dropped frame, or the tab leaks GPU/native buffers. `EncodedVideoChunk` has no `close()` method; it's just encoded bytes plus metadata, so ring-buffer entries should copy/store the chunk data directly (or convert it to Mediabunny's `EncodedPacket` type, per its API) and let normal garbage collection reclaim them when pruned — there's nothing to release explicitly.
- **Settings-change teardown**: any Advanced-panel change (resolution/frameRate/bitrate) must fully tear down and recreate the encoder + track processor + **flush the ring buffer**, since chunks encoded under different configs can't be muxed together in one output file.
- **Capture-readiness check**: replace the old `videoRefreshCount`-based "wait 2 timer cycles" debounce (lines 732-734) with a direct check against the ring buffer — has a keyframe, and covers at least `snipLengthSeconds`.

## Risks to resolve in a Phase 0 spike, before full build-out

A failure in the first two items here should stop the effort or force a redesign before any component code is written:

1. **Platform support** — confirm `MediaStreamTrackProcessor` + `VideoEncoder` work un-flagged on the actual Android Chrome version(s) used trackside, not just desktop Chrome.
2. **Downstream acceptance** — mux a sample slice with Mediabunny and push it through the real S3 → MediaConvert pipeline end-to-end. Container metadata differs from `MediaRecorder`'s output (writing app, SeekHead/Cues, etc.), and a silent rejection would otherwise only surface after the whole feature is built.
3. **Hardware encode reality** — `prefer-hardware` is only a hint with no way to confirm after the fact which path ran; measure real device thermal/CPU behavior rather than assuming the win.
4. **Mediabunny bundle size** after tree-shaking, and its actual chunk-muxing API shape.
5. **Wall-clock tagging accuracy** — validate the `Date.now()`-in-`output`-callback approach against a known real-world event, confirming it lands inside existing tolerance.

## Phased delivery

- **Phase 0** — throwaway spike, not wired into routes/menu: validate the five risks above on real trackside hardware. Decision gate.
- **Phase 1** — full build-out per the file list above, with feature-detected fallback and Advanced-panel parity plus the new `keyframeIntervalSeconds` field.
- **Phase 2** — field-test both pages live in the admin menu simultaneously (`captureVideo` order 70, `captureVideoWebCodecs` order 75); compare thermal behavior, capture success/miss rate, and sync accuracy at real events, old page as fallback throughout.
- **Phase 3** (later, out of scope here) — once proven, consider retiring `CaptureVideo.svelte` and extracting the currently-duplicated upload/meta/clock-sync functions into a shared module used by whichever page(s) survive.

## Verification, once built

- `npm run dev` (Webpack dev server), navigate to `/captureVideoWebCodecs`, confirm the page loads only for a user with `CAN_CAPTURE_VIDEO`, exercise Record → wait past `snipLengthSeconds` → Capture&Upload, and confirm a valid, playable `.webm` lands in S3 with correct `embedMeta` fields — the same manual test path already implied by the existing page's UI.
- Add `videoRingBuffer.test.mjs` alongside the new module, following this repo's existing `node --test` pattern (e.g. `routeRegistry.test.mjs`), to cover `sliceForWindow`'s keyframe-boundary logic without needing a browser.
