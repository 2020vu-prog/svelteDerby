 <script>
import { driverMap } from './stores.js';
import {push, replace} from 'svelte-spa-router'

export let carNumber;
export let isWinner;
export let phaseLetter;
export let timerLink;
console.log("timerLink",timerLink);
const gotoTimer =  ()=> {
    console.log("routing to:", timerLink);
    //push("/drivers")
    
   // push("/ManualTimerAdd/1583608357232")
    push(timerLink)
}
    const getDriverName =  (number)=> {
    //console.log("gdn: "+carNumber)
        if (number && $driverMap[ number]) {
            return ($driverMap[number].name);
        }
        else{
            return " ";
        }
    };
</script>
{#if isWinner}
<img alt="flag" src="data/checkered-flag-svgrepo-com.svg" width="25px"/>
{:else if phaseLetter}
   <button type="button" class="btn btn-warning"  on:click={()=>gotoTimer()} >{phaseLetter}</button>
{:else}
<img alt="noflag" src="data/checkered-flag-svgrepo-com.svg" width="25px" style="visibility:hidden"/>
{/if}
<big><b>{carNumber}</b></big> {getDriverName(carNumber)}
