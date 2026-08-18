<script>
    import log from "loglevel";

    import { driverMap, userEmail } from "./stores.js";
    import { isEmailAllowedRoutePath } from "./utils.js";
    import { push, replace } from "svelte-spa-router";
    import { onMount } from "svelte";

    export let isWinner;
    export let phaseLetter;
    export let timerLink;
    export let number;
    export let phaseClass = "btn-warning";
    let name = "";
    export let at;
    onMount(async () => {
        log.debug(
            `CarAndDriver onMount: ${number} winner ${isWinner} pl ${phaseLetter} `
        );
        name = getDriverName(number, at);
    });
    $: {
        log.debug("lookup modified DN:", number);
        name = getDriverName(number, at);
    }

    function isManualTimerAllowed() {
        return isEmailAllowedRoutePath($userEmail, "/ManualTimerAdd");
    }

    //log.debug("timerLink",timerLink);
    const gotoTimer = () => {
        log.debug("routing to:", timerLink);
        //push("/drivers")

        // push("/ManualTimerAdd/1583608357232")
        if (timerLink) {
            push(timerLink);
        }
    };
    function getSponsor(number) {
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
</script>

{#if isWinner}
    <img alt="flag" src="data/checkered-flag-svgrepo-com.svg" width="25px" />
{:else if phaseLetter}
    <button
        type="button"
        class="btn {phaseClass} phase-icon-btn"
        on:click={() => {
            if (isManualTimerAllowed()) gotoTimer();
        }}
    >
        {phaseLetter}
    </button>
{:else}
    <img
        alt="noflag"
        src="data/checkered-flag-svgrepo-com.svg"
        width="25px"
        style="visibility:hidden"
    />
{/if}
<div style="vertical-align: middle; display: inline">
    <b class="bigText">{number}</b>
    {name}
    {#if getSponsor(number)}
        <br />
        <b>{getSponsor(number)}</b>
    {/if}
</div>
