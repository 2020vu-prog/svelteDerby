 <script>
 import CarAndDriver from './CarAndDriver.svelte'
 import { standings,driverMap } from './stores.js';
	export let idx;
 const standing=$standings[idx]

const hhmmss = ()=> {
        var time = new Date(standing.lastUpdateMS);
        return (
            ("0" + time.getHours()).slice(-2) + ":" +
            ("0" + time.getMinutes()).slice(-2));
        //+ ":" + ("0" + time.getSeconds()).slice(-2));
    };

const isWinner =  (lane, phase) =>{

        var phaseWinTime = getPhaseWinTime(phase);
        if (phaseWinTime == 0.0) {
            return true;
        }

        if (lane === 1) {
            return phaseWinTime > 0;
        } else {
            return phaseWinTime < 0;
        }
    };
const getPhaseWinTime =  (phase) =>{
        if (phase === 1) {
            return standing.phase1DeltaMS;
        }
        if (phase === 2) {
            return standing.phase2DeltaMS;
        }
        if (phase === 0) {
            return (standing.phase1DeltaMS + standing.phase2DeltaMS);
        }
        return undefined;
    };
const getWinTime =  (lane, phase)=> {

        var phaseWinTime = getPhaseWinTime(phase, );
        if (lane === 2) {
            phaseWinTime = phaseWinTime * -1;
        }
        if (phaseWinTime == 0) {
            return "Tied";
        }
        return phaseWinTime;
    };
 </script>       
        <div class="well well-sm">
            <div class="panel panel-info">
                <div class="panel-heading">Heat: {standing.chartPosition}<span class="spanRight">{hhmmss()}</span></div>

                <ul class="list-group">
                    <li class="list-group-item">
                        <CarAndDriver carNumber={standing.carNumber1} isWinner={isWinner(1,0)} phaseLetter=""/>
                        {#if isWinner(1,0)}
                            <big class="bigbadge badge">Overall: {getWinTime(1,0)} </big>
                        {/if}
                        {#if isWinner(1,1)}
                            <big class="bigbadge badge">A: {getWinTime(1,1)}</big>
                        {/if}
                        {#if isWinner(1,2)}
                            <big class="bigbadge badge">B: {getWinTime(1,2)}</big>
                        {/if}

                    </li>
                    <li class="list-group-item">
                        <CarAndDriver carNumber={standing.carNumber2}  isWinner={isWinner(2,0)} phaseLetter="" />
                        {#if isWinner(2,0)}
                            <big class="bigbadge badge">Overall: {getWinTime(2,0)}</big>
                        {/if}
                        {#if isWinner(2,1)}
                            <big class="bigbadge badge">A: {getWinTime(2,1)}</big>
                        {/if}
                        {#if isWinner(2,2)}
                            <big class="bigbadge badge">B: {getWinTime(2,2)}</big>
                        {/if}
                    </li>

                </ul>
            </div>
        </div>
    