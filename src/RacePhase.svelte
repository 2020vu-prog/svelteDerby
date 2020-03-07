<script>
 import CarAndDriver from './CarAndDriver.svelte'
 import { onMount } from 'svelte';

import { driverMap,nextOnBlocks } from './stores.js';
import MaterialAdd from "./MaterialAdd.svelte";

export let refreshTime;

const getBgColor=()=>{
    console.log("nob getBgColor:" + JSON.stringify($nextOnBlocks));

    return $nextOnBlocks.rs?"Green":"Red";
}

const getPhaseLetter=()=>{
    console.log("nob getPhaseLetter:" + JSON.stringify($nextOnBlocks));

    //return "A";
    return $nextOnBlocks.phaseLiteral;
}
onMount(async () => {
    console.log("mounted first nob:",$nextOnBlocks);
	});
</script>

{#if $nextOnBlocks && refreshTime}
        <div class="well well-sm " style="background: {getBgColor()}">
            <div class="panel panel-info ">
                <ul class="list-group ">
                    <li class="list-group-item ">
                        <CarAndDriver carNumber={$nextOnBlocks.carNumbers[0]}  isWinner="" phaseLetter={getPhaseLetter()} />
                    </li>
                    <li class="list-group-item">
                        <CarAndDriver carNumber={$nextOnBlocks.carNumbers[1]}  isWinner="" phaseLetter={getPhaseLetter()} />
                    </li>

                </ul>
            </div>
        </div>

{:else}
        Blocks are empty
{/if}
