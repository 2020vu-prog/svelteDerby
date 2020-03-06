<script>
import {  driverMap, carFilter, doRefreshBlocks} from './stores.js';
import CarAndDriver from "./CarAndDriver.svelte";
import MaterialAdd from "./MaterialAdd.svelte";
import CarFilter from "./CarFilter.svelte";


const filterMatches=(driver,lclFilter)=>{
	if(! lclFilter) return true;
	let re = new RegExp('^' +lclFilter);
	return ( String(driver ).match(re));
}
const getDriversAsList=(driverMap)=>{
    return Object.keys(driverMap);
}
</script>


<div>
<h4>Driver List </h4>
<p/>
<MaterialAdd  clickHandleRoute="/driverAdd" />
<CarFilter/>

		{#each getDriversAsList($driverMap) as driver,i}
			{#if filterMatches(driver, $carFilter)}
            <div class="panel panel-info">
				<CarAndDriver carNumber={driver} isWinner="" phaseLetter=""/>
                </div>
			{/if}
		{/each}
</div>