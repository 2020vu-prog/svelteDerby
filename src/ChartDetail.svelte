<script>
    import ChartHotSpot from "./ChartHotSpot.svelte";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";
    import ChartClickLogger from "./ChartClickLogger.svelte";
    import { chartClickLoggerId, getChartCacheKey } from "./stores.js";
    import {parseHeatPos} from "./utils.js";

    export let params = {};
    const loggedImgPositions = {};
    var bmdFromDexie = {};
    var bracketImgSrc = "/archive/charts/progessSpinner.png";
    onMount(async () => {
        refreshDataFromDb();
    });
    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.get(params.chartId);
        console.log("refreshDataFromDb gave:", bmdFromDexie);

        bracketImgSrc = "/data/brackets/" + bmdFromDexie.imgPath;
        //await getChartImage(bmdFromDexie.imgPath);
        await getChartImage(bmdFromDexie.jsonPath);
    };
    const getChartImage = async (imgPath) => {
        console.log("getChartImage", imgPath);

        const chartCacheKey = getChartCacheKey();
        axios
            .get(`/data/brackets/${imgPath}?cacheKey=${chartCacheKey}`)
            .then((response) => {
                console.log("ChartDetail  axios success", response);
                brackets2 = response.data;
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
    const gotoTimer = (event) => {
        //console.log("gototimer event:", event);
        const m = {
            //clientX: event.clientX,
            //clientY: event.clientY,
            left: event.clientX,
            top: event.clientY,
            //chartPosition: $chartClickLoggerId,
        };
        loggedImgPositions[$chartClickLoggerId] = m;
        console.log(
            `loggedImagePos: ${$chartClickLoggerId}: `,
            loggedImgPositions
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
</script>

<style>
    div.container {
        width: 100%;
        height: 30px;
        background: blue;
    }
</style>

<h3 style="z-index: 9;">Chart Name: {params.chartId}</h3>
<div id="top" class="container" style="z-index: 8;">

    {#each Object.values(brackets2.imgPositions) as bracket, pos}
        <ChartHotSpot
            pos={Object.keys(brackets2.imgPositions)[pos]}
            {scale}
            left={bracket.left}
            top={bracket.top}
            chartId={params.chartId} />
    {/each}
    <img
        style="position: absolute; z-index: 1; top:0px;left:0px;"
        id="sky"
        src={bracketImgSrc}
        alt="bracketImage"
        on:click={gotoTimer} />

    <ChartClickLogger />
</div>
