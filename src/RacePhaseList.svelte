<script>
	import { racePhases, driverMap, carFilter, nextOnBlocks, raceConfig, doRefreshBlocks } from './stores.js';
	import RaceStanding from "./RaceStanding.svelte";
	import RacePhase from "./RacePhase.svelte";
	import CarFilter from "./CarFilter.svelte";
	import MaterialAdd from "./MaterialAdd.svelte";




	const filterMatches = (phase, lclFilter) => {
		if (!lclFilter) return true;
		let re = new RegExp('^' + lclFilter);

		return phase.carNumbers.filter((cn) => cn.match(re)).length > 0
	}
	//loc &drb passed in to coerce svelte refesh screen
	const getRacePhases=(drb)=>{
		return $racePhases;
	}
</script>

<main>


	<h4>Next On Blocks</h4>
	<MaterialAdd clickHandleRoute="/raceStandingAdd/RacePhase" />

	<RacePhase refreshTime={$doRefreshBlocks} />
	<hr />

	<h4>Race Phases</h4>

	<CarFilter />

	{#each getRacePhases( $doRefreshBlocks) as racePhase,i}
		{#if filterMatches(racePhase, $carFilter, $doRefreshBlocks)}
			<RacePhase idx={i}/>
		{/if}
	{/each}
</main>

<style>

</style>