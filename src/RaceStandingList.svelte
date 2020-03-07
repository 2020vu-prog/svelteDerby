<script>
	import { standings, driverMap, carFilter, nextOnBlocks, raceConfig, doRefreshBlocks } from './stores.js';
	import RaceStanding from "./RaceStanding.svelte";
	import RacePhase from "./RacePhase.svelte";
	import CarFilter from "./CarFilter.svelte";
	import MaterialAdd from "./MaterialAdd.svelte";
	import { location } from 'svelte-spa-router'

	export let params = {}

	const getTitle = () => {
		console.log("mounted type:", params.type);
		return (params.type === "Pending") ? "Pending Races" : "Race History"

	};
	const typeFilter = (standing) => {
		console.log(" type filter:", params.type);

		if (params.type === "Pending") {
			return standing.isPending();
		}
		else { // History
			return standing.hasResults();
		}

	}
	const filterMatches = (standing, lclFilter) => {
		if (!lclFilter) return true;
		let re = new RegExp('^' + lclFilter);

		return standing.carNumbers.filter((cn) => cn.match(re)).length > 0
	}
	//loc &drb passed in to coerce svelte refesh screen
	const getStandings=(loc,drb)=>{
		return $standings;
	}
</script>

<main>


	<h4>Next On Blocks</h4>
	<MaterialAdd clickHandleRoute="/raceStandingAdd/RaceStanding" />

	<RacePhase refreshTime={$doRefreshBlocks} />
	<hr />

	<h4>{getTitle($location)}</h4>

	<CarFilter />

	{#each getStandings($location, $doRefreshBlocks) as standing,i}
		{#if filterMatches(standing, $carFilter, $doRefreshBlocks)}
		{#if typeFilter(standing,$doRefreshBlocks )}
			<RaceStanding idx={i} refresh={doRefreshBlocks}/>
		{/if}
		{/if}
	{/each}
</main>

<style>

</style>