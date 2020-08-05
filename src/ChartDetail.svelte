<script>
    import ChartHotSpot from "./ChartHotSpot.svelte";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";
    import ChartClickLogger from "./ChartClickLogger.svelte";
    import {
        chartClickLoggerId,
        chartClickLoggerShow,
        getChartCacheKey,
    } from "./stores.js";
    import { parseHeatPos } from "./utils.js";

    export let params = {};
    const loggedImgPositions = {};
    var showChartClickLogger = false;
    var bmdFromDexie = {};
    var bracketImgSrc = "/archive/charts/progessSpinner.png";
    var mounted = false;
    var imageLoaded = false;
    var jsReady = false;
    onMount(async () => {
        mounted = true;
        tryBuild();
        await refreshDataFromDb();
    });
    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.get(params.chartId);
        console.log("refreshDataFromDb gave:", bmdFromDexie);

        const chartCacheKey = getChartCacheKey();
        bracketImgSrc = `/data/brackets/${bmdFromDexie.imgPath}?cacheKey=${chartCacheKey}`;
        //await getChartImage(bmdFromDexie.imgPath);
        await getChartImage(bmdFromDexie.jsonPath);
    };
    const getChartImage = async (imgPath) => {
        console.log("getChartImage", imgPath);

        const chartCacheKey = getChartCacheKey();
        axios
            .get(`/data/brackets/${imgPath}?cacheKey=${chartCacheKey}`)
            .then((response) => {
                console.log("ChartDetail  brackets2 axios success", response);
                brackets2 = response.data;

                checkAndActivateScroll();
            })
            .catch((err) => {
                console.log("ChartDetail failed: " + err);
                if (!$chartClickLoggerId) {
                    //don't do anything when empty... enables panMove
                    return;
                }
            });
    };
    console.log("chartDetail params:", params);

    // placeholder.   brackets json is downloaded that will match chart image
    var brackets2 = {
        imgSize: { height: 1700, width: 2200 },
        imgPositions: {},
        seeds: [],
        progress: {},
    };

    let scale = 1;
    function logClickXY(x, y) {
        if (!$chartClickLoggerId) {
            //don't do anything when empty... enables panMove
            return;
        }
        // todo: this SUCKS... hardcoded header size?
        y = y - 130;
        const m = {
            //left: event.clientX,
            //top: event.clientY,
            left: x,
            top: y,
        };
        loggedImgPositions[$chartClickLoggerId] = m;
        brackets2.imgPositions[$chartClickLoggerId] = m;
        brackets2.imgPositions = brackets2.imgPositions; // force re-render?

        console.log(
            `loggedImagePos: ${$chartClickLoggerId}: `,
            JSON.stringify(loggedImgPositions)
        );
        bumpPos();
    }
    function logClickPosition(event) {
        if (!$chartClickLoggerId) {
            //don't do anything when empty... enables panMove
            return;
        }
        const [px, py] = iim(event);

        // imgSize();
    }
    var thisChartImage;
    function iim(e) {
        console.log(
            `thisChartImage: pagex: ${event.pageX} pageY: ${event.pageY}`
        );
        console.log("thisChartImage:", thisChartImage);

        const bounds = thisChartImage.getBoundingClientRect();
        var left = bounds.left;
        var top = bounds.top;
        var x = event.pageX - left;
        var y = event.pageY - top;
        var cw = thisChartImage.clientWidth;
        var ch = thisChartImage.clientHeight;
        var iw = thisChartImage.naturalWidth;
        var ih = thisChartImage.naturalHeight;
        var px = (x / cw) * iw;
        var py = (y / ch) * ih;
        console.log(
            "click on " +
                thisChartImage.tagName +
                " at pixel (" +
                px +
                "," +
                py +
                ") mouse pos (" +
                x +
                "," +
                y +
                ") relative to boundingClientRect at (" +
                left +
                "," +
                top +
                ") client image size: " +
                cw +
                " x " +
                ch +
                " natural image size: " +
                iw +
                " x " +
                ih
        );

        return [px, py];
    }

    function bumpPlace() {
        var placeNumber = $chartClickLoggerId.replace(/^[a-zA-Z]*/, "");
        placeNumber = parseInt(placeNumber, 10);
        placeNumber++;

        $chartClickLoggerId = `Place${placeNumber}`;
    }
    const bumpPos = () => {
        if ($chartClickLoggerId.startsWith("Place")) {
            bumpPlace();
            return;
        }
        var [pos, letter] = parseHeatPos($chartClickLoggerId);
        pos = parseInt(pos, 10);
        if (letter === "A") {
            letter = "B";
        } else {
            letter = "A";
            pos++;
        }
        pos = pos.toString();
        if (pos.length == 1) {
            pos = `0${pos}`;
        }
        $chartClickLoggerId = `${pos}${letter}`;
    };
    function imgSize() {
        var myImg = document.querySelector("#bracketImage");
        var currWidth = myImg.clientWidth;
        var currHeight = myImg.clientHeight;
        console.log(
            "Current width=" +
                currWidth +
                ", " +
                "Original height=" +
                currHeight
        );
        scale = 0.9 * scale;
        brackets2.imgPositions = brackets2.imgPositions; // force re-render?

        myImg.style.width = brackets2.imgSize.width * scale + "px";
        myImg.style.height = brackets2.imgSize.height * scale + "px";
    }
    const imgLoadComplete = () => {
        console.log(`imgLoadComplete: `);
        checkAndActivateScroll();
        imageLoaded = true;
        tryBuild();
    };

    const getUrlVars = () => {
        var vars = {};
        var parts = window.location.href.replace(
            /[?&]+([^=&]+)=([^&]*)/gi,
            function (m, key, value) {
                vars[key] = value;
            }
        );
        return vars;
    };

    function hotMoved(event, posKey) {
        console.log("hotMoved:" + event + " posKey:" + posKey);
        console.log("hotMoved top:" + event.detail.top);
        console.log("hotMoved left:" + event.detail.left);
        brackets2.imgPositions[posKey].top = event.detail.top;
        brackets2.imgPositions[posKey].left = event.detail.left;
    }
    const checkAndActivateScroll = () => {
        var URLscrollToVar = getUrlVars()["scrollTo"];
        console.log("URLscrollToVar: ", URLscrollToVar);
        if (URLscrollToVar) {
            var x = brackets2.imgPositions[String(URLscrollToVar) + "A"].left;
            var y = brackets2.imgPositions[String(URLscrollToVar) + "A"].top;
            window.scrollTo(x, y);
        }
    };
    function copyJson() {
        console.log("CD: copyJson");
        const jsonClone = JSON.stringifyt(brackets2);
        const bracketClone = JSON.parse(jsonClone);
        delete bracketClone.imgPositions.seedx;
        delete bracketClone.seeds;
        delete bracketClone.progress;
        navigator.clipboard.writeText(JSON.stringify(bracketsClone));
    }
    const jqLoaded = () => {
        console.log("jqloaded");
        jsReady = true;
        tryBuild();
    };
    const tryBuild = () => {
        if (mounted && jsReady && imageLoaded) {
            console.log("GO");
            jQuery("#bracketImage").on("click", function (event) {
                var x = event.pageX - this.offsetLeft;
                var y = event.pageY - this.offsetTop;
                console.log(
                    "jquery X Coordinate: " + x + " Y Coordinate: " + y
                );
                logClickXY(x, y);
            });
        }
    };
</script>

<style>
    div.container {
        width: 100%;
        height: 30px;
    }
</style>

<svelte:head>
    <script
        src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js"
        on:load={jqLoaded}>

    </script>
</svelte:head>
<h3 style="text-align:center;z-index: 9;">
    Chart Name: {bmdFromDexie.bracketName}
</h3>
<div id="top" class="container" style="position: absolute; z-index: 8;">

    {#each Object.values(brackets2.imgPositions) as bracket, pos}
        <ChartHotSpot
            pos={Object.keys(brackets2.imgPositions)[pos]}
            {scale}
            left={bracket.left}
            top={bracket.top}
            chartId={params.chartId}
            on:hotMove={(e) => hotMoved(e, Object.keys(brackets2.imgPositions)[pos])}
            isPannable={$chartClickLoggerShow}
            isSeed={brackets2.seeds.indexOf(Object.keys(brackets2.imgPositions)[pos]) > -1 ? true : false} />
    {/each}
    <img
        on:load={imgLoadComplete}
        style="position: relative; z-index: 1; "
        id="bracketImage"
        src={bracketImgSrc}
        alt="bracketImage"
        bind:this={thisChartImage}
        on:click={logClickPosition} />

    <ChartClickLogger on:copyJson={copyJson} />
</div>
