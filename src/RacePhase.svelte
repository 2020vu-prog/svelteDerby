<script>
 import CarAndDriver from './CarAndDriver.svelte'

    import { standings,driverMap,nextOnBlocks } from './stores.js';
export let refreshTime;

const getBgColor=()=>{
    console.log("nob:" + JSON.stringify($nextOnBlocks));

    return $nextOnBlocks.raceStandingID?"Green":"Red";
}

const getPhaseLetter=()=>{
    return "A";
}
</script>
{#if $nextOnBlocks && refreshTime}
        <div class="well well-sm " style="background: {getBgColor()}">
            <div class="panel panel-info ">
                <ul class="list-group ">
                    <li class="list-group-item ">
                        <CarAndDriver carNumber={$nextOnBlocks.carNumber1}  isWinner="" phaseLetter={getPhaseLetter()} />
                    </li>
                    <li class="list-group-item">
                        <CarAndDriver carNumber={$nextOnBlocks.carNumber2}  isWinner="" phaseLetter={getPhaseLetter()} />
                    </li>

                </ul>
            </div>
        </div>

{:else}
        Blocks are empty
{/if}
