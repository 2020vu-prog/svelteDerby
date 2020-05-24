<script>
    import CarAndDriver from "./CarAndDriver.svelte";
    import InfoButton from "./InfoButton.svelte";
    import { onMount } from "svelte";

    import { racePhaseMap, driverMap, nextOnBlockKey } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { safeGetAt, fmtChartPosition, hhmmssFmt } from "./utils.js";

    export let refreshTime;
    export let phaseKey;
    export let at;
    let racePhase = {};
    let rp = racePhase;
    let hhmmss;
    let chartPosition;
    let bgColor;

    const updateBoundVars = async (at) => {
        racePhase = $racePhaseMap[phaseKey];
        rp = racePhase;
        hhmmss = hhmmssFmt(at);
        bgColor = getBgColor();
        chartPosition = await fmtChartPosition(racePhase);
    };
    $: {
        console.log("rp changed:", at);
        updateBoundVars(at);
    }
    //console.log("RacePhaseKey:", phaseKey)
    //console.log("RacePhase:", racePhase)
    const getBgColor = () => {
        if ($nextOnBlockKey === phaseKey) {
            console.log(
                "nob getBgColor key:" + JSON.stringify($nextOnBlockKey)
            );
            console.log("nob refresh:", refreshTime);

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
        return phaseWinTime;
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
        updateBoundVars(at);
    });
    const shouldRender = (racePhase) => {
        return !racePhase.del;
    };
</script>

{#if refreshTime && shouldRender(racePhase)}
    <div class="well well-sm " style="background: {bgColor}">
        <div class="panel panel-info ">
            <div class="panel-heading">
                {chartPosition}
                <span class="spanRight">
                    {hhmmss}
                    <InfoButton dbName="RacePhase" dbKey={phaseKey} />
                </span>
            </div>

            <ul class="list-group ">
                <li class="list-group-item ">
                    <CarAndDriver
                        number={rp.carNumbers[0]}
                        isWinner={isWinner(1, rp)}
                        phaseLetter={getPhaseIcon(rp)}
                        timerLink={getTimerLink(rp)}
                        at={safeGetAt($driverMap, rp.carNumbers[0])} />
                    {#if isWinner(1, rp)}
                        <big class="bigbadge badge">
                            {getPhaseLetter(rp)}:{getWinTime(1, rp)}
                        </big>
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
                        <big class="bigbadge badge">
                            {getPhaseLetter(rp)}:{getWinTime(2, rp)}
                        </big>
                    {/if}
                </li>

            </ul>
        </div>
    </div>
{/if}
