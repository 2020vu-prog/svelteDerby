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
    import CarAndDriverVertical from "./CarAndDriverVertical.svelte";
    import ComponentToolbar from "./ComponentToolbar.svelte";
    import InfoButton from "./InfoButton.svelte";
    import { onMount } from "svelte";
    import { push, replace } from "svelte-spa-router";
    import { racePhaseMap, driverMap, nextOnBlockKey } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import {
        safeGetAt,
        fmtChartPosition,
        getBracketLink,
        hhmmssFmt,
        getHistoryEntity,
    } from "./utils.js";
    export let compressedLayout;
    export let refreshTime;
    export let phaseKey;
    export let at;
    export let source = "storePhaseMap";
    export let historyPK = "";
    let mounted = false;
    let boundVars = false;
    let racePhase = {};
    let rp = racePhase;
    let hhmmss;
    let chartPosition;
    let bgColor;
    let showToolbar = false;

    function isHistory() {
        return source === "EventHistory";
    }
    const updateBoundVars = async (at, force) => {
        if (mounted || force) {
        } else {
            return; // neuter the $:{} reload on "at" changed before mount
        }
        boundVars = false;
        if (isHistory()) {
            racePhase = await getHistoryEntity(historyPK, phaseKey, at);
        } else {
            racePhase = $racePhaseMap[phaseKey];
        }
        rp = racePhase;
        hhmmss = hhmmssFmt(at);
        bgColor = getBgColor();
        chartPosition = await fmtChartPosition(racePhase);
        boundVars = true;
    };
    $: {
        log.debug("rp changed:", at);
        updateBoundVars(at, false);
    }
    //log.debug("RacePhaseKey:", phaseKey)
    //log.debug("RacePhase:", racePhase)
    const getBgColor = () => {
        if ($nextOnBlockKey === phaseKey) {
            log.debug("nob getBgColor key:" + JSON.stringify($nextOnBlockKey));
            log.debug("nob refresh:", refreshTime);

            return racePhase.rs ? "Green" : "Red";
        } else {
            return "Gray";
        }
    };

    const isWinner = (lane) => {
        if (!racePhase.phaseResults) {
            return undefined;
        }
        var phaseWinTime = racePhase.getPhaseDeltaMS();

        if (phaseWinTime == 0) {
            return true;
        }

        if (lane === 1) {
            return phaseWinTime > 0;
        } else {
            return phaseWinTime < 0;
        }
    };
    const getWinTime = (lane) => {
        var phaseWinTime = racePhase.getPhaseDeltaMS();
        if (lane === 2) {
            phaseWinTime = phaseWinTime * -1;
        }
        if (phaseWinTime == 0) {
            return "Tied";
        }
        return phaseWinTime.toString().padStart(3, "0");
    };
    const getPhaseIcon = (racePhase) => {
        if (racePhase.phaseResults) {
            return undefined; // No Phase icon for completed phase.
        }
        return racePhase.phaseLiteral;
    };
    const getPhaseLetter = (racePhase) => {
        return racePhase.phaseLiteral;
    };
    const getTimerLink = (racePhase) => {
        if (racePhase.phaseResults) {
            return undefined; // No timerLink for completed phase.
        }
        if (isHistory()) {
            return undefined; // No timerLink for history.
        }
        return (
            "/ManualTimerAdd/" +
            racePhase.classKey +
            "/?carNumber1=" +
            String(rp.carNumbers[0]) +
            "&carNumber2=" +
            String(rp.carNumbers[1])
        );
    };
    onMount(async () => {
        log.debug("RacePhase unt");
        updateBoundVars(at, true);
        mounted = true;
    });
    const shouldRender = (racePhase) => {
        if (!boundVars) {
            return false;
        }
        return !racePhase.del;
    };
    function toggleToolbar(event) {
        log.debug("info event: ", event.detail.text);
        showToolbar = !showToolbar;
    }

    const gotoBracket = () => {
        if (getBracketLink(rp)) push(getBracketLink(rp));
        else {
            log.debug("no bracket link");
        }
    };
</script>

<style>
    .column {
        flex: 1 1 0px;
    }
</style>

{#if refreshTime && shouldRender(rp, boundVars)}
    {#if !compressedLayout}
        <Card
            class="mt-3 border border-info cjw-border-5"
            style="background: {bgColor}">
            <CardHeader class="bg-info text-white">
                <CardTitle color="info">
                    <span on:click={gotoBracket}>{chartPosition}</span>
                    <span class="spanRight">
                        {hhmmss}
                        {#if !isHistory()}
                            <InfoButton
                                on:message={toggleToolbar}
                                dbName="RacePhase"
                                dbKey={phaseKey} />
                        {/if}
                    </span>

                </CardTitle>
            </CardHeader>
            <CardBody color="info">

                <ul class="list-group ">
                    <li class="list-group-item ">
                        <CarAndDriver
                            number={rp.carNumbers[0]}
                            isWinner={isWinner(1, rp)}
                            phaseLetter={getPhaseIcon(rp)}
                            timerLink={getTimerLink(rp)}
                            at={safeGetAt($driverMap, rp.carNumbers[0])} />
                        {#if isWinner(1, rp)}
                            <span class="spanRight">
                                <Badge pill class="bigText">
                                    {getPhaseLetter(rp)}:{getWinTime(1, rp)}
                                </Badge>
                            </span>
                        {/if}
                    </li>
                    <li class="list-group-item">
                        <CarAndDriver
                            number={rp.carNumbers[1]}
                            isWinner={isWinner(2, rp)}
                            phaseLetter={getPhaseIcon(rp)}
                            timerLink={getTimerLink(rp)}
                            at={safeGetAt($driverMap, rp.carNumbers[1])} />
                        {#if isWinner(2, rp)}
                            <span class="spanRight">
                                <Badge pill class="bigText">
                                    {getPhaseLetter(rp)}:{getWinTime(2, rp)}
                                </Badge>
                            </span>
                        {/if}
                    </li>

                </ul>
                {#if isHistory()}User: {rp.by}{/if}
                {#if showToolbar}
                    <CardFooter class="bg-info text-white">
                        <ComponentToolbar
                            dbName="RacePhase"
                            dbKey={phaseKey}
                            timerLink={getTimerLink(rp)}
                            bracketLink={getBracketLink(rp)} />
                    </CardFooter>
                {/if}
            </CardBody>
        </Card>
    {:else}
        <Card
            class="mt-3 "
            style="background: {bgColor}"
            on:click={() => (compressedLayout = false)}>
            <CardBody color="info" style="padding: 10px !important">

                <ul class="list-group ">
                    <li
                        class="list-group-item"
                        style="display: flex; flex-direction:row;">
                        <div class="column" style="text-align: center">
                            <CarAndDriverVertical
                                number={rp.carNumbers[0]}
                                at={safeGetAt($driverMap, rp.carNumbers[0])} />
                        </div>

                        <div style="text-align: center;" class="column">
                            <button type="button" class="btn btn-warning">
                                {getPhaseIcon(rp)}
                            </button>
                            <br />
                            {chartPosition}
                        </div>

                        <div class="column" style="text-align: center">
                            <CarAndDriverVertical
                                number={rp.carNumbers[1]}
                                at={safeGetAt($driverMap, rp.carNumbers[1])} />
                        </div>

                    </li>

                </ul>

            </CardBody>
        </Card>
    {/if}
{/if}
