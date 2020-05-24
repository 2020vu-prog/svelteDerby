<script>
    import {
        nextOnBlockKey,
        standingsMap,
        racePhaseMap,
        driverMap,
        carFilter,
        doRefreshBlocks,
    } from "./stores.js";
    import RaceStanding from "./RaceStanding.svelte";
    import RacePhase from "./RacePhase.svelte";
    import CarFilter from "./CarFilter.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { location } from "svelte-spa-router";
    import BottomNav from "./BottomNav.svelte";

    export let params = {};

    const getTitle = () => {
        console.log("mounted type:", params.type);
        return params.type === "Pending" ? "Pending Races" : "Race History";
    };
    const typeFilter = (standing) => {
        console.log(" type filter:", params.type);

        if (params.type === "Pending") {
            return standing.isPending();
        } else {
            // History
            return standing.hasResults();
        }
    };
    const filterMatches = (standing, lclFilter) => {
        console.log("filterMatches", standing);

        if (!lclFilter) return true;
        let re = new RegExp("^" + lclFilter);

        return standing.carNumbers.filter((cn) => cn.match(re)).length > 0;
    };
    //loc &drb passed in to coerce svelte refesh screen
    const getStandings = (loc, drb) => {
        const rc = Object.values($standingsMap);
        rc.sort((a, b) => {
            return b.at - a.at;
        });
        return rc;
    };
</script>

<style>

</style>

<main>

    <h4>Next On Blocks</h4>
    <BottomNav />

    {#if params.type === 'Pending'}
        <MaterialAdd clickHandleRoute="/raceStandingAdd/RaceStanding" />
    {/if}
    {#if $nextOnBlockKey.length > 0}
        <RacePhase
            refreshTime={$doRefreshBlocks}
            phaseKey={$nextOnBlockKey}
            at={$racePhaseMap[$nextOnBlockKey].at} />
    {:else}Starting Blocks are empty{/if}

    <hr />

    <h4>
        {getTitle($location)}
        <CarFilter />
    </h4>

    {#each getStandings($location, $doRefreshBlocks) as standing}
        {#if filterMatches(standing, $carFilter, $doRefreshBlocks)}
            {#if typeFilter(standing, $doRefreshBlocks)}
                <RaceStanding
                    at={standing.at}
                    standingKey={standing.classKey}
                    refresh={doRefreshBlocks} />
            {/if}
        {/if}
    {/each}
</main>
