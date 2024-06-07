<script>
    import log from "loglevel";
    import { push, pop, replace } from "svelte-spa-router";

    import { driverMap } from "./stores.js";
    import { onMount } from "svelte";

    export let number;
    let name = "";
    export let at;
    onMount(async () => {
        log.debug(`CarAndDriver onMount: ${number} `);
        name = getDriverName(number, at);
    });
    $: {
        log.debug("lookup modified DN:", number);
        name = getDriverName(number, at);
    }

    function getSponsor (number)  {
        if (number && $driverMap[number]) {
            return $driverMap[number].spon;
        } else {
            return " ";
        }
    }
    const getDriverName = (number) => {
        //log.debug("gdn: "+carNumber)
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return " ";
        }
    };
    function showDriver(){

        push(`/driverAdd/${number}`)
    }
</script>

<div style="text-align: center !important; display: inline">
    <b style="font-size: 31px">{number}</b>
    <br />
    <span class="noselect" on:click={showDriver}>
    {name}
    </span>
    {#if getSponsor(number)}
        <br />
        <b>{getSponsor(number)}</b>
    {/if}
</div>
