<script>
    import log from "loglevel";
    import Walkup from "./Walkup.svelte";
    import { onMount, onDestroy } from "svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        pushMessage,
        getAxiosNew,
        axios,
        raceConfig,
        isIos,
        videoPerspective,
        videoCaptureCodec,
        videoClientTimeFixedMs,
        videoClientTimeAdjustmentMs,
        videoClientTimeAdjustmentMarginMs,
    } from "./stores.js";

    import { sleep, hhmmssFmt, secondsToHHMMSS } from "./utils.js";

    const { v4: uuidv4 } = require("uuid");
    import TimerSelectByName from "./TimerSelectByName.svelte";
    import MqttSubscribeStub from "./MqttSubscribeStub.svelte";
    var timerId = "";
    var timerName = "";
    var timerTopic = "";

    var showAdvanced = false;
    var mediaRecorder = [];
    var activeSnipList = [];
    var oldestSnipHHMMSS = "";
    const mqttMsgKey = "mqttMsgKey";

    function newVideoSnip() {
        return {
            snipVideoData: [],
            snipStart: Date.now(),
            snipEnd: 0,
            isRecording: true,
            pendingUploadKey: undefined, //allow active videoto auto upload onStop
        };
    }
    var uploadPending;
    var nextSnum = 0; // 2 streams.  this will toggle b/t 0,1
    var timerHandle;
    var previewHideTimeout;
    var recordingRequested = false;
    var recordingActive = false;
    var captureSpinning = false;
    var captureDisabled = true;
    var remoteeSpinning = false;
    var calcSpinning = false;
    var remoteeDisabled = false;
    var isDestroying = false;
    // "auto" requests a bounded 16:9 ideal resolution (see doStart())
    // instead of forcing one of the ~4:3 fixed options below, then reads
    // back whatever the camera actually delivered (see
    // resolveCaptureSize()) to size the canvas -- avoids the
    // aspect-ratio mismatch case for the common case, since most camera
    // sensors are natively 16:9, while still capping the request so a
    // phone can't hand back an unbounded 1080p/4K stream.
    var resolution = "auto";
    var frameRate = "15";
    var videoBitsPerSecond = "1000000";
    // How to fit the raw camera frame into the target resolution when
    // its native aspect ratio doesn't match: "letterbox" scales down to
    // fit entirely inside (adds bars, keeps full field of view),
    // "cover" scales up to fill it (crops edges, no bars). Either way,
    // the frame is scaled uniformly -- never stretched/distorted.
    var frameFit = "letterbox";
    // Empty = no deviceId constraint, browser picks per facingMode as
    // before. Populated from enumerateDevices() -- labels (e.g. "Back
    // Ultra Wide Camera") are only available once permission has been
    // granted at least once in this browser/origin.
    var videoDeviceId = "";
    var videoDeviceOptions = [];
    // Populated from the active track's getCapabilities() once
    // recording starts -- zoom can't be known before a stream exists,
    // and isn't supported by every browser/camera (mainly Chrome on
    // Android; not available on iOS Safari at all).
    var zoomCapabilities = null;
    var zoomLevel = null;
    const tag = "CaptureVideo";
    var snipAgeSeconds = 300;
    var snipLengthSeconds = 6;
    var recordTimeOverlay = false;
    var timerSelectMode = "normal";
    $: {
        if (recordingRequested) {
            timerSelectMode = "disabled";
        } else {
            timerSelectMode = "normal";
        }
    }
    onMount(async () => {
        if (isIos()) {
            pushMessage({
                text: `Video capture does not work on iOS.  Please use android for video.`,
                type: "error",
            });
        }
        refreshVideoDevices();
    });
    // Device labels are blank until permission has been granted at
    // least once, so this is also re-run after a stream is obtained
    // (see handleGotMedia) to pick up real labels for next time.
    async function refreshVideoDevices() {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            videoDeviceOptions = devices.filter((d) => d.kind === "videoinput");
        } catch (e) {
            log.warn("enumerateDevices failed:", e);
        }
    }
    onDestroy(() => {
        isDestroying = true;
        if (timerHandle) {
            clearInterval(timerHandle);
            timerHandle = undefined;
        }
        if (previewHideTimeout) {
            clearTimeout(previewHideTimeout);
            previewHideTimeout = undefined;
        }
        if (canvasAnimationFrame) {
            cancelAnimationFrame(canvasAnimationFrame);
            canvasAnimationFrame = undefined;
        }
        if (canvasStream) {
            stopBothVideoAndAudio(canvasStream);
            canvasStream = undefined;
        }
        if (mainStream) {
            stopBothVideoAndAudio(mainStream);
            mainStream = undefined;
        }
        mediaRecorder.forEach((mr) => {
            if (mr && mr.state !== "inactive") {
                mr.stop();
            }
        });
        recordingActive = false;
        log.debug(`${tag} onDestroy done`);
    });
    // stop both mic and camera
    function stopBothVideoAndAudio(stream) {
        stream.getTracks().forEach(function (track) {
            if (track.readyState == "live") {
                track.stop();
            }
        });
    }

    async function handleRemoteRequest(json) {
        const tag = "handleRemoteRequest";
        //const json=JSON.parse(jsonString)
        log.debug(`${tag}: invoked: ${JSON.stringify(json)}`);

        auditClientTime(json.issuedMs, tag);
        await calcClientTimeAdjustmentMs();

        if (!json.tgtTimeMs) {
            log.error(`${tag}: INVALID`);
            return;
        }
        if (!json.prefix) {
            log.error(`${tag}: INVALID`);
            return;
        }
        const tgtAdjMs =
            json.tgtTimeMs +
            $videoClientTimeAdjustmentMs +
            $videoClientTimeFixedMs;
        const lo = tgtAdjMs - 500;
        const hi = tgtAdjMs + 500;
        const futureHi = hi - Date.now() + 5000;
        if (futureHi > 0) {
            //wait for video capture if hi is 'now-ish' or future
            pushMessage({
                text: `Video upload in [${futureHi / 1000}] seconds.`,
                key: mqttMsgKey,
                type: "success",
                TTL: Date.now() + futureHi,
            });
            log.debug(`${tag}: waiting ${futureHi}`);
            await sleep(futureHi);
            log.debug(`${tag}: waited  ${futureHi}`);
        } else {
            log.debug(`${tag}: noWait ${futureHi}`);
            pushMessage({
                text: `Video upload searching...`,
                key: mqttMsgKey,
                type: "success",
            });
        }

        const sMatch = findSnipMatch(lo, hi);
        if (sMatch) {
            const oldSnip = sMatch;
            const hhmmss = hhmmssFmt(oldSnip.snipStart);
            const key = `${oldSnip.snipStart}-TestRmt`;
            captureSpinning = true;
            oldSnip.tgtTimeMs = tgtAdjMs;
            doUploadToServer(oldSnip, json.prefix);
        } else {
            pushMessage({
                text: `Remote Video capture snip NOT FOUND!.`,
                type: "error",
            });
        }
    }
    function nowFloor() {
        return Math.floor(Date.now() / 5000) * 5000;
    }
    async function clickedRequestCapture() {
        if (!timerName) {
            pushMessage({
                text: `No timer selected.`,
                type: "error",
                key: mqttMsgKey,
            });
            return;
        }

        remoteeSpinning = true;
        pushMessage({
            text: `Beginning Request.`,
            type: "success",
            key: mqttMsgKey,
        });
        try {
            const endPoint = "/requestVideoUpload";
            const req = {
                tgtTimeMs: nowFloor() + 5000,
                timerName: timerName,
                orgId: $raceConfig.orgId,
                orgIz: $raceConfig.orgIz,
            };
            const response = await $axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            log.debug("clickedRequestCapture response", response);
            pushMessage({
                text: `Completed [${timerName}] Request.`,
                type: "success",
                key: mqttMsgKey,
            });
        } catch (err) {
            log.debug("clickedRequestCapture caught:", err);
            pushMessage({
                text: err,
                type: "error",
            });
        } finally {
            remoteeSpinning = false;
        }
    }
    function isTimeInSnip(snip, xMs, rsn) {
        //log.debug(`VCALC: istis BEGIN ${rsn}: `,snip,xMs)
        //TODO: active snips!
        //       log.debug("VCALC: wtf: ",xMs,snip.snipStart,snip.snipEnd)
        //        log.debug("VCALC: wtf2: ",xMs,snip)
        const rc = xMs > snip.snipStart && xMs < snip.snipEnd;
        rc && log.debug(`VCALC: istis ${rsn} true: `, snip, xMs);
        return rc;
    }
    function getSnipDistance(snip, loMs, hiMs) {
        //log.debug("VCALC: wtf3z: ",isTimeInSnip(snip,hiMs,'hcrack'))
        //log.debug("VCALC: wtf3a: ",loMs,hiMs,snip)
        const beginD = loMs - snip.snipStart;
        const endD = snip.snipEnd - hiMs;
        //log.debug("VCALC: wtf3b: ",beginD,endD,snip)
        return Math.min(beginD, endD);
    }
    function findSnipMatch(lo, hi) {
        const candidates = videoSnipHistory.filter((snipp) => {
            return (
                isTimeInSnip(snipp, lo, "lo") && isTimeInSnip(snipp, hi, "hi")
            );
        });
        log.debug("VCALC: candidates: ", candidates.length);
        var rc = undefined;
        var fitDistance = 0;
        for (let idx in candidates) {
            const snip = candidates[idx];
            const thisFit = getSnipDistance(snip, lo, hi);
            log.debug("VCALC: may tf: ", thisFit);
            if (thisFit > fitDistance) {
                fitDistance = thisFit;
                rc = snip;
            }
        }
        log.debug("VCALC: using Fd: ", fitDistance);
        return rc;
    }
    function clickedCapture() {
        const now = new Date().getTime();
        deferredCapture(`${now}-TestClick`);
    }

    function embedMeta(uploadKey, videoSnip) {
        let tgtTimeMs = videoSnip.tgtTimeMs;
        if (!tgtTimeMs) {
            const m = /\d\d\d\d+/.exec(uploadKey);
            log.debug(`infer tgtTime: ${JSON.stringify(m)}`);
            if (m && m.length > 0) {
                const candidate = parseInt(m[0]);
                if (
                    candidate >= videoSnip.snipStart &&
                    candidate <= videoSnip.snipEnd
                ) {
                    tgtTimeMs = candidate;
                }
            }
        }
        // LANDMINE!!
        // . s3 upload works with long fname/url,
        // but mediaconvert job submit FAILS when ss3 url too long :-(
        // . limit approx 256 chars?!?!?!
        const meta = {
            // perspective: $videoPerspective,
            p: $videoPerspective,
            //snipStart: videoSnip.snipStart,
            ss: videoSnip.snipStart,
            //snipEnd: videoSnip.snipEnd,
            lMs: videoSnip.snipEnd - videoSnip.snipStart,
            toMs: tgtTimeMs - videoSnip.snipStart,
            n: timerName,
        };
        const metaJson = JSON.stringify(meta);
        const metaEnc = encodeURIComponent(metaJson);
        log.debug(`metaEnc: ${metaEnc}`);
        const regex = /%/gi;
        const metaEnc2 = metaEnc.replaceAll(regex, "_");
        log.debug(`metaEnc2: ${metaEnc2}`);

        //return $videoPerspective
        return `__${metaEnc2}__`;
    }
    function auditClientTime(issuedMs, tag) {
        const offset = issuedMs - Date.now();
        log.debug(`auditClientTime ${tag}: ${offset}`);
    }
    async function doUploadToServer(videoSnip, uploadKey) {
        const tag = "doUploadToServer";
        const videoDataBlob = new Blob(videoSnip.snipVideoData);
        pushMessage({
            text: `Beginning upload. ${uploadKey}`,
            type: "success",
            key: uploadKey,
        });
        try {
            const endPoint = "/requestS3PutObjectUrl";
            //const axios = await $getAxios();
            if (!$videoPerspective) {
                $videoPerspective = uuidv4().substring(0, 5);
            }
            const req = {
                key: `${uploadKey}_${embedMeta(uploadKey, videoSnip)}.webm`,
                //snipStart: videoSnip.snipStart,
                //snipEnd: videoSnip.snipEnd,
                orgId: $raceConfig.orgId,
                orgIz: $raceConfig.orgIz,
            };
            const response = await $axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            log.debug("requestS3PutObjectUrl response", response);
            if (response.data.issuedMs) {
                auditClientTime(response.data.issuedMs, tag);
            }
            if (response.data.signedUrl) {
                const options = {
                    headers: {
                        // Content-Type MUST match the params in getSignedHeader on backend!
                        // US-East-1 didn't care, but US-West-2 did...  gave us a 403 on PUT when mis-matched.
                        "Content-Type": mimeType,
                    },
                };

                const axiosGeneric = $getAxiosNew();
                pushMessage({
                    text: `Beginning upload s3.`,
                    type: "success",
                    key: uploadKey,
                });

                //delete axiosGeneric.defaults.headers.common["Authorization"];
                const putRc = await axiosGeneric.put(
                    response.data.signedUrl,
                    videoDataBlob,
                    options
                );
                log.debug("s3PutResponse", putRc);
                pushMessage({
                    text: `Completed upload s3 ${videoDataBlob.size}`,
                    type: "success",
                    key: uploadKey,
                });
            }
            if (response.data.error) {
                log.debug("requestS3PutObjectUrl failed", response);
                pushMessage({
                    text: response.data.error,
                    type: "error",
                });
            } else {
            }
        } catch (err) {
            log.debug("requestS3PutObjectUrl caught:", err);
            pushMessage({
                text: err,
                type: "error",
            });
        } finally {
            captureSpinning = false;
        }
    }
    function parseRez() {
        log.debug("parseRez:", resolution);
        return resolution.split("x");
    }
    function getVideoHeight() {
        return parseRez()[1];
    }
    function getVideoWidth() {
        return parseRez()[0];
    }
    async function doStart() {
        if (!timerId) {
            pushMessage({
                text: `Missing selected Timer[2].`,
                type: "error",
            });
            return;
        }
        if (snipLengthSeconds > 12 || snipLengthSeconds < 4) {
            pushMessage({
                text: `Snip length s/b 4<->12.`,
                type: "error",
            });
            return;
        }

        showAdvanced = false;
        hidePreview = false;
        const snum = 0;
        recordingRequested = true;
        // `ideal` (not a bare/exact value) so the browser picks the
        // closest resolution at the camera's own native aspect ratio
        // instead of stretching the frame to force an exact WxH the
        // sensor doesn't natively support. In "auto" mode the ideal
        // target is a 16:9 box close in pixel count to the old 640x480
        // default -- still bounded with `max`, since an unconstrained
        // request can hand back 1080p/4K, and this component redraws
        // every frame through a canvas into two concurrent
        // MediaRecorders, which is enough load to drop frames or fail
        // to capture at all on the mobile hardware used trackside.
        const [idealWidth, idealHeight, maxWidth, maxHeight] =
            resolution === "auto"
                ? [854, 480, 1280, 720]
                : [
                      parseInt(getVideoWidth(), 10),
                      parseInt(getVideoHeight(), 10),
                      parseInt(getVideoWidth(), 10),
                      parseInt(getVideoHeight(), 10),
                  ];
        const constraints = {
            video: {
                width: { ideal: idealWidth, max: maxWidth },
                height: { ideal: idealHeight, max: maxHeight },
                frameRate: { ideal: parseInt(frameRate, 10), max: 30 },
                // A specific lens (deviceId) already implies which
                // physical camera to use -- combining it with
                // facingMode risks the two constraints conflicting on
                // some browsers, so only fall back to facingMode when
                // no explicit lens is chosen.
                ...(videoDeviceId
                    ? { deviceId: { exact: videoDeviceId } }
                    : { facingMode: "environment" }),
            },
        };
        log.debug("Using media constraints:", constraints);
        init(constraints, snum);
    }
    async function init(constraints, snum) {
        try {
            const stream =
                await navigator.mediaDevices.getUserMedia(constraints);
            handleGotMedia(stream, snum);
        } catch (e) {
            console.error("navigator.getUserMedia error:", e);
            recordingRequested = false;
            pushMessage({
                text: e,
                type: "error",
            });
            //errorMsgElement.innerHTML = `navigator.getUserMedia error: ${ e.toString() }`;
        }
    }
    // In "auto" mode, reads back whatever resolution the camera actually
    // delivered (via the track's settings, populated as soon as
    // getUserMedia resolves -- no need to wait for the video element to
    // load) instead of a fixed dropdown value.
    function resolveCaptureSize(stream) {
        if (resolution !== "auto") {
            return {
                width: parseInt(getVideoWidth(), 10),
                height: parseInt(getVideoHeight(), 10),
            };
        }
        const settings = stream.getVideoTracks()[0]?.getSettings?.() || {};
        if (settings.width && settings.height) {
            return { width: settings.width, height: settings.height };
        }
        log.warn(
            "Camera did not report its resolution; falling back to 640x480."
        );
        return { width: 640, height: 480 };
    }
    // Zoom is a track-level constraint (part of the Image Capture API
    // extensions, not the base MediaTrackConstraints spec), so it can
    // only be discovered/applied against an already-active track --
    // there's no way to request a starting zoom level up front the way
    // resolution/frameRate can.
    function refreshZoomCapabilities(stream) {
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.();
        if (caps?.zoom) {
            zoomCapabilities = caps.zoom;
            zoomLevel = track.getSettings?.().zoom ?? caps.zoom.min;
        } else {
            zoomCapabilities = null;
            zoomLevel = null;
        }
    }
    async function setZoom(value) {
        // zoomLevel is bind:value'd to the slider, so the thumb already
        // reflects `value` before this runs -- don't gate that on the
        // async applyConstraints() call below, or a rejected/unsupported
        // value (some devices report a wider getCapabilities() range
        // than they actually honor) snaps the slider back to the last
        // applied value and looks like it's simply not responding.
        const track = mainStream?.getVideoTracks()[0];
        if (!track || !zoomCapabilities) return;
        try {
            await track.applyConstraints({ advanced: [{ zoom: value }] });
        } catch (e) {
            log.warn("applyConstraints zoom failed:", e);
            pushMessage({
                text: `Camera rejected zoom level ${value}x.`,
                type: "error",
            });
        }
    }
    var mainStream;
    var canvasStream;
    var canvasAnimationFrame;
    function handleGotMedia(stream, snum) {
        log.debug("getUserMedia() got stream:", stream);
        //window.stream = stream; // why expose globally? chrome isn't closing stream...

        mainStream = stream;
        const rawVideo = document.querySelector(`video#rawGum${snum}`);
        const canvas = document.querySelector(`canvas#gum${snum}`);
        const { width, height } = resolveCaptureSize(stream);

        canvas.width = width;
        canvas.height = height;
        rawVideo.srcObject = stream;
        rawVideo.play();

        if (!canvas.captureStream) {
            pushMessage({
                text: `Canvas video capture is not supported by this browser.`,
                type: "error",
            });
            return;
        }
        drawTimestampedPreview(rawVideo, canvas, width, height);
        canvasStream = canvas.captureStream(parseInt(frameRate, 10));
        recordStream(canvasStream, 0);
        recordStream(canvasStream, 1);
        recordingActive = true;
        refreshZoomCapabilities(stream);
        refreshVideoDevices(); // labels are reliably populated post-permission

        clearTimeout(previewHideTimeout);
        previewHideTimeout = setTimeout(
            () => {
                hidePreview = true;
                previewHideTimeout = undefined;
            },
            2 * 60 * 1000
        );

        // 2 concurrent recording sessions.  end each at half desired length
        timerHandle = setInterval(
            myTimer,
            Math.floor((snipLengthSeconds * 1000) / 2)
        );
    }
    function formatOverlayTime(now) {
        const d = new Date(now);
        const localTime = d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
            hour12: false,
        });
        return `${localTime} | ${now}`;
    }
    // Draws `source` into a `canvasWidth`x`canvasHeight` box, scaled
    // uniformly (never stretched) to either fully cover it (cropping
    // overflow) or fit entirely inside it (letterboxed with bars).
    function drawFittedFrame(ctx, source, canvasWidth, canvasHeight, mode) {
        const srcWidth = source.videoWidth;
        const srcHeight = source.videoHeight;
        const scale =
            mode === "cover"
                ? Math.max(canvasWidth / srcWidth, canvasHeight / srcHeight)
                : Math.min(canvasWidth / srcWidth, canvasHeight / srcHeight);
        const drawWidth = srcWidth * scale;
        const drawHeight = srcHeight * scale;
        const offsetX = (canvasWidth - drawWidth) / 2;
        const offsetY = (canvasHeight - drawHeight) / 2;

        if (mode !== "cover") {
            // Letterbox: paint the bars the scaled frame won't reach.
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        ctx.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
    }
    function drawTimestampedPreview(rawVideo, canvas, width, height) {
        const ctx = canvas.getContext("2d");
        const draw = () => {
            if (
                rawVideo.readyState >= 2 &&
                rawVideo.videoWidth &&
                rawVideo.videoHeight
            ) {
                drawFittedFrame(ctx, rawVideo, width, height, frameFit);
            } else {
                ctx.fillStyle = "black";
                ctx.fillRect(0, 0, width, height);
            }

            if (recordTimeOverlay) {
                const now = Date.now();
                const label = formatOverlayTime(now);
                const fontSize = Math.max(14, Math.round(width / 36));
                ctx.font = `${fontSize}px monospace`;
                ctx.textBaseline = "top";
                const metrics = ctx.measureText(label);
                const pad = Math.round(fontSize * 0.4);
                ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
                ctx.fillRect(8, 8, metrics.width + pad * 2, fontSize + pad * 2);
                ctx.fillStyle = "white";
                ctx.fillText(label, 8 + pad, 8 + pad);
            }

            canvasAnimationFrame = requestAnimationFrame(draw);
        };
        draw();
    }
    var videoRefreshCount = 0;

    function isString(x) {
        return Object.prototype.toString.call(x) === "[object String]";
    }

    /*
     **  capture was observed to quit prior to cars breaking photo eye
     **  this is due to last frame captured too old.
     **  defer initiation of capture for a bit too allow some extra frames at the end
     **  (this may also help ui issues with slider and accidentally triggering download when viewing)
     */
    function deferredCapture(uploadKey) {
        setTimeout(() => {
            doCaptureAndUpload(uploadKey);
        }, 300);
    }
    async function doCaptureAndUpload(uploadKey) {
        const tag = "doCaptureAndUpload";
        log.debug(`${tag}: invoked: ${uploadKey}`);
        if (captureDisabled) {
            log.debug(`${tag}: skipping, not armed`);
            return;
        }
        captureSpinning = true; // reset after upload ok
        captureDisabled = true; // reset after 2 timer cycles
        uploadPending = uploadKey;
        log.debug(`${tag} uploadPending: ${uploadKey}`);
        captureOldest(); // stop oldest and upload it
        videoRefreshCount = 0;
    }
    const videoSnipHistory = [];
    function accrueSnips(snum) {
        //const blob = new Blob(activeSnipList[snum].snipVideoData);
        videoSnipHistory.push(activeSnipList[snum]);
        const thresh = Date.now() - snipAgeSeconds * 1000;
        while (
            videoSnipHistory.length > 0 &&
            videoSnipHistory[0].snipStart < thresh
        ) {
            videoSnipHistory.shift();
        }
        if (videoSnipHistory.length > 0) {
            oldestSnipHHMMSS = `${secondsToHHMMSS((Date.now() - videoSnipHistory[0].snipStart) / 1000)}`;
        } else {
            oldestSnipHHMMSS = "";
        }
        /*
        const msg=`videoSnipHistory: ${videoSnipHistory.length}  ${now}`
        log.debug(msg)
        pushMessage( {
                    text: msg,
                    key: "dillerup",
                });
                */
    }
    function myTimer() {
        log.debug(`myTimer`);
        captureOldest(); // keep video clips short
        if (videoRefreshCount++ > 1) {
            captureDisabled = false;
        }
    }
    function captureOldest() {
        const snum = nextSnum;
        nextSnum++;
        if (nextSnum >= mediaRecorder.length) {
            nextSnum = 0;
        }
        log.debug(`timer ${snum} next: ${nextSnum}`);
        //downloadPending = new Date().getTime();
        mediaRecorder[snum].stop();
    }
    //const mimeType = "video/webm";
    const mimeType = "video/webm";
    const fileExt = mimeType.split("/")[1];

    function growBlob(event, snum) {
        if (event && event.data && event.data.size > 0) {
            activeSnipList[snum].snipVideoData.push(event.data);
            activeSnipList[snum].snipEnd = Date.now(); // end will update with each append
        }
    }
    function recordStream(stream, snum) {
        if (!stream) {
            log.debug("recordStream skipping. no stream");
            return;
        }

        log.debug("recordStream", stream, snum);
        var options = {
            mimeType: `${mimeType}; codecs=${$videoCaptureCodec}`,
            videoBitsPerSecond: parseInt(videoBitsPerSecond, 10),
        };
        activeSnipList[snum] = newVideoSnip();
        mediaRecorder[snum] = new MediaRecorder(stream, options);

        //event is a BlobEvent
        mediaRecorder[snum].ondataavailable = (event) => {
            log.debug("Recorder data-available", snum);
            log.debug("Recorder data-available", event.data);
            growBlob(event, snum);
        };
        mediaRecorder[snum].onstop = (event) => {
            log.debug("Recorder stopped: ", event.data);
            growBlob(event, snum);
            activeSnipList[snum].isRecording = false;

            accrueSnips(snum);
            if (uploadPending) {
                doUploadToServer(activeSnipList[snum], uploadPending);
                uploadPending = undefined;
            }

            if (isDestroying) {
                return;
            }
            recordStream(stream, snum);
        };
        //mediaRecorder[snum].start(1000);
        mediaRecorder[snum].start();
        log.debug("recordStream done", snum);
    }
    async function calcClientTimeAdjustmentMs() {
        calcSpinning = true;
        var beginMS = new Date().getTime();
        try {
            const endPoint = "/requestServerEpochMS";
            const req = {
                orgId: $raceConfig.orgId,
                orgIz: $raceConfig.orgIz,
            };
            const response = await $axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            log.debug("calcClientTimeAdjustmentMs response", response);
            var doneMS = new Date().getTime();
            var elapsedMS = doneMS - beginMS;
            var middleMS = Math.round(elapsedMS / 2) + beginMS;
            if (response.data.epochMS && elapsedMS < 1000) {
                var offsetMS = middleMS - response.data.epochMS;
                $videoClientTimeAdjustmentMs = offsetMS;
                $videoClientTimeAdjustmentMarginMs = Math.round(elapsedMS / 2);
                pushMessage({
                    text: `Completed time compensation. ${offsetMS}`,
                    type: "success",
                });
            } else {
            }
        } catch (err) {
            log.debug("calcClientTimeAdjustmentMs caught:", err);
            pushMessage({
                text: err,
                type: "error",
            });
        } finally {
            calcSpinning = false;
        }
    }
    function handleTimerSelect(event) {
        log.debug("handleTimerSelect got event:", event.detail);
        if (event.detail.decoded) {
            log.debug(
                "handleTimerSelect got id:",
                event.detail.decoded.timerMqttClientId
            );
            timerId = event.detail.decoded.timerMqttClientId;
            timerName = event.detail.text;
            timerTopic = `derby/${$raceConfig.orgId}/video/${timerName}`;
            log.debug("handleTimerSelect set:", timerId);
        }
    }
    let videoDisplay = "";
    let hidePreview = false;
    $: {
        if (hidePreview) {
            videoDisplay = "display:none";
        } else {
            videoDisplay = "";
        }
    }
</script>

<h1>Capture Video</h1>

<video id="rawGum0" playsinline autoplay muted style="display:none" />
<canvas class="capture-preview" style={videoDisplay} id="gum0" />
{#if hidePreview && recordingActive}
    <div class="recording-indicator" role="status" aria-live="polite">
        <span class="recording-dot" aria-hidden="true"></span>
        RECORDING
    </div>
{/if}
{#if zoomCapabilities}
    <label
        >Zoom ({zoomLevel}x)
        <input
            type="range"
            min={zoomCapabilities.min}
            max={zoomCapabilities.max}
            step={zoomCapabilities.step}
            bind:value={zoomLevel}
            on:input={() => setZoom(zoomLevel)}
        />
    </label>
{/if}
<label>
    Hide Preview:
    <input class="big" type="checkbox" bind:checked={hidePreview} />
</label>
<label>
    Advanced:
    <input class="big" type="checkbox" bind:checked={showAdvanced} />
</label>

{#if showAdvanced}
    <label
        >Codec
        <select bind:value={$videoCaptureCodec}>
            <option>vp8</option>
            <option>vp9</option>
        </select>
    </label>

    <label
        >Resolution
        <select bind:value={resolution}>
            <option value="auto">Match Camera</option>
            <option>320x240</option>
            <option>640x480</option>
            <option>720x576</option>
            <option>1920x1080</option>
        </select>
    </label>

    <label
        >Lens
        <select bind:value={videoDeviceId}>
            <option value="">Default (environment)</option>
            {#each videoDeviceOptions as device}
                <option value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.slice(0, 8)}`}
                </option>
            {/each}
        </select>
    </label>

    <label
        >Frame Fit
        <select bind:value={frameFit}>
            <option value="letterbox">Letterbox (show full frame)</option>
            <option value="cover">Crop to fill (no bars)</option>
        </select>
    </label>

    <label
        >Frame Rate
        <select bind:value={frameRate}>
            <option>5</option>
            <option>15</option>
            <option>30</option>
        </select>
    </label>

    <label
        >videoBitsPerSecond
        <select bind:value={videoBitsPerSecond}>
            <option>500000</option>
            <option>1000000</option>
            <option>2000000</option>
            <option>8000000</option>
        </select>
    </label>
    <label>
        Record time overlay:
        <input class="big" type="checkbox" bind:checked={recordTimeOverlay} />
    </label>
    <label
        >Age of oldest snippet (seconds)
        <input bind:value={snipAgeSeconds} type="number" />
    </label>
    <label
        >Snippet length (seconds)
        <input bind:value={snipLengthSeconds} type="number" />
    </label>
    <label
        >Time adjustment [d](ms)
        <input
            bind:value={$videoClientTimeAdjustmentMs}
            type="number"
            disabled
        />
        ± {$videoClientTimeAdjustmentMarginMs}ms
    </label>
    <label
        >Time adjustment [f](ms)
        <input bind:value={$videoClientTimeFixedMs} type="number" />
    </label>
    <SpinnerButton
        on:click={calcClientTimeAdjustmentMs}
        spinning={calcSpinning}
    >
        Calculate time offset
    </SpinnerButton>
{/if}
<label
    >Perspective
    <input bind:value={$videoPerspective} placeholder="Overhead" />
</label>
<label>Linked Timer</label>
<TimerSelectByName
    on:select={handleTimerSelect}
    preSelect="Finish"
    mode={timerSelectMode}
/>

{#key timerTopic}
    <MqttSubscribeStub
        mqTopic={timerTopic}
        on:mqMessage={(e) => {
            handleRemoteRequest(e.detail);
        }}
    />
{/key}

<p />
<SpinnerButton on:click={doStart} spinning={recordingRequested}>
    Record
</SpinnerButton>
<SpinnerButton
    on:click={clickedCapture}
    spinning={captureSpinning}
    disabled={captureDisabled}
>
    Capture&Upload
</SpinnerButton>
<br />

<SpinnerButton
    on:click={clickedRequestCapture}
    spinning={remoteeSpinning}
    disabled={remoteeDisabled}
>
    Simulate [{timerName}] Capture
</SpinnerButton>
<br />
<br />
<br />
<br />
<Walkup />

<style>
    .capture-preview {
        display: block;
        width: 100%;
        max-width: 100vw;
        height: auto;
    }

    .recording-indicator {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        margin: 1rem 0;
        padding: 0.75rem 1rem;
        border: 3px solid #b00020;
        border-radius: 0.4rem;
        background: #fff0f2;
        color: #b00020;
        font-size: 1.5rem;
        font-weight: 700;
        letter-spacing: 0.08em;
    }

    .recording-dot {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        background: #d00020;
    }
</style>
