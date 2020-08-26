<script>
    var recordButton = [];
    var mediaRecorder = [];
    var recordedBlobs = [];
    var downloadPending;
    var nextSnum = 0; // 2 streams.  this will toggle b/t 0,1
    var timerHandle;
    async function doStart(snum) {
        const constraints = {
            video: {
                width: 1280,
                height: 720,
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
            errorMsgElement.innerHTML = `navigator.getUserMedia error:${e.toString()}`;
        }
    }
    var mainStream;
    function handleGotMedia(stream, snum) {
        recordButton[snum].disabled = false;
        console.log("getUserMedia() got stream:", stream);
        window.stream = stream;

        const gumVideo = document.querySelector(`video#gum${snum}`);
        gumVideo.srcObject = stream;
        recordStream(stream, 0);
        recordStream(stream, 1);
        mainStream = stream;

        timerHandle = setInterval(myTimer, 10000);
    }
    function myTimer() {
        const snum = nextSnum;
        nextSnum++;
        if (nextSnum >= mediaRecorder.length) {
            nextSnum = 0;
        }
        console.log(`timer ${snum} next: ${nextSnum}`);
        downloadPending = new Date().getTime();
        mediaRecorder[snum].stop();
    }
    function beginDownload(snum) {
        const blob = new Blob(recordedBlobs[snum], { type: "video/webm" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = "test.webm";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 100);
    }
    function recordStream(stream, snum) {
        console.log("recordStream", stream, snum);
        var options = { mimeType: "video/webm; codecs=vp9" };
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

            if (downloadPending) {
                beginDownload(snum, downloadPending);
                downloadPending = undefined;
            }
            //clearInterval(timerHandle);
            recordStream(mainStream, snum);
        };
        mediaRecorder[snum].start(1000);
        console.log("recordStream done", snum);
    }
</script>

<h1>Capture Video</h1>

<video id="gum0" playsinline autoplay muted />
<video id="gum1" playsinline autoplay muted />
<button bind:this={recordButton[0]} on:click={()=> doStart(0)}>Record1</button>
<button bind:this={recordButton[1]} on:click={()=> doStart(1)}>Record2</button>
