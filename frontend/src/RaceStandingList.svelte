<script>
    import log from "loglevel";

    import {
        nextOnBlockKey,
        standingsMap,
        racePhaseMap,
        driverMap,
        carFilter,
        doRefreshBlocks,
        pendingSortAlgorithm,
        uiPageSize,
    } from "./stores.js";
    import VirtualList from "@sveltejs/svelte-virtual-list";

    import RaceStanding from "./RaceStanding.svelte";
    import RacePhase from "./RacePhase.svelte";
    import Annotate from "./Annotate.svelte";
    import CarFilter from "./CarFilter.svelte";
    import { onMount } from "svelte";
    export let params = {};
    import { location, replace, push } from "svelte-spa-router";
    import { dateChangeLabel, getMainFull } from "./utils.js";
    var mainFullPx = 300;

    var mounted = false;
    let start;
    let end;
    const nob0 = { type: "NOB", at: 1 };
    onMount(async () => {
        mounted = true;
        log.debug("RaceStanding list: ", location);
        mainFullPx = getMainFull();
    });

    //workaround for svelte optimization on page reload
    $: {
        potentialReload($doRefreshBlocks);
    }
    var standingList = [nob0];
    $: {
        standingList = [nob0].concat(
            getStandings($location, $carFilter, $doRefreshBlocks)
        );
        log.debug(`refreshed standingList: ${standingList.length}`);
    }
    $: {
        log.debug(`RaceStandingList vlist start: ${start} end: ${end}`);
    }
    function potentialReload(unusedButImportant) {
        if (mounted) {
            log.debug("routing to force reload b/c ", $doRefreshBlocks);

            push(`/forceReloadPage`);
        }
    }

    function getTitle() {
        log.debug("mounted type:", params.type);
        return params.type === "Pending" ? "Pending Races" : "Race History";
    }
    const typeFilter = (standing) => {
        log.debug(" type filter:", params.type);

        if (params.type === "Pending") {
            return standing.isPending();
        } else {
            // History
            return standing.hasResults();
        }
    };
    const filterMatches = (standing, lclFilter) => {
        log.debug("filterMatches", standing);

        if (!lclFilter) return true;
        let re = new RegExp("^" + lclFilter);

        return standing.carNumbers.filter((cn) => cn.match(re)).length > 0;
    };
    //loc &drb passed in to coerce svelte refesh screen
    function getStandings(loc, carFilter, drb) {
        const rc = Object.values($standingsMap);
        const sortBy = getSortAlgorithm();
        rc.sort(sortBy);
        return rc
            .filter((rs) => filterMatches(rs, carFilter, drb))
            .filter((rs) => typeFilter(rs, drb))
            .slice(0, $uiPageSize);
    }
    function getSortAlgorithm() {
        if (params.type === "Pending") {
            return $pendingSortAlgorithm === "Heat" ? sortByHeat : sortByAt;
        } else {
            return sortByAt; // history is always sorted by age.
        }
    }

    function sortByAt(a, b) {
        return b.at - a.at;
    }
    function sortByHeat(a, b) {
        const aKey = getHeatSortKey(a);
        const bKey = getHeatSortKey(b);
        return aKey - bKey;
    }
    function getHeatSortKey(rs) {
        if (rs.bracketPos && rs.bracketPos.includes(":")) {
            const [bmdKey, heat] = rs.bracketPos.split(":");
            return parseInt(heat, 10);
        } else {
            return rs.at;
        }
    }
    function getPriorStanding(index) {
        return standingList
            .slice(0, index)
            .filter((standing) => standing.type !== "NOB")
            .pop();
    }
</script>

<style>
</style>

{#each standingList as item, i (item.at)}
    {#if item.type === "NOB"}
        <h4>Next On Blocks</h4>

        {#if $nextOnBlockKey.length > 0}
            <RacePhase
                refreshTime={$doRefreshBlocks}
                phaseKey={$nextOnBlockKey}
                at={$racePhaseMap[$nextOnBlockKey].at}
                compressedLayout={true}
            />
        {:else}Starting Blocks are empty{/if}

        <hr />

        <h4>
            {getTitle($location)}
            <CarFilter />
        </h4>
    {:else}
        <!-- this will be rendered for each currently visible item -->
        <Annotate
            text={dateChangeLabel(item.at, getPriorStanding(i)?.at)}
            style="margin-top: 1rem"
        />
        <RaceStanding standing={item} refresh={doRefreshBlocks} />
    {/if}
{/each}
