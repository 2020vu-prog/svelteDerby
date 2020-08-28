<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        statusMessage,
        getAxios,
        raceConfig,
        mqttTriggerVideoCapture,
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
    async function doCapture(videoData) {
        try {
            const endPoint = "/requestS3PutObjectUrl";
            const axios = await $getAxios();
            const req = {
                key:
                    `media/${$raceConfig.orgId}/ZZZ_` +
                    new Date().getTime().toString(),
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

                delete axiosGeneric.defaults.headers.common["Authorization"];
                const putRc = await axiosGeneric.put(
                    response.data.signedUrl,
                    videoData,
                    options
                );
                console.log("s3PutResponse", putRc);
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
    async function doStart() {
        const snum = 0;
        recordSpinning = true;
        const constraints = {
            video: {
                //width: 1280,
                //height: 720,
                width: 320,
                height: 240,
                frameRate: { ideal: 15, max: 30 },
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
            //errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
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
        doCaptureAndUpload($mqttTriggerVideoCapture);
    }
    async function doCaptureAndUpload(uploadKey) {
        if (captureDisabled) {
            console.log("doCaptureAndUpload: skipping, not armed");
            return;
        }
        captureSpinning = true; // reset after upload ok
        captureDisabled = true; // reset after 2 timer cycles
        uploadPending = uploadKey ? uploadKey : new Date().getTime();
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
    function beginUpload(snum) {
        const blob = new Blob(recordedBlobs[snum]);
        doCapture(blob);
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
        console.log("recordStream", stream, snum);
        var options = {
            mimeType: `${mimeType}; ${videoCodecs}`,
            videoBitsPerSecond: 1000000,
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
<video id="gum1" playsinline autoplay muted />
<SpinnerButton on:click={doStart} spinning={recordSpinning}>
    Record
</SpinnerButton>
<SpinnerButton
    on:click={doCaptureAndUpload}
    spinning={captureSpinning}
    disabled={captureDisabled}>
    Capture&Upload
</SpinnerButton>
