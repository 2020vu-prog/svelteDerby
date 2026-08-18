<script>
    import log from "loglevel";
    import VirtualList from "@sveltejs/svelte-virtual-list";
    import {
        nextOnBlockKey,
        racePhaseMap,
        carFilter,
        doRefreshBlocks,
        uiPageSize,
        initialReloadRoute,
    } from "./stores.js";
    import RacePhase from "./RacePhase.svelte";
    import Annotate from "./Annotate.svelte";
    import CarFilter from "./CarFilter.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { onMount } from "svelte";
    import { dateChangeLabel, getMainFull } from "./utils.js";
    import { location } from "svelte-spa-router";
    var mainFullPx = 300;
    var phaseList = [];
    var start;
    var end;
    $: {
        phaseList = getRacePhases($racePhaseMap, $carFilter, $nextOnBlockKey);
    }

    $: log.debug(`DC: NOB:`, $nextOnBlockKey);
    $: log.debug(`DC: rpm:`, $racePhaseMap);
    $: log.debug("DC: doRefreshChanged :", $doRefreshBlocks);

    onMount(async () => {
        //mainFullPx = getMainFull(["#rpTitle"]) - 36
        mainFullPx = getMainFull(["#rpTitle"]);
        $initialReloadRoute = $location;
    });
    const filterMatchesX = (phase, lclFilter, nobKey) => {
        const fm = filterMatches(phase, lclFilter, nobKey);
        log.debug("filterMatch:", fm);
        return fm;
    };
    const filterMatches = (phase, lclFilter, nobKey) => {
        if (!lclFilter) return true;
        if (nobKey === phase.classKey) return true; //Always show!

        let re = new RegExp("^" + lclFilter);

        return phase.carNumbers.filter((cn) => cn.match(re)).length > 0;
    };
    //loc &drb passed in to coerce svelte refesh screen
    function getRacePhases(drb, lclFilter, nobKey) {
        const rc = Object.values(drb);
        rc.sort((a, b) => {
            return b.at - a.at;
        });
        return rc
            .filter((rp) => filterMatchesX(rp, lclFilter, nobKey))
            .slice(0, $uiPageSize);
    }
    function getKey(at, i, nobKey) {
        if (i == 0) {
            //re-render first entry when nob changes.
            // (should fix intermmittent gray nob color)
            return at + ":" + nobKey;
        } else {
            return at + "";
        }
    }
</script>

<style>
</style>

<MaterialAdd clickHandleRoute="/raceStandingAdd/RacePhase" />
<div id="rpTitle">
    <h4>
        Race Phases
        <CarFilter />
    </h4>
</div>

{#each phaseList as item, i (item.at)}
    {#key getKey(item.at, i, $nextOnBlockKey)}
        <Annotate
            text={dateChangeLabel(item.at, phaseList[i - 1]?.at)}
            style="margin-top: 1rem"
        />
        <RacePhase
            refreshTime={$doRefreshBlocks}
            phaseKey={item.classKey}
            at={item.at}
        />
    {/key}
{/each}
