<script>
import axios from "axios";
import { standings ,driverMap, carFilter, nextOnBlocks, raceConfig} from './stores.js';
import RaceStanding from "./RaceStanding.svelte";
import RacePhase from "./RacePhase.svelte";

var refreshBlocks=0;
const fakeNextOnBlocks=     {
        "carNumber1": 101,
        "carNumber2": 115,
        "loadMS": 1570286201451,
        "phaseNumber": 1,
        "lastUpdateMS": 1570286201474,
        "raceStandingID": 3,
        "id": 2,
        "version": 1
      };
	axios.get('./data/driver.json')
		.then((response) => {
			console.log("drivers:"+response.data.length);
			const driverTmp={}
			response.data.forEach(function (driver) {
				driverTmp[driver.carNumber]=driver;
			});
			driverMap.set(driverTmp);
							console.log("did set driverMap");
			nextOnBlocks.set(fakeNextOnBlocks);
			refreshBlocks+=1;
		

		})
		.catch((err) => {
							console.log(err);
		})


    //const racerUrl="http://s3.amazonaws.com/chicago2019oct-s3derbyracedata-vtp3oauyufv6/data/racer.json.gz?nocache=1580673517399";
	const racerUrl='./data/rs.json'
	axios.get(racerUrl)
		.then((response) => {
			console.log(response.data.length);
			const sortedStandings=            response.data.sort(sortBy('lastUpdateMS', true, parseInt));
			standings.set(sortedStandings);
							console.log("did set standings");

		})
		.catch((err) => {
							console.log(err);
		})
const sortBy = (field, reverse, primer) =>{
        var key = primer ?
            function (x) {
                return primer(x[field])
            } :
            function (x) {
                return x[field]
            };

        reverse = !reverse ? 1 : -1;

        return function (a, b) {
            return a = key(a), b = key(b), reverse * ((a > b) - (b > a));
        }
    };

const shouldDisplay=(standing,lclFilter)=>{
	if(! lclFilter) return true;
let re = new RegExp('^' +lclFilter);

	//return (lclFilter=== standing.carNumber1 || lclFilter===standing.carNumber2);
	return ( String(standing.carNumber1 ).match(re)|| String(standing.carNumber2).match(re));
}
</script>

<main>
	    <h3 class="center">{$raceConfig.orgName} Derby Race</h3>
		<h4>Next On Blocks</h4>

		<RacePhase refreshTime={refreshBlocks}/>
		<hr/>
		
		<h4>Race History</h4>

	
				Filter: <input type="number" maxLength="3" size="3" bind:value={$carFilter}>

		{#each $standings as standing,i}
			{#if shouldDisplay(standing, $carFilter)}
				<RaceStanding idx={i}/>
			{/if}
		{/each}
</main>

<style>

</style>