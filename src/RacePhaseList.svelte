<script>
    import log from "loglevel";
    import VirtualList from "@sveltejs/svelte-virtual-list";
    import {
        nextOnBlockKey,
        racePhaseMap,
        carFilter,
        doRefreshBlocks,
        uiPageSize,
    } from "./stores.js";
    import RacePhase from "./RacePhase.svelte";
    import CarFilter from "./CarFilter.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    var phaseList = [];
    var start;
    var end;

    $: {
        phaseList = getRacePhases($racePhaseMap, $carFilter, $nextOnBlockKey);
    }

    $: log.debug(`DC: NOB:`, $nextOnBlockKey);
    $: log.debug(`DC: rpm:`, $racePhaseMap);
    $: log.debug("DC: doRefreshChanged :", $doRefreshBlocks);

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
</script>

<style>

</style>

<main>

    <MaterialAdd clickHandleRoute="/raceStandingAdd/RacePhase" />

    <h4>
        Race Phases
        <CarFilter />
    </h4>

    <VirtualList height="900px" items={phaseList} bind:start bind:end let:item>
        <!-- this will be rendered for each currently visible item -->
        <RacePhase
            refreshTime={$doRefreshBlocks}
            phaseKey={item.classKey}
            at={item.at} />
    </VirtualList>
</main>
