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
    import ByLine from "./ByLine.svelte";
    import ComponentToolbar from "./ComponentToolBar.svelte";
    import EllipsisButton from "./EllipsisButton.svelte";
    import { onMount } from "svelte";
    import { push, replace } from "svelte-spa-router";
    import {
        racePhaseMap,
        driverMap,
        nextOnBlockKey,
        standingsMap,
    } from "./stores.js";
    import {
        safeGetAt,
        fmtChartPosition,
        getBracketLink,
        hhmmssFmt,
        getHistoryEntity,
        isPendingNeeded,
        getRaceTypeEmoji,
        formatWinTime,
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
    let pendingNeeded = true;
    let bgColor;
    let phaseClass;
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
        [chartPosition, pendingNeeded] = await fmtChartPosition(racePhase);
        bgColor = getBgColor(pendingNeeded);
        if (bgColor === "Gray") {
            phaseClass = "btn-light";
        } else {
            phaseClass = "btn-warning";
        }
        boundVars = true;
        //log.debug("rp changed:", at);
        at = at + "UI"; //since this method is async force the ui to (re)-render
        //log.debug("rp changed2:", at);
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

            if (!pendingNeeded) {
                return "yellow";
            }
            return racePhase.rs ? "Green" : "Red";
        } else {
            return "Gray";
        }
    };

    const getWinTime = (lane) => {
        var phaseWinTime = racePhase.getPhaseDeltaMS();
        if (lane === 2) {
            phaseWinTime = phaseWinTime * -1;
        }
        return formatWinTime(phaseWinTime);
    };
    const getPhaseClass = (racePhase) => {};

    const getPhaseIcon = (racePhase) => {
        const i = _getPhaseIcon(racePhase);
        if (getRaceTypeEmoji(i)) {
            return getRaceTypeEmoji(i);
        }
        return i;
    };
    const _getPhaseIcon = (racePhase) => {
        if (!isPendingNeeded(racePhase)) {
            return racePhase.pt.charAt(0); //phasetype as icon for hot/trial/test
        }
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

    const getAPhaseWinForBlocks = (bPhaseLane) => {
        if (!(rp.phaseLiteral == "B" && rp.rs && $standingsMap[rp.rs]))
            return false;

        var phaseWinTime = $standingsMap[rp.rs].phase1DeltaMS;

        if (phaseWinTime == 0) {
            return "Tied";
        }

        if (bPhaseLane === 1) {
            phaseWinTime = phaseWinTime * -1;
        }

        if (phaseWinTime < 0) return false;

        return formatWinTime(phaseWinTime);
    };
</script>

<style>
    .column {
        flex: 1 1 0px;
    }
    .list-group-item {
        border-radius: 0;
    }
</style>
{#key at}
    {#if refreshTime && shouldRender(rp, boundVars)}
        {#if !compressedLayout}
            <Card
                class="mt-3 border border-info cjw-border-5"
                style="background: {bgColor}"
            >
                <CardHeader
                    class="bg-info text-white"
                    style="padding: 2px; border: 0; border-radius: 0"
                >
                    <CardTitle
                        color="info"
                        style="align-items: center; padding: 0px 2px"
                    >
                        <span on:click={gotoBracket}>{chartPosition}</span>
                        <span
                            class="spanRight"
                            style="display: flex; align-items: center; gap: 0.5rem"
                        >
                            <span
                                style="display: inline-flex; align-items: center"
                                >{hhmmss}</span
                            >
                            {#if !isHistory()}
                                <EllipsisButton
                                    on:message={toggleToolbar}
                                    dbName="RacePhase"
                                    dbKey={phaseKey}
                                />
                            {/if}
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardBody
                    color="info"
                    style={bgColor == "Gray" ? "padding: 0px" : ""}
                >
                    <ul class="list-group">
                        <li class="list-group-item">
                            <CarAndDriver
                                number={rp.carNumbers[0]}
                                isWinner={racePhase.isWinner(1, true)}
                                phaseLetter={getPhaseIcon(rp)}
                                phaseClass={phaseClass}
                                timerLink={getTimerLink(rp)}
                                at={safeGetAt($driverMap, rp.carNumbers[0])}
                            />
                            {#if racePhase.isWinner(1, true)}
                                <span class="spanRight">
                                    <Badge pill class="bigText">
                                        {getPhaseLetter(rp)}: {getWinTime(
                                            1,
                                            rp
                                        )}
                                    </Badge>
                                </span>
                            {:else if $nextOnBlockKey == phaseKey && getAPhaseWinForBlocks(1)}
                                <span class="spanRight">
                                    <Badge
                                        pill
                                        class="bigText"
                                        style="background: {bgColor}"
                                    >
                                        A: {getAPhaseWinForBlocks(1)}
                                    </Badge>
                                </span>
                            {/if}
                        </li>
                        <li class="list-group-item">
                            <CarAndDriver
                                number={rp.carNumbers[1]}
                                isWinner={racePhase.isWinner(2, true)}
                                phaseLetter={getPhaseIcon(rp)}
                                phaseClass={phaseClass}
                                timerLink={getTimerLink(rp)}
                                at={safeGetAt($driverMap, rp.carNumbers[1])}
                            />
                            {#if racePhase.isWinner(2, true)}
                                <span class="spanRight">
                                    <Badge pill class="bigText">
                                        {getPhaseLetter(rp)}: {getWinTime(
                                            2,
                                            rp
                                        )}
                                    </Badge>
                                </span>
                            {:else if $nextOnBlockKey == phaseKey && getAPhaseWinForBlocks(2)}
                                <span class="spanRight">
                                    <Badge
                                        pill
                                        class="bigText"
                                        style="background: {bgColor}"
                                    >
                                        A: {getAPhaseWinForBlocks(2)}
                                    </Badge>
                                </span>
                            {/if}
                        </li>
                    </ul>
                    {#if isHistory()}
                        <span style="color: white"><ByLine entity={rp} /></span>
                    {/if}
                </CardBody>
                {#if showToolbar}
                    <CardFooter
                        style="padding: 5px 1px !important"
                        class="bg-info text-white"
                    >
                        <ComponentToolbar
                            dbName="RacePhase"
                            dbKey={phaseKey}
                            timerLink={getTimerLink(rp)}
                            bracketLink={getBracketLink(rp)}
                        />
                    </CardFooter>
                {/if}
            </Card>
        {:else}
            <Card
                class="mt-3 "
                style="background: {bgColor}"
                on:click={() => (compressedLayout = false)}
            >
                <CardBody color="info" style="padding: 10px !important">
                    <ul class="list-group">
                        <li
                            class="list-group-item"
                            style="display: flex; flex-direction:row;"
                        >
                            <div class="column" style="text-align: center">
                                <CarAndDriverVertical
                                    number={rp.carNumbers[0]}
                                    at={safeGetAt($driverMap, rp.carNumbers[0])}
                                />
                                {#if $nextOnBlockKey == phaseKey && getAPhaseWinForBlocks(1)}
                                    <br />
                                    <Badge
                                        pill
                                        class="bigText"
                                        style="background: {bgColor}"
                                    >
                                        A: {getAPhaseWinForBlocks(1)}
                                    </Badge>
                                {/if}
                            </div>

                            <div style="text-align: center;" class="column">
                                <button
                                    type="button"
                                    class="btn btn-warning phase-icon-btn"
                                >
                                    {getPhaseIcon(rp)}
                                </button>
                                <br />
                                {chartPosition}
                            </div>

                            <div class="column" style="text-align: center">
                                <CarAndDriverVertical
                                    number={rp.carNumbers[1]}
                                    at={safeGetAt($driverMap, rp.carNumbers[1])}
                                />
                                {#if $nextOnBlockKey == phaseKey && getAPhaseWinForBlocks(2)}
                                    <br />
                                    <Badge
                                        pill
                                        class="bigText"
                                        style="background: {bgColor}"
                                    >
                                        A: {getAPhaseWinForBlocks(2)}
                                    </Badge>
                                {/if}
                            </div>
                        </li>
                    </ul>
                </CardBody>
            </Card>
        {/if}
    {/if}
{/key}
