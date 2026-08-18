<script>
    import log from "loglevel";

    import { push, pop, replace } from "svelte-spa-router";
    import ChartHotSpot from "./ChartHotSpot.svelte";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";
    import ChartClickLogger from "./ChartClickLogger.svelte";
    import {
        chartClickLoggerId,
        chartClickLoggerShow,
        getChartCacheKey,
        spinnerPanelBusy,
    } from "./stores.js";
    import { parseHeatPos, sleep, getChartJson } from "./utils.js";

    export let params = {};
    const loggedImgPositions = {};
    var showChartClickLogger = false;
    var bmdFromDexie = {};
    var bracketImgSrc = "";
    var mounted = false;
    var imageLoaded = false;
    var jsReady = false;
    onMount(async () => {
        $spinnerPanelBusy = true;
        mounted = true;
        tryBuild();
        await refreshDataFromDb();
        $spinnerPanelBusy = false;
    });
    const refreshDataFromDb = async (trigger) => {
        log.debug("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.get(params.chartId);
        log.debug("refreshDataFromDb gave:", bmdFromDexie);
        setWidthOverride(bmdFromDexie.imgPath);

        const chartCacheKey = getChartCacheKey();
        bracketImgSrc = `/data/brackets/${bmdFromDexie.imgPath}?cacheKey=${chartCacheKey}`;
        //await getChartImage(bmdFromDexie.imgPath);
        const chartjson = await getChartJson(bmdFromDexie);
        log.debug("refreshDataFromDb chartjson:", chartjson);
        if (chartjson) {
            brackets2 = chartjson;
            checkAndActivateScroll();
        } else {
            if (!$chartClickLoggerId) {
                //don't do anything when empty... enables panMove
                return;
            }
        }
    };
    var widthOverride = "";
    var imgStyle = "";
    const imgStyleBase = "position: relative; z-index: 1;";

    function setWidthOverride(imgPath) {
        log.debug("setWidthOverride :", imgPath);
        if (imgPath === "AASBD/Single/06single.png") {
        }
        if (imgPath === "AASBD/Single/32single.png") {
            widthOverride = "width: 3000px;";
        }
        //AASBD/Double/24double.png?cacheKey=1654559811FromDevEnvsh

        if (imgPath === "AASBD/Double/24double.png") {
            widthOverride = "width: 3000px;";
        }
        imgStyle = imgStyleBase + widthOverride;
    }

    log.debug("chartDetail params:", params);

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

        log.debug(
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
        log.debug(
            `thisChartImage: pagex: ${event.pageX} pageY: ${event.pageY}`
        );
        log.debug("thisChartImage:", thisChartImage);

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
        log.debug(
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
        log.debug(
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
        log.debug(`imgLoadComplete: `);
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
        log.debug("hotMoved:" + event + " posKey:" + posKey);
        log.debug("hotMoved top:" + event.detail.top);
        log.debug("hotMoved left:" + event.detail.left);
        brackets2.imgPositions[posKey].top = event.detail.top;
        brackets2.imgPositions[posKey].left = event.detail.left;
    }
    /** works on laptop, but not phone
    const checkAndActivateScroll = () => {
        var URLscrollToVar = getUrlVars()["scrollTo"];
        log.debug("URLscrollToVar: ", URLscrollToVar);
        if (URLscrollToVar) {
            var x = brackets2.imgPositions[String(URLscrollToVar) + "A"].left;
            var y = brackets2.imgPositions[String(URLscrollToVar) + "A"].top;
            window.scrollTo(x, y);
        }
    };
    */
    async function checkAndActivateScroll() {
        var URLscrollToVar = getUrlVars()["scrollTo"];

        log.debug("URLscrollToVar showspot0: ", URLscrollToVar);
        await sleep(500); // shouldn't need this, but, sigh.
        log.debug("URLscrollToVar showspot1: ", URLscrollToVar);
        if (URLscrollToVar) {
            // try w/o "A", if that fails try appending an "A"
            showSpot(URLscrollToVar) || showSpot(URLscrollToVar + "A");
        }
    }
    function copyJson() {
        log.debug("CD: copyJson");
        const jsonClone = JSON.stringify(brackets2);
        const bracketClone = JSON.parse(jsonClone);
        delete bracketClone.imgPositions.seedx;
        delete bracketClone.seeds;
        delete bracketClone.progress;
        log.debug("CD: copyJson: ", JSON.stringify(bracketClone));
        navigator.clipboard.writeText(JSON.stringify(bracketClone));
    }
    const jqLoaded = () => {
        log.debug("jqloaded");
        jsReady = true;
        tryBuild();
    };
    const tryBuild = () => {
        if (mounted && jsReady && imageLoaded) {
            log.debug("GO");
            jQuery("#bracketImage").on("click", function (event) {
                var x = event.pageX - this.offsetLeft;
                var y = event.pageY - this.offsetTop;
                log.debug("jquery X Coordinate: " + x + " Y Coordinate: " + y);
                logClickXY(x, y);
            });
        }
    };
    var key;
    var keyCode;
    var np = 0;
    function showSpot(id) {
        log.debug(`showSpot: ${id}`);
        var element = document.getElementById(id);
        if (element) {
            element.scrollIntoView();
            return true;
        }
        return false;
    }
    function handleKeydown(event) {
        key = event.key;
        keyCode = event.keyCode;
        console.log(`key: ${key} keyCode: ${keyCode}`);
        if (key === "j") {
            np++;
        }
        if (key === "k") {
            np--;
            //showSpot("14A")
        }
        if (np < 1) np = 1;
        if (np > 20) np = 20;

        showSpot(zeroFill(np, 2) + "A");
    }
    function zeroFill(number, width) {
        width -= number.toString().length;
        if (width > 0) {
            return (
                new Array(width + (/\./.test(number) ? 2 : 1)).join("0") +
                number
            );
        }
        return number + ""; // always return a string
    }
    function gotoChartCardList() {
        replace(`/ChartDetailCardList/${params.chartId}`);
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<svelte:head>
    <!-- skip jquery load unless editing chart-->
    {#if $chartClickLoggerShow}
        <script
            src="https://cdnjs.cloudflare.com/ajax/libs/jquery/1.12.1/jquery.min.js"
            on:load={jqLoaded}
        >
        </script>
    {/if}
</svelte:head>
<h3 style="text-align:center;z-index: 9;" on:click={gotoChartCardList}>
    Chart Name: {bmdFromDexie.bracketName}
</h3>
<div id="top" class="container" style="position: absolute; z-index: 8;">
    {#each Object.values(brackets2.imgPositions) as bracket, pos}
        <ChartHotSpot
            chartJson={brackets2}
            id={pos}
            pos={Object.keys(brackets2.imgPositions)[pos]}
            {scale}
            left={bracket.left}
            top={bracket.top}
            chartId={params.chartId}
            on:hotMove={(e) =>
                hotMoved(e, Object.keys(brackets2.imgPositions)[pos])}
            isPannable={$chartClickLoggerShow}
        />
    {/each}
    {#if bracketImgSrc}
        <img
            on:load={imgLoadComplete}
            style={imgStyle}
            id="bracketImage"
            src={bracketImgSrc}
            alt="bracketImage"
            bind:this={thisChartImage}
            on:click={logClickPosition}
        />
    {/if}

    <ChartClickLogger on:copyJson={copyJson} />
</div>

<style>
    div.container {
        width: 100%;
        height: 30px;
    }
</style>
