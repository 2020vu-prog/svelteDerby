<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import VirtualList from "@sveltejs/svelte-virtual-list";
    import {
        userEmail,
        driverMap,
        carFilter,
        doRefreshBlocks,
        uiPageSize,
        selectedDriverMap,
        selectedDriverList,
    } from "./stores.js";
    import CarAndDriver from "./CarAndDriver.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import CarFilter from "./CarFilter.svelte";
    import { safeGetAt } from "./utils.js";
    import { isEmailAllowedRoutePath } from "./utils.js";
    import { onMount } from "svelte";
    import { push, pop, location } from "svelte-spa-router";
    import { getMainFull } from "./utils.js";
    import { faEdit } from "@fortawesome/free-solid-svg-icons/faEdit";
    import Icon from "fa-svelte";
    export let params = {};
    var mainFullPx = 300;

    var editable = false;
    var selectable = false;
    var carNumberList = [];
    var start;
    var end;
    onMount(async () => {
        log.debug(`DriverList userEmail: ${$userEmail}`);
        log.debug("DriverList mounted : ", $location, params);

        editable = isDriverEditable($userEmail);
        mainFullPx = getMainFull(["#dlTitle"]);

        wip = $selectedDriverMap;
        updateSelectTotal();
    });
    $: {
        log.debug("DriverList location: ", $location); // trigger param reload on location change
        selectable = params.selectable;
    }
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

    $: {
        log.debug(`driver virtualList: start: ${start} end: ${end}`);
    }
    $: {
        carNumberList = getCarNumbersAsList(
            $driverMap,
            $carFilter
        ).filter((cn) => filterMatches(cn, $carFilter));
    }

    function carAndDriverOnClick(number) {
        if (selectable) {
        } else {
            push(`/driverInfo/${number}`);
        }
    }
    var wip = {};
    function clearSelect() {
        wip = {};
        $selectedDriverMap = wip;
        updateSelectTotalWhenSettled();
    }
    function finishSelect() {
        $selectedDriverMap = wip;
        pop();
    }
    function updateSelectTotal() {
        setTimeout(updateSelectTotalWhenSettled, 300);
    }
    function updateSelectTotalWhenSettled() {
        $selectedDriverMap = wip;
        //wipTotal = $selectedDriverList.length
    }
</script>

<style>
    div :global(.xLargeEdit) {
        font-size: 28px;
    }

    input[type="checkbox"] {
        transform: scale(2);
    }
</style>

<div id="dlTitle">
    <h4>
        Driver
        {#if selectable}Selection{:else}List{/if}
        <CarFilter />
    </h4>
    {#if selectable}
        <SpinnerButton on:click={finishSelect}>
            Select [{$selectedDriverList.length}] Drivers
        </SpinnerButton>
        <SpinnerButton on:click={clearSelect}>
            Clear Selected Drivers
        </SpinnerButton>
    {/if}

    <p />
</div>

{#if !selectable}
    <MaterialAdd clickHandleRoute="/driverAdd" />
{/if}

<VirtualList
    height="{mainFullPx}px"
    items={carNumberList}
    bind:start
    bind:end
    let:item
>
    <Card
        class="mt-3 border border-info"
        on:click={() => carAndDriverOnClick(item)}
    >
        <CardBody>
            <div style="display: inline">
                <CarAndDriver
                    number={item}
                    at={safeGetAt($driverMap, item)}
                    isWinner=""
                    phaseLetter=""
                />

                {#if selectable}
                    <span style="display: inline; float: right">
                        <input
                            type="checkbox"
                            bind:checked={wip[item]}
                            on:click={(event) => {
                                updateSelectTotal();
                                event.stopPropagation();
                            }}
                        />
                    </span>
                {:else if editable}
                    <span
                        on:click={(event) => {
                            push(`/driverAdd/${item}`);
                            event.stopPropagation();
                        }}
                        style="display: inline; float: right"
                    >
                        <Icon class="xLargeEdit" icon={faEdit} />
                    </span>
                {/if}
            </div>
        </CardBody>
    </Card>
</VirtualList>
{#if selectable}
    <SpinnerButton on:click={finishSelect}>
        Select [{$selectedDriverList.length}] Drivers
    </SpinnerButton>
{/if}
