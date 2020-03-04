 <script>
import { standings,driverMap } from './stores.js';
export let carNumber;
export let isWinner;
export let phaseLetter;
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
   <button type="button" class="btn btn-warning">{phaseLetter}</button>
{:else}
<img alt="noflag" src="data/checkered-flag-svgrepo-com.svg" width="25px" style="visibility:hidden"/>
{/if}
<big><b>{carNumber}</b></big> {getDriverName(carNumber)}
