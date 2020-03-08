<script>
    import CarAndDriver from './CarAndDriver.svelte'
    import { onMount } from 'svelte';

    import { racePhaseMap, driverMap, nextOnBlockKey } from './stores.js';
    import MaterialAdd from "./MaterialAdd.svelte";

    export let refreshTime;
    export let phaseKey;
    const racePhase = $racePhaseMap[phaseKey];

    console.log("RacePhaseKey:", phaseKey)
    console.log("RacePhase:", racePhase)
    const getBgColor = () => {
        if ($nextOnBlockKey === phaseKey) {


            console.log("nob getBgColor:" + JSON.stringify($nextOnBlockKey));

            return racePhase.rs ? "Green" : "Red";
        } else {
            return "Gray";

        }
    }

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

    const getPhaseLetter = () => {

        return racePhase.phaseLiteral;
    }
    const getTimerLink = () => {
        return "/ManualTimerAdd/" + racePhase.classKey
    }
    onMount(async () => {
        if ($nextOnBlockKey === phaseKey) {
            console.log("mounted first nob:", $nextOnBlockKey);
        }
        else {
            console.log("Not  nob!", phaseKey);

        }
    });

</script>

{#if  refreshTime}
        <div class="well well-sm " style="background: {getBgColor()}">
            <div class="panel panel-info ">
                <ul class="list-group ">
                    <li class="list-group-item ">
                        <CarAndDriver carNumber={racePhase.carNumbers[0]}  isWinner={isWinner(1)} phaseLetter={getPhaseLetter()}  timerLink={getTimerLink()}/>
                        {#if isWinner(1)}
                            <big class="bigbadge badge">{getWinTime(1)} </big>
                        {/if}
                    </li>
                    <li class="list-group-item">
                        <CarAndDriver carNumber={racePhase.carNumbers[1]}  isWinner={isWinner(2)} phaseLetter={getPhaseLetter()}  timerLink={getTimerLink()}/>
                        {#if isWinner(2)}
                             <big class="bigbadge badge">{getWinTime(2)} </big>
                         {/if}
                    </li>

                </ul>
            </div>
        </div>


{/if}