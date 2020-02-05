<script>
import { standings ,driverMap, carFilter, nextOnBlocks, raceConfig,doRefreshBlocks} from './stores.js';
import RaceStanding from "./RaceStanding.svelte";
import RacePhase from "./RacePhase.svelte";



const filterMatches=(standing,lclFilter)=>{
	if(! lclFilter) return true;
	let re = new RegExp('^' +lclFilter);

	return ( String(standing.carNumber1 ).match(re)|| String(standing.carNumber2).match(re));
}
</script>

<main>


<h4>Next On Blocks</h4>

		<RacePhase refreshTime={$doRefreshBlocks} />
		<hr/>
		
		<h4>Race History</h4>

	
				Filter: <input type="number" maxLength="3" size="3" bind:value={$carFilter}>

		{#each $standings as standing,i}
			{#if filterMatches(standing, $carFilter)}
				<RaceStanding idx={i}/>
			{/if}
		{/each}
</main>

<style>

</style>