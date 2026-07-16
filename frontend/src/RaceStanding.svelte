<script>
    import log from "loglevel";

    import {
        Card,
        CardBody,
        CardHeader,
        CardTitle,
        CardFooter,
        Badge,
    } from "sveltestrap";
    import ByLine from "./ByLine.svelte";
    import CarAndDriver from "./CarAndDriver.svelte";
    import EllipsisButton from "./EllipsisButton.svelte";
    import ComponentToolbar from "./ComponentToolbar.svelte";
    import { standingsMap, driverMap } from "./stores.js";
    import {
        safeGetAt,
        fmtChartPosition,
        getBracketLink,
        hhmmssFmt,
        formatWinTime,
    } from "./utils.js";
    import { onMount } from "svelte";
    import { push, replace } from "svelte-spa-router";
    export let standing;
    export let source = "Unknown";

    var chartPosition = "";
    var hhmmss = "";
    var at = standing.at;
    let showToolbar = false;

    const updateBoundVars = async (paramStanding) => {
        at = standing.at;
        hhmmss = hhmmssFmt(standing.at);
        [chartPosition] = await fmtChartPosition(standing);
    };
    $: {
        log.debug("rp changed:", at);
        updateBoundVars(standing);
    }
    onMount(async () => {
        updateBoundVars(standing);
    });

    function isHistory() {
        return source === "EventHistory";
    }
    function showTag(lane, at) {
        if (standing.hasResults()) {
            return "";
        }

        const idx = lane - 1;
        const tags = standing.tags;
        if (tags && tags[idx] && tags[idx].called) {
            return "Called";
        }
        return "";
    }
    const isWinner = (lane, phase) => {
        return standing.isWinner(lane, phase);
    };

    const getWinTime = (lane, phase, at) => {
        return formatWinTime(standing.getWinTime(lane, phase));
    };
    const shouldRender = (raceStanding) => {
        return !raceStanding.del;
    };
    function toggleToolbar(event) {
        log.debug("info event: ", event.detail.text);
        showToolbar = !showToolbar;
    }
    const gotoBracket = () => {
        if (getBracketLink(standing)) push(getBracketLink(standing));
    };
</script>
<style>
.list-group-item {
    border-radius: 0;
}
</style>

{#if shouldRender(standing, at)}
    <Card class="mt-3 border border-info cjw-border-5">
        <CardHeader class="bg-info text-white" style="padding: 2px; border: 0; border-radius: 0">
            <CardTitle style="align-items: center; padding: 0px 2px">
                <span on:click={gotoBracket}>{chartPosition}</span>
                <span class="spanRight" style="display: flex; align-items: center; gap: 0.5rem">
                    <span style="display: inline-flex; align-items: center">{hhmmss}</span>
                    {#if !isHistory()}
                        <EllipsisButton
                            on:message={toggleToolbar}
                            dbName="RaceStanding"
                            dbKey={standing.classKey}
                        />
                    {/if}
                </span>
            </CardTitle>
        </CardHeader>
        <CardBody style="padding: 0px">
            <ul class="list-group">
                <li class="list-group-item">
                    <CarAndDriver
                        number={standing.carNumbers[0]}
                        isWinner={isWinner(1, 0, at)}
                        phaseLetter=""
                        at={safeGetAt($driverMap, standing.carNumbers[0])}
                    />
                    <span class="spanRight">
                        {#if showTag(1, at)}
                            <Badge pill class="bigText">{showTag(1, at)}</Badge>
                        {/if}
                        {#if isWinner(1, 0, at)}
                            <Badge pill class="bigText">
                                Overall: {getWinTime(1, 0, at)}
                            </Badge>
                        {/if}
                        {#if isWinner(1, 1, at)}
                            <Badge pill class="bigText">
                                A: {getWinTime(1, 1, at)}
                            </Badge>
                        {/if}
                        {#if isWinner(1, 2, at)}
                            <Badge pill class="bigText">
                                B: {getWinTime(1, 2, at)}
                            </Badge>
                        {/if}
                    </span>
                </li>
                <li class="list-group-item">
                    <CarAndDriver
                        number={standing.carNumbers[1]}
                        isWinner={isWinner(2, 0, at)}
                        phaseLetter=""
                        at={safeGetAt($driverMap, standing.carNumbers[1])}
                    />
                    <span class="spanRight">
                        {#if showTag(2, at)}
                            <Badge pill class="bigText">{showTag(2, at)}</Badge>
                        {/if}
                        {#if isWinner(2, 0, at)}
                            <Badge pill class="bigText">
                                Overall: {getWinTime(2, 0, at)}
                            </Badge>
                        {/if}
                        {#if isWinner(2, 1, at)}
                            <Badge pill class="bigText">
                                A: {getWinTime(2, 1, at)}
                            </Badge>
                        {/if}
                        {#if isWinner(2, 2, at)}
                            <Badge pill class="bigText">
                                B: {getWinTime(2, 2, at)}
                            </Badge>
                        {/if}
                    </span>
                </li>
            </ul>
            {#if isHistory()}<ByLine entity={standing} />{/if}
        </CardBody>
        {#if showToolbar}
            <CardFooter
                style="padding: 5px 1px !important"
                class="bg-info text-white"
            >
                <ComponentToolbar
                    dbName="RaceStanding"
                    dbKey={standing.classKey}
                    bracketLink={getBracketLink(standing)}
                    cn={standing.carNumbers}
                />
            </CardFooter>
        {/if}
    </Card>
{/if}
