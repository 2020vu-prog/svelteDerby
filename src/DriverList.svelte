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
const getCarNumbersAsList=(driverMap)=>{
    return Object.keys(driverMap);
}
</script>


<div>
<h4>Driver List </h4>
<p/>
<MaterialAdd  clickHandleRoute="/driverAdd" />
<CarFilter/>

		{#each getCarNumbersAsList($driverMap) as carNumber}
			{#if filterMatches(carNumber, $carFilter)}
            <div class="panel panel-info">
				<CarAndDriver number={carNumber} isWinner="" phaseLetter=""/>
                </div>
			{/if}
		{/each}
</div>