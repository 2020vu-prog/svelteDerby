<script>
    import log from "loglevel";

    import { onMount } from "svelte";
    import { db } from "#src/eventDb.js";
    import { getTimerPbConfig } from "#src/utils.js";
    let tcList = [];
    let selectedTc = "";
    export let preSelect = "";
    export let mode = "normal";
    // Called with { text, SK, decoded } for the chosen timer, including the
    // initial selection once the list has loaded.
    export let onSelect = () => {};

    onMount(async () => {
        selectedTc = preSelect;

        tcList = await db.TimerPbConfig.toArray();
        log.debug("TimerSelectByName: ", tcList);

        doDispatch(); // dispatch initial selection back to parent.
    });

    async function doDispatch() {
        log.debug("TimerSelectByName: dispatch:", selectedTc);
        // const tcRecord= await db.TimerPbConfig.get(selectedTc)
        var timerPbConfig = {};
        [timerPbConfig] = await getTimerPbConfig(selectedTc);
        log.debug("TimerSelectByName: record:", timerPbConfig);
        onSelect({
            text: selectedTc,
            SK: selectedTc,
            decoded: timerPbConfig,
        });
    }
</script>
<select
    bind:value={selectedTc}
    on:change={doDispatch}
    disabled={mode === "disabled"}
>
    {#each tcList as tc}
        <option>{tc.SK}</option>
    {/each}
</select>
