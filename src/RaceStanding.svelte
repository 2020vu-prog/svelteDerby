<script>
    import CarAndDriver from "./CarAndDriver.svelte";
    import InfoButton from "./InfoButton.svelte";
    import { standingsMap, driverMap } from "./stores.js";
    import { safeGetAt, fmtChartPosition } from "./utils.js";
    import { onMount } from "svelte";
    export let standingKey;

    export let refresh; // TODO: should probably use lastUpdate!
    console.log("standingKey", standingKey);

    var chartPosition = "";
    const standing = $standingsMap[standingKey];

    console.log("refresh", refresh);

    onMount(async () => {
        chartPosition = await fmtChartPosition(standing);
    });
    const hhmmss = () => {
        var time = new Date(standing.lastUpdate);
        return (
            ("0" + time.getHours()).slice(-2) +
            ":" +
            ("0" + time.getMinutes()).slice(-2)
        );
        //+ ":" + ("0" + time.getSeconds()).slice(-2));
    };

    const isWinner = (lane, phase) => {
        return standing.isWinner(lane, phase);
    };

    const getWinTime = (lane, phase) => {
        return standing.getWinTime(lane, phase);
    };
</script>

<div class="well well-sm">
    <div class="panel panel-info">
        <div class="panel-heading">
            {chartPosition}
            <span class="spanRight">{hhmmss()}
                <InfoButton dbName="RaceStanding" dbKey={standingKey} /></span>
        </div>

        <ul class="list-group">
            <li class="list-group-item">
                <CarAndDriver number={standing.carNumbers[0]} isWinner={isWinner(1, 0)} phaseLetter=""
                    at={safeGetAt($driverMap, standing.carNumbers[0])} />
                {#if isWinner(1, 0)}
                    <big class="bigbadge badge">
                        Overall: {getWinTime(1, 0)}
                    </big>
                {/if}
                {#if isWinner(1, 1)}
                    <big class="bigbadge badge">A: {getWinTime(1, 1)}</big>
                {/if}
                {#if isWinner(1, 2)}
                    <big class="bigbadge badge">B: {getWinTime(1, 2)}</big>
                {/if}

            </li>
            <li class="list-group-item">
                <CarAndDriver
                    number={standing.carNumbers[1]}
                    isWinner={isWinner(2, 0)}
                    phaseLetter=""
                    at={safeGetAt($driverMap, standing.carNumbers[0])} />
                {#if isWinner(2, 0)}
                    <big class="bigbadge badge">
                        Overall: {getWinTime(2, 0)}
                    </big>
                {/if}
                {#if isWinner(2, 1)}
                    <big class="bigbadge badge">A: {getWinTime(2, 1)}</big>
                {/if}
                {#if isWinner(2, 2)}
                    <big class="bigbadge badge">B: {getWinTime(2, 2)}</big>
                {/if}
            </li>

        </ul>
    </div>
</div>
