<script>
 export let params = {};
 import CarAndDriver from "./CarAndDriver.svelte";
 import { safeGetAt } from "./utils.js";
 import {
        driverMap,
        racePhaseMap,
        standingsMap
    } from "./stores.js";

import { db } from "./eventDb.js";
import { onMount } from "svelte";


const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    
    
    var racePhaseList = Object.values($racePhaseMap);
    racePhaseList = racePhaseList.filter((a)=> {return a.cn.indexOf(params.number)>-1})
    

    function determineIfCarWonPhase(racePhase){
        if (!racePhase.phr || racePhase.del){
            numPhasesRaced--;
            return false;
        }
        if (racePhase.cn.indexOf(String(params.number))==0) {
            return racePhase.phr[0]<racePhase.phr[1];
        } else {
            return racePhase.phr[1]<racePhase.phr[0];
        }
    }

    var numPhasesRaced = racePhaseList.length;
    var numPhasesWon = 0;
    var phaseWinSum = 0;
    racePhaseList.forEach(function(item) {
        if (determineIfCarWonPhase(item)==true){
            numPhasesWon++;
            phaseWinSum+=Math.abs((item.phr[0]-item.phr[1])/1000)
        }
    })




    var standingsList = Object.values($standingsMap);
    standingsList = standingsList.filter((a)=> {return a.cn.indexOf(params.number)>-1})


    var numHeatsRaced = standingsList.length;
    var numHeatsWon = 0;
    var heatWinSum = 0;
    standingsList.forEach(function(item) {
        if (item.del) {
            numHeatsRaced--;
            return;
        }
        const entityFactory = new EntityFactory({});
        var entityStanding = entityFactory.build(item);
        if (entityStanding.isWinner(item.cn.indexOf(String(params.number))+1, 0)==true){
            numHeatsWon++;
            heatWinSum+=entityStanding.getWinTime(item.cn.indexOf(String(params.number))+1, 0)
        }
    })
    




var bmdFromDexie;
var bpListFromDexie;
onMount(async () => {
        bmdFromDexie = await db.BracketMetaData.toArray();
        bpListFromDexie = await db.BracketPos.toArray();
        bpListFromDexie = bpListFromDexie.filter((a)=> {return Object.keys(a.pos).length==1 && Object.values(a.pos)[0].ptcp==String(params.number)});
});


function getNameFromBracketSK(bracketSK){
    return bmdFromDexie.filter((a)=> {return a.SK == bracketSK})[0].bracketName;
}
</script>
<CarAndDriver
                    number={params.number}
                    at={safeGetAt($driverMap, params.number)}
                    isWinner=""
                    phaseLetter="" />
<br><br>
Phases Won: {numPhasesWon++}/{racePhaseList.length}<br>
Avg. Phase Win Time: {Math.round(phaseWinSum/numPhasesWon)} ms
<br><br>
Heats Won: {numHeatsWon}/{numHeatsRaced}<br>
Avg. Heat Win Time: {Math.round(heatWinSum/numHeatsWon)} ms
<br><br>
{#if bpListFromDexie}
{#each bpListFromDexie as bp}
<strong>{getNameFromBracketSK(bp.SK.split(":")[0])}:</strong> {bp.SK.split(":")[1]}<br>
{/each}
{/if}
