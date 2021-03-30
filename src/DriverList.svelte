<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import VirtualList from "@sveltejs/svelte-virtual-list";
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
    import { getMainFull } from "./utils.js";
    var mainFullPx = 300;

    var editable = false;
    var carNumberList = [];
    var start;
    var end;
    onMount(async () => {
        log.debug(`DriverList userEmail: ${$userEmail}`);
        editable = isDriverEditable($userEmail);
        mainFullPx = getMainFull(["#dlTitle"]);
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
            log.debug("editCarAndDriver");
            push(`/driverAdd/${number}`);
        }
    }

    $: {
        log.debug(`driver virtualList: start: ${start} end: ${end}`);
    }
    $: {
        carNumberList = getCarNumbersAsList(
            $driverMap,
            $carFilter
        ).filter((cn) => filterMatches(cn, $carFilter));
    }
</script>

<div id="dlTitle">

    <h4>
        Driver List
        <CarFilter />
    </h4>

    <p />
</div>

<MaterialAdd clickHandleRoute="/driverAdd" />

<VirtualList
    height="{mainFullPx}px"
    items={carNumberList}
    bind:start
    bind:end
    let:item>
    <Card class="mt-3 border border-info">
        <CardBody>
            <div on:click={() => editCarAndDriver(item)}>
                <CarAndDriver
                    number={item}
                    at={safeGetAt($driverMap, item)}
                    isWinner=""
                    phaseLetter="" />
            </div>
        </CardBody>
    </Card>
</VirtualList>
