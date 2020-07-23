<script>
    import CarAndDriver from "./CarAndDriver.svelte";
    import InfoButton from "./InfoButton.svelte";
    import ComponentToolbar from "./ComponentToolbar.svelte";
    import { standingsMap, driverMap } from "./stores.js";
    import {
        safeGetAt,
        fmtChartPosition,
        getBracketLink,
        hhmmssFmt,
    } from "./utils.js";
    import { onMount } from "svelte";
    import { push, replace } from "svelte-spa-router";
    export let standingKey;
    export let at;

    console.log("standingKey", standingKey);

    var chartPosition = "";
    var standing = $standingsMap[standingKey];
    var hhmmss = "";
    let showToolbar = false;

    const updateBoundVars = async (at) => {
        standing = $standingsMap[standingKey];
        hhmmss = hhmmssFmt(at);
        chartPosition = await fmtChartPosition(standing);
    };
    $: {
        console.log("rp changed:", at);
        updateBoundVars(at);
    }
    onMount(async () => {
        updateBoundVars(at);
    });

    const isWinner = (lane, phase) => {
        return standing.isWinner(lane, phase);
    };

    const getWinTime = (lane, phase) => {
        return standing.getWinTime(lane, phase);
    };
    const shouldRender = (raceStanding) => {
        return !raceStanding.del;
    };
    function toggleToolbar(event) {
        console.log("info event: ", event.detail.text);
        showToolbar = !showToolbar;
    }
    const gotoBracket = () => {
        if (getBracketLink(standing)) push(getBracketLink(standing));
    };
</script>

{#if shouldRender(standing, at)}
    <div class="well well-sm">
        <div class="panel panel-info">
            <div class="panel-heading">
                <span on:click={gotoBracket}>{chartPosition}</span>
                <span class="spanRight">
                    {hhmmss}
                    <InfoButton
                        on:message={toggleToolbar}
                        dbName="RaceStanding"
                        dbKey={standingKey} />
                </span>
            </div>

            <ul class="list-group">
                <li class="list-group-item">
                    <CarAndDriver
                        number={standing.carNumbers[0]}
                        isWinner={isWinner(1, 0, at)}
                        phaseLetter=""
                        at={safeGetAt($driverMap, standing.carNumbers[0])} />
                    {#if isWinner(1, 0, at)}
                        <big class="bigbadge badge">
                            Overall: {getWinTime(1, 0)}
                        </big>
                    {/if}
                    {#if isWinner(1, 1, at)}
                        <big class="bigbadge badge">A: {getWinTime(1, 1)}</big>
                    {/if}
                    {#if isWinner(1, 2, at)}
                        <big class="bigbadge badge">B: {getWinTime(1, 2)}</big>
                    {/if}

                </li>
                <li class="list-group-item">
                    <CarAndDriver
                        number={standing.carNumbers[1]}
                        isWinner={isWinner(2, 0, at)}
                        phaseLetter=""
                        at={safeGetAt($driverMap, standing.carNumbers[0])} />
                    {#if isWinner(2, 0, at)}
                        <big class="bigbadge badge">
                            Overall: {getWinTime(2, 0)}
                        </big>
                    {/if}
                    {#if isWinner(2, 1, at)}
                        <big class="bigbadge badge">A: {getWinTime(2, 1)}</big>
                    {/if}
                    {#if isWinner(2, 2, at)}
                        <big class="bigbadge badge">B: {getWinTime(2, 2)}</big>
                    {/if}
                </li>
            </ul>
        </div>
        {#if showToolbar}
            <ComponentToolbar
                dbName="RaceStanding"
                dbKey={standingKey}
                bracketLink={getBracketLink(standing)} />
        {/if}
    </div>
{/if}
