<script>
import axios from "axios";
import { standings ,driverMap} from './stores.js';
import RaceStanding from "./RaceStanding.svelte";


    //var customData = require('.data/rs.json');

		
		
		
	axios.get('./data/driver.json')
		.then((response) => {
			console.log("drivers:"+response.data.length);
			const driverTmp={}
			response.data.forEach(function (driver) {
				driverTmp[driver.carNumber]=driver;
			});
			driverMap.set(driverTmp);
							console.log("did set driverMap");

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

			//dispatch({type:'FETCH_USERS_REJECTED', payload:err});
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
</script>

<main>
	    <h3 class="center">Derby Race Results</h3>
		{#each $standings as standing,i}
		<RaceStanding idx={i}/>
		{/each}
</main>

<style>

</style>