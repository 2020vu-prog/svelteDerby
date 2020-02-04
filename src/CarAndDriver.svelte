 <script>
import { standings,driverMap } from './stores.js';
export let carNumber;
export let isWinner;
export let phaseLetter;
const getDriverName =  ()=> {
    console.log("gdn: "+carNumber)
        if (carNumber && $driverMap[ carNumber]) {
            return ($driverMap[carNumber].firstName);
        }
        else{
            return " ";
        }
    };

</script>
{#if isWinner}
<img src="data/checkered-flag-svgrepo-com.svg" width="25px"/>
{:else if phaseLetter}
   <button type="button" class="btn btn-warning">{phaseLetter}</button>
{:else}
<img src="data/checkered-flag-svgrepo-com.svg" width="25px" style="visibility:hidden"/>
{/if}
<big><b>{carNumber}</b></big> {getDriverName()}
