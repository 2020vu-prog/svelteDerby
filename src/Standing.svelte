<script>
import { standings ,driverMap, carFilter, nextOnBlocks, raceConfig,doRefreshBlocks} from './stores.js';
import RaceStanding from "./RaceStanding.svelte";
import RacePhase from "./RacePhase.svelte";
import CarFilter from "./CarFilter.svelte";
import MaterialAdd from "./MaterialAdd.svelte";



const filterMatches=(standing,lclFilter)=>{
	if(! lclFilter) return true;
	let re = new RegExp('^' +lclFilter);

	return ( String(standing.carNumber1 ).match(re)|| String(standing.carNumber2).match(re));
}
</script>

<main>


<h4>Next On Blocks</h4>
<MaterialAdd  clickHandleRoute="/raceStandingAdd" />

		<RacePhase refreshTime={$doRefreshBlocks} />
		<hr/>
		
		<h4>Race History</h4>
		<CarFilter/>

		{#each $standings as standing,i}
			{#if filterMatches(standing, $carFilter)}
				<RaceStanding idx={i}/>
			{/if}
		{/each}
</main>

<style>

</style>