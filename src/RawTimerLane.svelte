<script>
    import log from "roarr";

    import { onMount } from "svelte";

    export let laneJson;
    export let lane;
    const laneCalc = JSON.parse(laneJson);
    onMount(async () => {
        log("rtl: mounted : ", laneJson);
        //laneCalc = JSON.parse(laneJson);
        log("rto: mounted : ", laneCalc);
    });
    function getCarLenMillis() {
        return laneCalc.carLenMS ? laneCalc.carLenMS : "None";
    }
    function getLaneError() {
        return laneCalc.error ? laneCalc.error : "";
    }
</script>

<style>
    .errorMessage {
        background: papayawhip;
        color: red;
        padding: 1rem;
    }
</style>

<p />
{lane} CarLength: {getCarLenMillis()}
{#if getLaneError()}
    <p class="errorMessage">Error: {getLaneError()}</p>
{/if}
