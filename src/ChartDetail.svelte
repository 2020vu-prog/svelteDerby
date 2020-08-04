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
    onMount(async () => {
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
    const logClickPosition = (event) => {
        if (!$chartClickLoggerId) {
            //don't do anything when empty... enables panMove
            return;
        }
        const m = {
            //clientX: event.clientX,
            //clientY: event.clientY,
            left: event.clientX,
            top: event.clientY,
            //chartPosition: $chartClickLoggerId,
        };
        loggedImgPositions[$chartClickLoggerId] = m;
        brackets2.imgPositions[$chartClickLoggerId] = m;
        brackets2.imgPositions = brackets2.imgPositions; // force re-render?

        console.log(
            `loggedImagePos: ${$chartClickLoggerId}: `,
            JSON.stringify(loggedImgPositions)
        );
        bumpPos();
        // imgSize();
    };

    const bumpPos = () => {
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
        var myImg = document.querySelector("#sky");
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
        navigator.clipboard.writeText(JSON.stringify(brackets2));
    }
</script>

<style>
    div.container {
        width: 100%;
        height: 30px;
    }
</style>

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
        id="sky"
        src={bracketImgSrc}
        alt="bracketImage"
        on:click={logClickPosition} />

    <ChartClickLogger on:copyJson={copyJson} />
</div>
