<script>
    import {  driverMap, carFilter, doRefreshBlocks} from './stores.js';
    import CarAndDriver from "./CarAndDriver.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import CarFilter from "./CarFilter.svelte";
    import {safeGetAt} from "./utils.js";
    import {  prefStore} from './stores.js';

    
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
    <h4>Chart List </h4>
    <p/>
    <MaterialAdd  clickHandleRoute="/chartAdd" />
    <CarFilter/>
    
            {#each getCarNumbersAsList($driverMap) as carNumber}
                {#if filterMatches(carNumber, $carFilter)}
                <div class="panel panel-info">
                    </div>
                {/if}
            {/each}
    </div>