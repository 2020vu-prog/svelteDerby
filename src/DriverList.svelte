<script>
import {  driverMap, carFilter, doRefreshBlocks} from './stores.js';
import CarAndDriver from "./CarAndDriver.svelte";
import MaterialAdd from "./MaterialAdd.svelte";
import CarFilter from "./CarFilter.svelte";


const filterMatches=(carNumber,lclFilter)=>{
	if(! lclFilter) return true;
	let re = new RegExp('^' +lclFilter);

	return ( String(carNumber ).match(re));
}
const getDriversAsList=()=>{
    return Object.keys($driverMap);
}
</script>


<div>
<h4>Driver List </h4>
<p/>
<MaterialAdd/>
<CarFilter/>

		{#each getDriversAsList() as driver,i}
			{#if filterMatches(driver, $carFilter)}
            <div class="panel panel-info">
				<CarAndDriver carNumber={driver} isWinner="" phaseLetter=""/>
                </div>
			{/if}
		{/each}
</div>