<script>
    import {
        userEmail,
        driverMap,
        carFilter,
        doRefreshBlocks,
        uiPageSize,
    } from "./stores.js";
    import CarAndDriver from "./CarAndDriver.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import CarFilter from "./CarFilter.svelte";
    import { safeGetAt } from "./utils.js";
    import { isEmailAllowedRoutePath } from "./utils.js";
    import { onMount } from "svelte";
    import { push } from "svelte-spa-router";

    var editable = false;
    onMount(async () => {
        console.log(`DriverList userEmail: ${$userEmail}`);
        editable = isDriverEditable($userEmail);
    });
    const filterMatches = (driver, lclFilter) => {
        if (!lclFilter) return true;
        let re = new RegExp("^" + lclFilter);
        return String(driver).match(re);
    };
    const getCarNumbersAsList = (driverMap, carFilter) => {
        return Object.keys(driverMap)
            .filter((carNumber) => filterMatches(carNumber, carFilter))
            .slice(0, $uiPageSize);
    };
    function isDriverEditable(paramEmail) {
        return isEmailAllowedRoutePath(paramEmail, "/driverAdd");
    }
    function editCarAndDriver(number) {
        if (editable) {
            console.log("editCarAndDriver");
            push(`/driverAdd/${number}`);
        }
    }
</script>

<div>
    <h4>
        Driver List
        <CarFilter />
    </h4>

    <p />
    <MaterialAdd clickHandleRoute="/driverAdd" />

    {#each getCarNumbersAsList($driverMap, $carFilter) as carNumber}
        {#if filterMatches(carNumber, $carFilter)}
            <div
                class="panel panel-info"
                on:click={() => editCarAndDriver(carNumber)}>
                <CarAndDriver
                    number={carNumber}
                    at={safeGetAt($driverMap, carNumber)}
                    isWinner=""
                    phaseLetter="" />
            </div>
        {/if}
    {/each}
</div>
