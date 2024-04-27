<script>
    import log from "loglevel";

    import { onMount, onDestroy } from "svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        statusMessage,
        getAxiosNew,
        axios,
        raceConfig,
        mqttTriggerVideoCapture,
        mqttTimerSubscribe,
        mqttTimerTopic,
        isIos,
    } from "./stores.js";

    import {
        hhmmssFmt,
        secondsToHHMMSS,
    } from "./utils.js";

    import TimerSelectByName from "./TimerSelectByName.svelte";
    import TimerSubscribeStub from "./TimerSubscribeStub.svelte";
    var timerId = "";

    var showAdvanced=false
    var mediaRecorder = [];
    var activeSnipList = [];
    var oldestSnipHHMMSS=""
    function newVideoSnip(){
        return{
            snipVideoData:[],
            snipStart: Date.now(),
            snipEnd:0,
            isRecording:true,
            pendingUploadKey: undefined,  //allow active videoto auto upload onStop
        }
    }
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
    var snipAgeSeconds = 300
    onMount(async () => {
        if (!$mqttTimerTopic) {
            $statusMessage = {
                text: `Missing selected Timer. Go to Timer Config and verify that a timer has been chosen.`,
                type: "error",
            };
        }
        if(isIos()){
            $statusMessage = {
                text: `Video capture does not work on iOS.  Please use android for video.`,
                type: "error",
            };

        }
    });
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
    function clickedCalcCapture() {
        const lo=Date.now()-60000
        const hi=lo+1500
        const sMatch=findSnipMatch(lo,hi)
        if(sMatch){

            const oldSnip=sMatch
            const hhmmss = hhmmssFmt(oldSnip.snipStart);
            const key=`${oldSnip.snipStart}-TestCalc`;
            captureSpinning = true
            doUploadToServer(oldSnip, key) 
        }
        else{
            log.debug("VCALC: no eligible snippets")
        }
    }
    function clickedAgingCapture() {
        if(videoSnipHistory.length>2){
            const oldSnip=videoSnipHistory[0];
            const hhmmss = hhmmssFmt(oldSnip.snipStart);
            const key=`${oldSnip.snipStart}-TestAge`;
            captureSpinning = true
            doUploadToServer(oldSnip, key) 
        }
    }
    function isTimeInSnip(snip,xMs,rsn){
            //log.debug(`VCALC: istis BEGIN ${rsn}: `,snip,xMs)
        //TODO: active snips!
     //       log.debug("VCALC: wtf: ",xMs,snip.snipStart,snip.snipEnd)
    //        log.debug("VCALC: wtf2: ",xMs,snip)
        const rc=(xMs > snip.snipStart && xMs < snip.snipEnd)
            rc && log.debug(`VCALC: istis ${rsn} true: `,snip,xMs)
        return rc
    }
    function getSnipDistance(snip,loMs,hiMs){
            //log.debug("VCALC: wtf3z: ",isTimeInSnip(snip,hiMs,'hcrack'))
            //log.debug("VCALC: wtf3a: ",loMs,hiMs,snip)
        const beginD=loMs-snip.snipStart
        const endD=snip.snipEnd-hiMs
            //log.debug("VCALC: wtf3b: ",beginD,endD,snip)
        return Math.min(beginD,endD)

    }
    function findSnipMatch(lo,hi){
            const candidates=videoSnipHistory.filter((snipp)=>{
                return(isTimeInSnip(snipp,lo,'lo') &&
                   isTimeInSnip(snipp,hi,'hi') )
            })
            log.debug("VCALC: candidates: ",candidates.length);
            var rc=undefined;
            var fitDistance=0
            for (let idx in candidates) {
                const snip=candidates[idx]
                const thisFit=getSnipDistance(snip,lo,hi)
            log.debug("VCALC: may tf: ",thisFit)
                if(thisFit>fitDistance){
                    fitDistance=thisFit
                    rc=snip
                }
            }
            log.debug("VCALC: using Fd: ",fitDistance)
            return rc
    }
    function clickedCapture() {
        const now = new Date().getTime();
        deferredCapture(`${now}-TestClick`);
    }

    async function doUploadToServer(videoSnip, uploadKey) {
        const videoDataBlob=new Blob(videoSnip.snipVideoData)
        $statusMessage = {
            text: `Beginning upload. ${uploadKey}`,
            type: "success",
            key: uploadKey,
        };
        try {
            const endPoint = "/requestS3PutObjectUrl";
            //const axios = await $getAxios();
            const req = {
                key: `${uploadKey}-${perspective}.webm`,
                orgId: $raceConfig.orgId,
                orgIz: $raceConfig.orgIz,
            };
            const response = await $axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            log.debug("requestS3PutObjectUrl response", response);
            if (response.data.signedUrl) {
                const options = {
                    headers: {
                        // Content-Type MUST match the params in getSignedHeader on backend!
                        // US-East-1 didn't care, but US-West-2 did...  gave us a 403 on PUT when mis-matched.
                        "Content-Type": mimeType,
                    },
                };

                const axiosGeneric = $getAxiosNew();
                $statusMessage = {
                    text: `Beginning upload s3.`,
                    type: "success",
                    key: uploadKey,
                };

                //delete axiosGeneric.defaults.headers.common["Authorization"];
                const putRc = await axiosGeneric.put(
                    response.data.signedUrl,
                    videoDataBlob,
                    options
                );
                log.debug("s3PutResponse", putRc);
                $statusMessage = {
                    text: `Completed upload s3 ${videoDataBlob.size}`,
                    type: "success",
                    key: uploadKey,
                };
            }
            if (response.data.error) {
                log.debug("requestS3PutObjectUrl failed", response);
                $statusMessage = {
                    text: response.data.error,
                    type: "error",
                };
            } else {
            }
        } catch (err) {
                log.debug("requestS3PutObjectUrl caught:", err);
            $statusMessage = {
                text: err,
                type: "error",
            };
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
            $statusMessage = {
                text: `Missing selected Timer[2].`,
                type: "error",
            };
            return;
        }

        $mqttTimerSubscribe = true;
        const snum = 0;
        recordSpinning = true;
        const constraints = {
            video: {
                width: getVideoWidth(),
                height: getVideoHeight(),
                frameRate: { ideal: parseInt(frameRate, 10), max: 30 },
                facingMode: "environment",
            },
        };
        log.debug("Using media constraints:", constraints);
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
        log.debug("getUserMedia() got stream:", stream);
        //window.stream = stream; // why expose globally? chrome isn't closing stream...

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
    const videoSnipHistory=[]
    function accrueSnips(snum){
        //const blob = new Blob(activeSnipList[snum].snipVideoData);
        videoSnipHistory.push(activeSnipList[snum])
        const thresh=Date.now() - (snipAgeSeconds*1000)
        while(videoSnipHistory.length>0 && videoSnipHistory[0].snipStart<thresh){
            videoSnipHistory.shift()
        }
        if(videoSnipHistory.length>0){
            oldestSnipHHMMSS=`${secondsToHHMMSS((Date.now() - videoSnipHistory[0].snipStart)/1000)}`
        }else{
            oldestSnipHHMMSS=""
        }
        /*
        const msg=`videoSnipHistory: ${videoSnipHistory.length}  ${now}`
        log.debug(msg)
        $statusMessage = {
                    text: msg,
                    key: "dillerup",
                };
                */

    }
    function myTimer() {
        log.debug(`myTimer`)
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
    //const videoCodecs = "codecs=vp9";
    const mimeType = "video/webm";
    const videoCodecs = "codecs=vp8";
    const fileExt = mimeType.split("/")[1];

    function growBlob(event,snum){
        if (event && event.data && event.data.size > 0) {
            activeSnipList[snum].snipVideoData.push(event.data);
            activeSnipList[snum].snipEnd=Date.now() // end will update with each append
        }
    }
    function recordStream(stream, snum) {
        if (!stream) {
            log.debug("recordStream skipping. no stream");
            return;
        }

        log.debug("recordStream", stream, snum);
        var options = {
            mimeType: `${mimeType}; ${videoCodecs}`,
            videoBitsPerSecond: parseInt(videoBitsPerSecond, 10),
        };
        activeSnipList[snum] = newVideoSnip()
        mediaRecorder[snum] = new MediaRecorder(stream, options);

        //event is a BlobEvent
        mediaRecorder[snum].ondataavailable = (event) => {
            log.debug("Recorder data-available", snum);
            log.debug("Recorder data-available", event.data);
            growBlob(event,snum)
        };
        mediaRecorder[snum].onstop = (event) => {
            log.debug("Recorder stopped: ", event.data);
            growBlob(event,snum)
            activeSnipList[snum].isRecording=false

                accrueSnips(snum)
            if (uploadPending) {
                doUploadToServer(activeSnipList[snum], uploadPending);
                uploadPending = undefined;
            }


            recordStream(mainStream, snum);
        };
        //mediaRecorder[snum].start(1000);
        mediaRecorder[snum].start();
        log.debug("recordStream done", snum);
    }
    function handleTimerSelect(event) {
        log.debug("handleTimerSelect got event:", event.detail);
        if (event.detail.decoded) {
            log.debug(
                "handleTimerSelect got id:",
                event.detail.decoded.timerMqttClientId
            );
            timerId = event.detail.decoded.timerMqttClientId;
            log.debug("handleTimerSelect set:", timerId);
        }
    }
</script>

<h1>Capture Video</h1>

<video id="gum0" playsinline autoplay muted />
<label>
    Advanced:
    <input type="checkbox" bind:checked={showAdvanced} />
</label>

{#if showAdvanced}
<label>Resolution

<select bind:value={resolution}>
    <option>320x240</option>
    <option>640x480</option>
    <option>720x576</option>
    <option>1920x1080</option>
</select>
</label>
<label>Frame Rate
<select bind:value={frameRate}>
    <option>5</option>
    <option>15</option>
    <option>30</option>
</select>
</label>
<label>videoBitsPerSecond
<select bind:value={videoBitsPerSecond}>
    <option>500000</option>
    <option>1000000</option>
    <option>2000000</option>
    <option>8000000</option>
</select>
</label>
<label>Age of oldest snippet (seconds)
<input 
    bind:value={snipAgeSeconds}
    type="number" />
</label>
{/if}
<label>Perspective
<input bind:value={perspective} />
</label>
<label>Linked Timer</label>
<TimerSelectByName on:select={handleTimerSelect} preSelect="Finish" />
{#key timerId}
    <TimerSubscribeStub
        {timerId}
        on:videoKey={(e) => {
            deferredCapture(e.detail);
        }}
    />
{/key}
<p />
<SpinnerButton on:click={doStart} spinning={recordSpinning}>
    Record
</SpinnerButton>
<SpinnerButton
    on:click={clickedCapture}
    spinning={captureSpinning}
    disabled={captureDisabled}
>
    Capture&Upload
</SpinnerButton>
<br/>
<SpinnerButton
    on:click={clickedAgingCapture}
    spinning={captureSpinning}
    disabled={captureDisabled}
>
    Upload oldest [{oldestSnipHHMMSS}]
</SpinnerButton>
<br/>
<SpinnerButton
    on:click={clickedCalcCapture}
    spinning={captureSpinning}
    disabled={captureDisabled}
>
    Upload Calculated
</SpinnerButton>
<br/>
<br/>
<br/>
<br/>
