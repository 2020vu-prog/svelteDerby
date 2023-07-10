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
    import CarAndDriver from "./CarAndDriver.svelte";
    import EllipsisButton from "./EllipsisButton.svelte";
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
        return standing.getWinTime(lane, phase).toString().padStart(3, "0");
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

{#if shouldRender(standing, at)}
    <Card class="mt-3 border border-info cjw-border-5">
        <CardHeader class="bg-info text-white">
            <CardTitle>
                <span on:click={gotoBracket}>{chartPosition}</span>
                <span class="spanRight">
                    {hhmmss}
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
        <CardBody>
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
            {#if isHistory()}User: {standing.by}{/if}
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
