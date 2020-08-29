<script>
    import { onDestroy } from "svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        statusMessage,
        getAxios,
        raceConfig,
        mqttTriggerVideoCapture,
        mqttTimerSubscribe,
    } from "./stores.js";
    var mediaRecorder = [];
    var recordedBlobs = [];
    var downloadPending;
    var uploadPending;
    var nextSnum = 0; // 2 streams.  this will toggle b/t 0,1
    var timerHandle;
    var recordSpinning = false;
    var captureSpinning = false;
    var captureDisabled = true;
    var resolution = "640x480";
    var frameRate = "15";
    var videoBitsPerSecond = "1000000";
    const tag = "CaptureVideo";
    var perspective = "Finish";

    onDestroy(() => {
        $mqttTimerSubscribe = false;
        if (timerHandle) {
            clearInterval(timerHandle);
            timerHandle = undefined;
        }
        if (mainStream) {
            stopBothVideoAndAudio(mainStream);
            mainStream = undefined;
        }
        mediaRecorder.forEach((mr) => mr.stop());
        console.log(`${tag} onDestroy done`);
    });
    // stop both mic and camera
    function stopBothVideoAndAudio(stream) {
        stream.getTracks().forEach(function (track) {
            if (track.readyState == "live") {
                track.stop();
            }
        });
    }
    function clickedCapture() {
        const now = new Date().getTime();
        deferredCapture(`${now}-TestClick`);
    }

    async function beginCapture(videoData, uploadKey) {
        $statusMessage = {
            text: `Beginning upload.`,
            type: "success",
            key: uploadKey,
        };
        try {
            const endPoint = "/requestS3PutObjectUrl";
            const axios = await $getAxios();
            const req = {
                key: `media/${$raceConfig.orgId}/${uploadKey}-${perspective}`,
                orgId: $raceConfig.orgId,
                orgIz: $raceConfig.orgIz,
            };
            const response = await axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            console.log("requestS3PutObjectUrl response", response);
            if (response.data.signedUrl) {
                const options = {
                    headers: {
                        "Content-Type": mimeType,
                    },
                };

                const axiosGeneric = axios.create({
                    headers: { "X-Custom-Header": "none" },
                });
                $statusMessage = {
                    text: `Beginning upload s3.`,
                    type: "success",
                    key: uploadKey,
                };

                delete axiosGeneric.defaults.headers.common["Authorization"];
                const putRc = await axiosGeneric.put(
                    response.data.signedUrl,
                    videoData,
                    options
                );
                console.log("s3PutResponse", putRc);
                $statusMessage = {
                    text: `Completed upload s3 ${videoData.size}`,
                    type: "success",
                    key: uploadKey,
                };
            }
            if (response.data.error) {
                console.log("requestS3PutObjectUrl failed", response);
                $statusMessage = {
                    text: response.data.error,
                    type: "error",
                };
            } else {
            }
        } catch (err) {
            $statusMessage = {
                text: err,
                type: "error",
            };
        } finally {
            captureSpinning = false;
        }
    }
    function parseRez() {
        console.log("parseRez:", resolution);
        return resolution.split("x");
    }
    function getVideoHeight() {
        return parseRez()[1];
    }
    function getVideoWidth() {
        return parseRez()[0];
    }
    async function doStart() {
        $mqttTimerSubscribe = true;
        const snum = 0;
        recordSpinning = true;
        const constraints = {
            video: {
                //width: 1280,
                //height: 720,
                width: getVideoWidth(),
                height: getVideoHeight(),
                frameRate: { ideal: parseInt(frameRate, 10), max: 30 },
                facingMode: "environment",
            },
        };
        console.log("Using media constraints:", constraints);
        init(constraints, snum);
    }
    async function init(constraints, snum) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(
                constraints
            );
            handleGotMedia(stream, snum);
        } catch (e) {
            console.error("navigator.getUserMedia error:", e);
            $statusMessage = {
                text: e,
                type: "error",
            };
            //errorMsgElement.innerHTML = `navigator.getUserMedia error: ${ e.toString() }`;
        }
    }
    var mainStream;
    function handleGotMedia(stream, snum) {
        console.log("getUserMedia() got stream:", stream);
        window.stream = stream;

        const gumVideo = document.querySelector(`video#gum${snum}`);
        gumVideo.srcObject = stream;
        recordStream(stream, 0);
        recordStream(stream, 1);
        mainStream = stream;

        timerHandle = setInterval(myTimer, 2500);
    }
    var videoRefreshCount = 0;
    $: {
        deferredCapture(`${$mqttTriggerVideoCapture}`);
    }
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
        if (captureDisabled) {
            console.log(`${tag}: skipping, not armed`);
            return;
        }
        captureSpinning = true; // reset after upload ok
        captureDisabled = true; // reset after 2 timer cycles
        uploadPending = uploadKey;
        console.log(`${tag} uploadPending: ${uploadKey}`);
        captureOldest(); // stop oldest and upload it
        videoRefreshCount = 0;
    }
    function myTimer() {
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
        console.log(`timer ${snum} next: ${nextSnum}`);
        //downloadPending = new Date().getTime();
        mediaRecorder[snum].stop();
    }
    //const mimeType = "video/webm";
    //const videoCodecs = "codecs=vp9";
    const mimeType = "video/webm";
    const videoCodecs = "codecs=vp8";
    const fileExt = mimeType.split("/")[1];
    function beginUpload(snum, uploadKey) {
        const blob = new Blob(recordedBlobs[snum]);
        beginCapture(blob, uploadPending);
    }
    function beginDownload(snum) {
        const blob = new Blob(recordedBlobs[snum], { type: mimeType });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `test.${fileExt}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
    function recordStream(stream, snum) {
        if (!stream) {
            console.log("recordStream skipping. no stream");
            return;
        }

        console.log("recordStream", stream, snum);
        var options = {
            mimeType: `${mimeType}; ${videoCodecs}`,
            videoBitsPerSecond: parseInt(videoBitsPerSecond, 10),
        };
        recordedBlobs[snum] = [];
        mediaRecorder[snum] = new MediaRecorder(stream, options);

        //event is a BlobEvent
        mediaRecorder[snum].ondataavailable = (event) => {
            console.log("Recorder data-available", snum);
            console.log("Recorder data-available", event.data);
            if (event.data && event.data.size > 0) {
                recordedBlobs[snum].push(event.data);
            }
        };
        mediaRecorder[snum].onstop = (event) => {
            console.log("Recorder stopped: ", event.data);
            if (event.data && event.data.size > 0) {
                recordedBlobs[snum].push(event.data);
            }

            if (uploadPending) {
                beginUpload(snum, uploadPending);
                uploadPending = undefined;
            }
            if (downloadPending) {
                beginDownload(snum, downloadPending);
                downloadPending = undefined;
            }
            //clearInterval(timerHandle);

            recordStream(mainStream, snum);
        };
        //mediaRecorder[snum].start(1000);
        mediaRecorder[snum].start();
        console.log("recordStream done", snum);
    }
</script>

<h1>Capture Video</h1>

<video id="gum0" playsinline autoplay muted />
<label>Resolution</label>
<select bind:value={resolution}>
    <option>320x240</option>
    <option>640x480</option>
    <option>720x576</option>
    <option>1920x1080</option>
</select>
<label>Frame Rate</label>
<select bind:value={frameRate}>
    <option>5</option>
    <option>15</option>
    <option>30</option>
</select>
<label>videoBitsPerSecond</label>
<select bind:value={videoBitsPerSecond}>
    <option>500000</option>
    <option>1000000</option>
    <option>8000000</option>
</select>
<label>Perspective</label>
<input bind:value={perspective} />
<p />
<SpinnerButton on:click={doStart} spinning={recordSpinning}>
    Record
</SpinnerButton>
<SpinnerButton
    on:click={clickedCapture}
    spinning={captureSpinning}
    disabled={captureDisabled}>
    Capture&Upload
</SpinnerButton>
