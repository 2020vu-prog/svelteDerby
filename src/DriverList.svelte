<script>
    import { driverMap, carFilter, doRefreshBlocks } from "./stores.js";
    import CarAndDriver from "./CarAndDriver.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import CarFilter from "./CarFilter.svelte";
    import { safeGetAt } from "./utils.js";

    const filterMatches = (driver, lclFilter) => {
        if (!lclFilter) return true;
        let re = new RegExp("^" + lclFilter);
        return String(driver).match(re);
    };
    const getCarNumbersAsList = (driverMap) => {
        return Object.keys(driverMap);
    };
    function isDriverEditable() {
        return false; //TODO: consider user perms!
    }
</script>

<div>
    <h4>
        Driver List
        <CarFilter />
    </h4>

    <p />
    <MaterialAdd clickHandleRoute="/driverAdd" />

    {#each getCarNumbersAsList($driverMap) as carNumber}
        {#if filterMatches(carNumber, $carFilter)}
            <div class="panel panel-info">
                <CarAndDriver
                    number={carNumber}
                    at={safeGetAt($driverMap, carNumber)}
                    isWinner=""
                    editable={isDriverEditable()}
                    phaseLetter="" />
            </div>
        {/if}
    {/each}
</div>
