<script>
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
    import BottomNav from "./BottomNav.svelte";

    $: console.log(`DC: NOB:`, $nextOnBlockKey);
    $: console.log(`DC: rpm:`, $racePhaseMap);
    $: console.log("DC: doRefreshChanged :", $doRefreshBlocks);

    const filterMatchesX = (phase, lclFilter, nobKey) => {
        const fm = filterMatches(phase, lclFilter, nobKey);
        console.log("filterMatch:", fm);
        return fm;
    };
    const filterMatches = (phase, lclFilter, nobKey) => {
        if (!lclFilter) return true;
        if (nobKey === phase.classKey) return true; //Always show!

        let re = new RegExp("^" + lclFilter);

        return phase.carNumbers.filter((cn) => cn.match(re)).length > 0;
    };
    //loc &drb passed in to coerce svelte refesh screen
    const getRacePhases = (drb, lclFilter, nobKey) => {
        const rc = Object.values(drb);
        rc.sort((a, b) => {
            return b.at - a.at;
        });
        return rc
            .filter((rp) => filterMatchesX(rp, lclFilter, nobKey))
            .slice(0, $uiPageSize);
    };
</script>

<style>

</style>

<main>

    <MaterialAdd clickHandleRoute="/raceStandingAdd/RacePhase" />

    <h4>
        Race Phases
        <CarFilter />
    </h4>

    {#each getRacePhases($racePhaseMap, $carFilter, $nextOnBlockKey) as racePhase}
        <RacePhase
            refreshTime={$doRefreshBlocks}
            phaseKey={racePhase.classKey}
            at={racePhase.at} />
    {/each}
    <BottomNav />

</main>
