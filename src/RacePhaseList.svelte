<script>
	import {nextOnBlockKey, racePhaseMap, carFilter, doRefreshBlocks } from './stores.js';
	import RacePhase from "./RacePhase.svelte";
	import CarFilter from "./CarFilter.svelte";
	import MaterialAdd from "./MaterialAdd.svelte";




	const filterMatchesX= (phase, lclFilter) => {
		const fm= filterMatches(phase,lclFilter);
		console.log("filterMatch:", fm);
		return fm;
	}
		const filterMatches = (phase, lclFilter) => {
		console.log("filter:", phase)
		console.log("lclFilter:", lclFilter)
		if (!lclFilter) return true;
		if($nextOnBlockKey=== phase.classKey) return true;  //Always show!

		let re = new RegExp('^' + lclFilter);

		return phase.carNumbers.filter((cn) => cn.match(re)).length > 0
	}
	//loc &drb passed in to coerce svelte refesh screen
	const getRacePhases=(drb)=>{
		return Object.values($racePhaseMap);

	}
</script>

<main>


	<MaterialAdd clickHandleRoute="/raceStandingAdd/RacePhase" />

	


	<h4>Race Phases</h4>

	<CarFilter />

	{#each getRacePhases( $doRefreshBlocks) as racePhase}
		{#if filterMatchesX(racePhase, $carFilter, $doRefreshBlocks)}
			<RacePhase refreshTime={$doRefreshBlocks} phaseKey={racePhase.classKey}/>
		{/if}
	{/each}
</main>

<style>

</style>