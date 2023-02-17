<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import {
        carouselList,
        carouselRun,
        customToolbarList,
        getDefaultToolbarList,
        statusMessage,
    } from "./stores.js";
    import { safeGetAt, sleep } from "./utils.js";
    import { onMount } from "svelte";
    import { push, pop, location } from "svelte-spa-router";
    import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
    import Icon from "fa-svelte";
    export let params = {};
    import { db } from "./eventDb.js";
    import { tick } from "svelte";

    var wip = [];
    var start;
    var end;
    onMount(async () => {
        log.debug("RouteList mounted : ", $location, params);

        wip = await loadWip();
        saveWip();
        updateSelectTotal();
    });
    function saveWip() {
        log.debug("RouteSelection saveWip: ", wip);
        if (isCarousel()) {
            $carouselList = wip;
        } else {
            $customToolbarList = wip;
        }
    }
    async function loadWip() {
        if (isCarousel()) {
            wip = $carouselList;
        } else {
            wip = $customToolbarList;
        }
        if (!wip.length) {
            wip = getDefaultToolbarList();
        }
        wip = await augmentDataFromDb();
        log.debug("RouteSelection loadWip: ", wip);
        return wip;
    }
    $: {
        log.debug("RouteList location: ", $location); // trigger param reload on location change
    }
    $: {
        if (wip) {
            log.debug("RouteList wip: ", wip.length); // trigger param reload on location change
        }
    }

    const filterMatches = (driver, lclFilter) => {
        if (!lclFilter) return true;
        let re = new RegExp("^" + lclFilter);
        return String(driver).match(re);
    };

    const augmentDataFromDb = async (trigger) => {
        log.debug("refreshDataFromDb data:", trigger);

        const bmdFromDexie = await db.BracketMetaData.toArray();
        log.debug("refreshDataFromDb data:", bmdFromDexie);
        // add any new charts
        bmdFromDexie.forEach(function (bmd) {
            if (bmd.del) return; // skip hidden

            const alreadyLoaded = wip.find((wipBmd) => wipBmd.SK === bmd.SK);
            if (!alreadyLoaded) {
                wip.push({
                    SK: bmd.SK,
                    selected: false,
                    text: bmd.bracketName,
                    systemName: bmd.bracketName,
                    path: "ChartDetail/" + bmd.SK,
                });
            }
        });

        // clear obsolete charts (hidden, org/event changes)
        wip = wip.filter((wipBmd) => {
            if (!wipBmd.SK) return true; // don't delete phases/pending/etc
            const alreadyLoaded = bmdFromDexie.find(
                (bmd) => wipBmd.SK === bmd.SK
            );
            if (alreadyLoaded && alreadyLoaded.del) return false; // don't show hidden
            return alreadyLoaded;
        });
        log.debug("aug data:", wip);
        //push("/ChartDetail/" + bmd.SK);
        return wip;
    };
    async function clearSelect() {
        wip = getDefaultToolbarList();
        wip = await augmentDataFromDb();
        saveWip();
        updateSelectTotalWhenSettled();
    }
    async function finishSelect() {
        let goodWip = wip;
        wip = [];
        saveWip(); // save empty to trigger update
        //await sleep(30)
        await tick();
        wip = goodWip; // and install desired copy
        saveWip();

        pop();
    }
    async function showCarousel() {
        saveWip();
        if (!wip.find((item) => item.delay)) {
            $statusMessage = {
                text: `No delay values entered.`,
                type: "error",
            };
            return;
        }

        $statusMessage = {
            text: `Carousel Mode will begin shortly.  PRESS your Browser reload button to stop it!`,
            type: "success",
        };
        await sleep(2500);
        $carouselRun = true;
    }
    function updateSelectTotal() {
        setTimeout(updateSelectTotalWhenSettled, 300);
    }
    function updateSelectTotalWhenSettled() {
        saveWip();
    }
    function isCarousel() {
        return params.mode === "carousel";
    }
    function isNavMode() {
        return params.mode === "nav";
    }
    function getTitle() {
        if (isCarousel()) {
            return "Carousel";
        }
        if (isNavMode()) {
            return "Customize Toolbar";
        }
        return "Unknown";
    }
</script>

<style>
    div :global(.xLargeEdit) {
        font-size: 28px;
    }

    input[type="checkbox"] {
        transform: scale(2);
    }
</style>

<div id="dlTitle">

    <h4>{getTitle()}</h4>
    <SpinnerButton on:click={clearSelect}>Clear Selection</SpinnerButton>

    {#if isNavMode()}
        <SpinnerButton on:click={finishSelect}>Done</SpinnerButton>
    {/if}
    {#if isCarousel()}
        <SpinnerButton on:click={showCarousel}>Show</SpinnerButton>
    {/if}
    <p />
</div>

{#each wip as item, index (item.path)}
    <Card class="mt-3 border border-info">

        <CardBody>
            <div style="display: inline">
                <h6>{item.systemName}</h6>
                {#if isCarousel()}
                    Delay:
                    <input type="number" bind:value={item.delay} />
                {/if}
                {#if isNavMode()}
                    Display:
                    <input
                        type="text"
                        bind:value={item.text}
                        placeholder={item.systemName} />
                    <span style="display: inline; float: right">
                        <input
                            type="checkbox"
                            bind:checked={wip[index].selected}
                            on:click={(event) => {
                                updateSelectTotal();
                                event.stopPropagation();
                            }} />
                    </span>
                {/if}
            </div>
        </CardBody>
    </Card>
{/each}
