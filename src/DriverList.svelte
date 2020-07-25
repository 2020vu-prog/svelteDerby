<script>
    import { driverMap, carFilter, doRefreshBlocks } from "./stores.js";
    import CarAndDriver from "./CarAndDriver.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import CarFilter from "./CarFilter.svelte";
    import { safeGetAt } from "./utils.js";
    import { isEmailAllowedRoutePath, getUserEmail } from "./utils.js";
    import { onMount } from "svelte";

    var userEmail = "none";
    var editable = false;
    onMount(async () => {
        userEmail = await getUserEmail();
        console.log(`DriverList userEmail: ${userEmail}`);
        editable = isDriverEditable(userEmail);
    });
    const filterMatches = (driver, lclFilter) => {
        if (!lclFilter) return true;
        let re = new RegExp("^" + lclFilter);
        return String(driver).match(re);
    };
    const getCarNumbersAsList = (driverMap) => {
        return Object.keys(driverMap);
    };
    function isDriverEditable(paramEmail) {
        return isEmailAllowedRoutePath(paramEmail, "/driverAdd");
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
                    {editable}
                    phaseLetter="" />
            </div>
        {/if}
    {/each}
</div>
