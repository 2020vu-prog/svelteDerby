<script>
    import "./Charts.css";
    import log from "loglevel";
    import { push, pop, replace } from "svelte-spa-router";
    import ChartDetailCardHeats from "./ChartDetailCardHeats.svelte";
    import CarFilter from "./CarFilter.svelte";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import {
        carFilter,
        getChartCacheKey,
        driverMap,
        spinnerPanelBusy,
        pushMessage,
    } from "./stores.js";
    import {
        augmentChartState,
        sleep,
        getChartJson,
        filterMatches,
    } from "./utils.js";
    import { tick } from "svelte";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let params = {};
    const loggedImgPositions = {};
    var showChartClickLogger = false;
    var bmdFromDexie = {};
    var mounted = false;
    var imageLoaded = false;
    var jsReady = false;
    onMount(async () => {
        mounted = true;
        //tryBuild();
        $spinnerPanelBusy = true;
        await refreshDataFromDb();
        //await sleep(2000)
        $spinnerPanelBusy = false;
    });
    $: shown = filterShown($carFilter); //recalc when filter changes!

    var brackets2 = {
        imgSize: { height: 1700, width: 2200 },
        imgPositions: {},
        seeds: [],
        progress: {},
    };
    const refreshDataFromDb = async (trigger) => {
        log.debug("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.get(params.chartId);
        log.debug("refreshDataFromDb gave:", bmdFromDexie);

        const chartCacheKey = getChartCacheKey();
        //await getChartImage(bmdFromDexie.imgPath);
        const chartjson = await getChartJson(bmdFromDexie);
        log.debug("refreshDataFromDb chartjson:", chartjson);
        if (chartjson) {
            brackets2 = chartjson;
            //console.profile('getRoundsy')

            roundMap = await getRounds(chartjson);
            //console.profileEnd('getRoundsy')
            shown = filterShown();
        }
    };
    let roundRecap = {};
    let roundMap = {};
    async function getRounds(chartjson) {
        const newRoundMap = {};
        const heats = Object.keys(chartjson.progress);

        for (const heat of heats) {
            const heatDetail = chartjson.progress[heat];
            const round = heatDetail["#Round"];
            const HeatNumber = heatDetail.HeatNumber;
            if (!newRoundMap[round]) {
                newRoundMap[round] = {};
            }
            if (!roundRecap[round]) {
                roundRecap[round] = {};
            }
            newRoundMap[round][HeatNumber] = heatDetail;
            for (const letter of ["A", "B"]) {
                const augState = await augmentChartState(
                    chartjson,
                    params.chartId,
                    heat,
                    letter
                );
                heatDetail[`${letter}state`] = augState;
                roundRecap[round][augState.bracketClass] = true;
            }
        }
        //log.debug('cdcl:',JSON.stringify(rc))
        //log.debug('cdbc:',JSON.stringify(roundRecap))
        return newRoundMap;
    }

    let shown = {};

    function getRoundClass(roundRecap, round) {
        for (const bClass of [
            "pendingSeed",
            "ready",
            "phaseOneComplete",
            "complete",
        ]) {
            if (roundRecap[round][bClass]) {
                return bClass;
            }
        }
        return undefined;
    }

    const unPos = /^ - /i;
    function posFilterMatch(Xstate) {
        const carNumber = Xstate.posHtml.replace(unPos, "");

        log.debug("filterShown2:", carNumber);
        Xstate.filterMatches = filterMatches(carNumber, $carFilter);
        return Xstate.filterMatches;
        //return filterMatches(carNumber,$carFilter)
    }
    function filterShown() {
        let count = 0;
        const newShown = {};
        if (!$carFilter) {
            return newShown;
        }
        for (const round of Object.keys(roundMap)) {
            for (const heat of Object.keys(roundMap[round])) {
                const heatDetail = roundMap[round][heat];
                log.debug("filterShown:", heatDetail.Astate.posHtml);
                if (
                    posFilterMatch(heatDetail.Astate) ||
                    posFilterMatch(heatDetail.Bstate)
                ) {
                    newShown[round] = true;
                    count++;
                }
            }
        }
        pushMessage({
            text: `Filter Matched: ${count}`,
            type: "success",
            key: "filterMatchCount",
        });
        roundMap = roundMap; // republish with filter mods
        return newShown;
    }
    function roundClicked(round) {
        if ($carFilter) {
            shown = filterShown();
            return;
        }
        shown = {};
        shown[round] = !shown[round];
    }
    function gotoChartPdf() {
        replace(`/ChartDetail/${params.chartId}`);
    }
    let cur = "";
    async function tabClicked(tab) {
        $carFilter = "";
        await tick();
        cur = tab;
        shown = {};
        shown[tab] = true;
    }
</script>

<h3 style="text-align:center;z-index: 9;">
    <span on:click={gotoChartPdf}>
        Chart Name: {bmdFromDexie.bracketName}
    </span>
    <CarFilter />
</h3>

{#each Object.keys(roundMap) as tab}
    <!--

        <div style="display: inline"
        class={getRoundClass(roundRecap,tab)}
        >
-->
    <button
        class="tabs
    {getRoundClass(roundRecap, tab)}"
        class:selected={cur === tab}
        on:click={() => {
            cur = tab;
            tabClicked(tab);
        }}
    >
        {tab}
    </button>
{/each}

{#key shown}
    {#each Object.keys(roundMap) as round}
        {#if shown[round]}
            <Card
                class="mt-3 border border-info"
                on:click={(event) => {
                    roundClicked(round);
                }}
            >
                <CardBody>
                    <div
                        style="display: inline"
                        class={getRoundClass(roundRecap, round)}
                    >
                        Round:
                        <strong>
                            {round}
                        </strong>
                    </div>
                </CardBody>
            </Card>
            <ChartDetailCardHeats
                chartId={params.chartId}
                heats={roundMap[round]}
            />
        {/if}
    {/each}
{/key}

<style>
</style>
