<script>
    export let params = {};
    import CarAndDriver from "./CarAndDriver.svelte";
    import { safeGetAt } from "./utils.js";
    import { driverMap, racePhaseMap, standingsMap } from "./stores.js";

    import { db } from "./eventDb.js";
    import { onMount } from "svelte";

    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    import { spring } from "svelte/motion";
    import Pie from "./Pie.svelte";

    var racePhaseList = Object.values($racePhaseMap);
    racePhaseList = racePhaseList.filter((a) => {
        return a.cn.indexOf(params.number) > -1;
    });

    var numPhasesRaced = racePhaseList.length;
    var numPhasesWon = 0;
    var phaseWinSum = 0;
    racePhaseList.forEach(function (item) {
        const entityFactory = new EntityFactory({});
        var entityRP = entityFactory.build(item);
        if (
            entityRP.isWinner(item.cn.indexOf(String(params.number)) + 1, false)
        ) {
            numPhasesWon++;
            phaseWinSum += Math.abs(entityRP.getPhaseDeltaMS());
        }
    });

    var standingsList = Object.values($standingsMap);
    standingsList = standingsList.filter((a) => {
        return a.cn.indexOf(params.number) > -1;
    });

    var numHeatsRaced = standingsList.length;
    var numHeatsWon = 0;
    var heatWinSum = 0;
    standingsList.forEach(function (item) {
        if (item.del) {
            numHeatsRaced--;
            return;
        }
        const entityFactory = new EntityFactory({});
        var entityStanding = entityFactory.build(item);
        if (
            entityStanding.isWinner(
                item.cn.indexOf(String(params.number)) + 1,
                0
            ) == true
        ) {
            numHeatsWon++;
            heatWinSum += entityStanding.getWinTime(
                item.cn.indexOf(String(params.number)) + 1,
                0
            );
        }
    });

    var bmdFromDexie;
    var bpListFromDexie;
    onMount(async () => {
        bmdFromDexie = await db.BracketMetaData.toArray();
        bpListFromDexie = await db.BracketPos.toArray();
        bpListFromDexie.sort((a, b) => {
            return a.at - b.at;
        });
        bpListFromDexie = bpListFromDexie.filter((a) => {
            return (
                Object.keys(a.pos).indexOf("A") == -1 &&
                Object.values(a.pos)[0].ptcp == String(params.number)
            );
        });
    });
    const placeMap = {
        "": "Raced",
        Place1: "1st Place",
        Place2: "2nd Place",
        Place3: "3rd Place",
        Place4: "4th Place",
        Place5: "5th Place",
        Place6: "6th Place",
        Place7: "7th Place",
        Place8: "8th Place",
    };

    function getNameFromBracketSK(bracketSK) {
        return bmdFromDexie.filter((a) => {
            return a.SK == bracketSK;
        })[0].bracketName;
    }

    var phaseWinPercentage = 0;
    $: phaseWinPercentage = (numPhasesWon / numPhasesRaced) * 100;

    const phaseStore = spring(0, { stiffness: 0.08, damping: 1 });
    $: phaseStore.set(phaseWinPercentage ? phaseWinPercentage : 0);

    var heatWinPercentage = 0;
    $: {
        if (bpListFromDexie) {
            heatWinPercentage = (numHeatsWon / numHeatsRaced) * 100;
        }
    }
    const heatStore = spring(0, { stiffness: 0.08, damping: 1 });
    $: heatStore.set(heatWinPercentage ? heatWinPercentage : 0);
</script>

<style>
    .column {
        float: left;
        width: 50%;
        text-align: center;
    }

    /* Clear floats after the columns */
    .row:after {
        content: "";
        display: table;
        clear: both;
    }
</style>

<div style="font-size: xx-large; width: 100%; text-align: center">
    <CarAndDriver
        number={params.number}
        at={safeGetAt($driverMap, params.number)}
        isWinner=""
        phaseLetter="" />
</div>
<hr />
<br />
<br />
<div class="row">
    <div class="column">
        <h2>Phases:</h2>
        <Pie size={150} percent={$phaseStore} />
        <br />
        <strong>Phases Won:</strong>
        {numPhasesWon}/{racePhaseList.length}
        <br />
        <strong>Avg. Win Time:</strong>
        {phaseWinSum > 0 ? Math.round(phaseWinSum / numPhasesWon) : '--'} ms
    </div>
    <div class="column">
        <h2>Heats:</h2>
        <Pie size={150} percent={$heatStore} />
        <br />
        <strong>Heats Won:</strong>
        {numHeatsWon}/{numHeatsRaced}
        <br />
        <strong>Avg. Win Time:</strong>
        {heatWinSum > 0 ? Math.round(heatWinSum / numHeatsWon) : '--'} ms
        <br />
    </div>
</div>
<hr />
<div style="width: 100%; text-align: center">
    <h2>Placements:</h2>
    {#if bpListFromDexie && bpListFromDexie.length > 0}
        {#each bpListFromDexie as bp}
            {#if placeMap[bp.SK.split(':')[1]]}
                <strong>{getNameFromBracketSK(bp.SK.split(':')[0])}:</strong>
                {placeMap[bp.SK.split(':')[1]]}
                <br />
            {/if}
        {/each}
    {:else}This racer has not yet participated in any complete brackets.{/if}

    <hr />
    <h6>
        This feature is currently in BETA and accuracy of the data on this
        screen should be expected but is not guaranteed. Please report any
        issues to your local race city official.
    </h6>
</div>
