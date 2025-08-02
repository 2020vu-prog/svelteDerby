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
        videoClientTimeAdjustmentMs,
        videoClientTimeAdjustmentMarginMs
    } from "./stores.js";

    import {
        sleep,
        hhmmssFmt,
        secondsToHHMMSS,
    } from "./utils.js";

    const { v4: uuidv4 } = require("uuid");
    import TimerSelectByName from "./TimerSelectByName.svelte";
    import MqttSubscribeStub from "./MqttSubscribeStub.svelte";
    var timerId = "";
    var timerName = "";
    var timerTopic="";

    var showAdvanced=false
    var mediaRecorder = [];
    var activeSnipList = [];
    var oldestSnipHHMMSS=""
    const mqttMsgKey="mqttMsgKey"

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
    var remoteeSpinning = false;
    var calcSpinning = false;
    var remoteeDisabled = false;
    var resolution = "640x480";
    var frameRate = "15";
    var videoBitsPerSecond = "1000000";
    const tag = "CaptureVideo";
    var snipAgeSeconds = 300
    var snipLengthSeconds=6
    var timerSelectMode="normal"
    $:{ if(recordSpinning){
            timerSelectMode="disabled"
        }else{
            timerSelectMode="normal"

        }
}
    onMount(async () => {
        if(isIos()){
            pushMessage( {
                text: `Video capture does not work on iOS.  Please use android for video.`,
                type: "error",
            });

        }
    });
    onDestroy(() => {
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

    async function handleRemoteRequest(json){
        const tag = "handleRemoteRequest";
        //const json=JSON.parse(jsonString)
        log.debug(`${tag}: invoked: ${JSON.stringify(json)}`);

        auditClientTime(json.issuedMs,tag)
        await calcClientTimeAdjustmentMs();

        if(!json.tgtTimeMs){
            log.error(`${tag}: INVALID`);
            return
        }
        if(!json.prefix){
            log.error(`${tag}: INVALID`);
            return
        }
        const tgtAdjMs=json.tgtTimeMs+$videoClientTimeAdjustmentMs
        const lo=tgtAdjMs-500
        const hi=tgtAdjMs+500
        const futureHi=(hi - Date.now())+5000
        if (futureHi>0){ //wait for video capture if hi is 'now-ish' or future
            pushMessage( {
                    text: `Video upload in [${futureHi/1000}] seconds.`,
                    key: mqttMsgKey,
                    type: "success",
                    TTL:Date.now()+futureHi,
            });
            log.debug(`${tag}: waiting ${futureHi}`);
            await sleep(futureHi)
            log.debug(`${tag}: waited  ${futureHi}`);
        }
        else{
            log.debug(`${tag}: noWait ${futureHi}`);
            pushMessage( {
                    text: `Video upload processing.`,
                    key: mqttMsgKey,
                    type: "success",
            });

        }

        const sMatch=findSnipMatch(lo,hi)
        if(sMatch){
            const oldSnip=sMatch
            const hhmmss = hhmmssFmt(oldSnip.snipStart);
            const key=`${oldSnip.snipStart}-TestRmt`;
            captureSpinning = true
            oldSnip.tgtTimeMs=tgtAdjMs
            doUploadToServer(oldSnip, json.prefix) 
        }else{

            pushMessage( {
                text: `Remote Video capture snip NOT FOUND!.`,
                type: "error",
            });

        }
    }
    function nowFloor(){
        return Math.floor(Date.now()/5000)*5000
    }   
    async function clickedRequestCapture() {
        if(!timerName){
            pushMessage( {
                text: `No timer selected.`,
                type: "error",
                key: mqttMsgKey,
            });
            return
        }

            remoteeSpinning = true
        pushMessage( {
            text: `Beginning Request.`,
            type: "success",
            key: mqttMsgKey,
        });
        try {
            const endPoint = "/requestVideoUpload";
            const req = {
                tgtTimeMs:nowFloor()+5000,
                timerName: timerName,
                orgId: $raceConfig.orgId,
                orgIz: $raceConfig.orgIz,
            };
            const response = await $axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            log.debug("clickedRequestCapture response", response);
            pushMessage( {
                text: `Completed [${timerName}] Request.`,
                type: "success",
                key: mqttMsgKey,
            });
        } catch (err) {
                log.debug("clickedRequestCapture caught:", err);
            pushMessage( {
                text: err,
                type: "error",
            });
        } finally {
            remoteeSpinning = false;
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

    function embedMeta(uploadKey,videoSnip){
        let tgtTimeMs=videoSnip.tgtTimeMs
        if(! tgtTimeMs){
            const m=/\d\d\d\d+/.exec(uploadKey);
            log.debug(`infer tgtTime: ${JSON.stringify(m)}`)
            if(m && m.length>0){
                const candidate=parseInt(m[0])
                if (candidate>=videoSnip.snipStart
                && candidate<=videoSnip.snipEnd){
                    tgtTimeMs=candidate
                }
            }
        }
        // LANDMINE!!
        // . s3 upload works with long fname/url,
        // but mediaconvert job submit FAILS when ss3 url too long :-(
        // . limit approx 256 chars?!?!?!
        const meta={
               // perspective: $videoPerspective,
                p: $videoPerspective,
                //snipStart: videoSnip.snipStart,
                ss: videoSnip.snipStart,
                //snipEnd: videoSnip.snipEnd,
                lMs: videoSnip.snipEnd-videoSnip.snipStart,
                toMs: tgtTimeMs-videoSnip.snipStart,
                n : timerName,
        }
        const metaJson=JSON.stringify(meta)
        const metaEnc=encodeURIComponent(metaJson)
        log.debug(`metaEnc: ${metaEnc}`)
        const regex = /%/gi;
        const metaEnc2=metaEnc.replaceAll(regex,'_')
        log.debug(`metaEnc2: ${metaEnc2}`)

        //return $videoPerspective
        return `__${metaEnc2}__`

    }
    function auditClientTime(issuedMs,tag){
        const offset=issuedMs - Date.now()
        log.debug(`auditClientTime ${tag}: ${offset}`)
    }
    async function doUploadToServer(videoSnip, uploadKey ){
        const tag='doUploadToServer'
        const videoDataBlob=new Blob(videoSnip.snipVideoData)
        pushMessage( {
            text: `Beginning upload. ${uploadKey}`,
            type: "success",
            key: uploadKey,
        });
        try {
            const endPoint = "/requestS3PutObjectUrl";
            //const axios = await $getAxios();
            if(!$videoPerspective){
                $videoPerspective=uuidv4().substring(0, 5);
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
                auditClientTime(response.data.issuedMs,tag)
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
                pushMessage( {
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
                pushMessage( {
                    text: `Completed upload s3 ${videoDataBlob.size}`,
                    type: "success",
                    key: uploadKey,
                });
            }
            if (response.data.error) {
                log.debug("requestS3PutObjectUrl failed", response);
                pushMessage( {
                    text: response.data.error,
                    type: "error",
                });
            } else {
            }
        } catch (err) {
                log.debug("requestS3PutObjectUrl caught:", err);
            pushMessage( {
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
            pushMessage( {
                text: `Missing selected Timer[2].`,
                type: "error",
            });
            return;
        }
        if( snipLengthSeconds >12 || snipLengthSeconds <4 ){
       
            pushMessage( {
                text: `Snip length s/b 4<->12.`,
                type: "error",
            });
            return;
        }

        showAdvanced=false
        hidePreview=false
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
            pushMessage( {
                text: e,
                type: "error",
            });
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

        // 2 concurrent recording sessions.  end each at half desired length
        timerHandle = setInterval(myTimer, Math.floor((snipLengthSeconds*1000)/2));
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
        pushMessage( {
                    text: msg,
                    key: "dillerup",
                });
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
    const mimeType = "video/webm";
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
            mimeType: `${mimeType}; codecs=${$videoCaptureCodec}`,
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
    async function calcClientTimeAdjustmentMs(){
        
        calcSpinning = true;
        var beginMS=new Date().getTime();
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
            var doneMS=new Date().getTime();
            var elapsedMS=(doneMS-beginMS);
            var middleMS=Math.round((elapsedMS/2)+beginMS);
            if(response.data.epochMS && elapsedMS<1000){
                var offsetMS=middleMS-response.data.epochMS;
                $videoClientTimeAdjustmentMs=offsetMS;
                $videoClientTimeAdjustmentMarginMs= Math.round(elapsedMS/2);
                pushMessage( {
                    text: `Completed time compensation. ${offsetMS}`,
                    type: "success",
                });
            }
            else{

            }
        } catch (err) {
                log.debug("calcClientTimeAdjustmentMs caught:", err);
            pushMessage( {
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
            timerTopic = `derby/${$raceConfig.orgId}/video/${timerName}`
            log.debug("handleTimerSelect set:", timerId);
        }
    }
    let videoDisplay=''
    let hidePreview=false
    $:{
        if(hidePreview){
            videoDisplay="display:none"
        }else{
            videoDisplay=""
        }
    }
</script>

<h1>Capture Video</h1>

<video style={videoDisplay} id="gum0" playsinline autoplay muted />
<label>
    Hide Preview:
    <input class="big" type="checkbox" bind:checked={hidePreview} />
</label>
<label>
    Advanced:
    <input class="big" type="checkbox" bind:checked={showAdvanced} />
</label>

{#if showAdvanced}

<label>Codec
<select bind:value={$videoCaptureCodec}>
    <option>vp8</option>
    <option>vp9</option>
</select>
</label>

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
<label>Snippet length (seconds)
    <input 
        bind:value={snipLengthSeconds}
        type="number" />
</label>
<label>Time adjustment (ms)
    <input 
        bind:value={$videoClientTimeAdjustmentMs}
        type="number" disabled/>
    ± {$videoClientTimeAdjustmentMarginMs}ms

</label>
<SpinnerButton on:click={calcClientTimeAdjustmentMs} spinning={calcSpinning}>
    Calculate time offset
</SpinnerButton>
{/if}
<label>Perspective
<input bind:value={$videoPerspective}
placeholder="Overhead"
 />
</label>
<label>Linked Timer</label>
<TimerSelectByName on:select={handleTimerSelect} preSelect="Finish" mode={timerSelectMode}/>

{#key timerTopic}
    <MqttSubscribeStub
        mqTopic={timerTopic}
        on:mqMessage={(e) => {
            handleRemoteRequest(e.detail);
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
    on:click={clickedRequestCapture}
    spinning={remoteeSpinning}
    disabled={remoteeDisabled}
>
   Simulate [{timerName}] Capture
</SpinnerButton>
<br/>
<br/>
<br/>
<br/>
<Walkup/>
