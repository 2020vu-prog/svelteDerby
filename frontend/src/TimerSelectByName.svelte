<script>
    import log from "loglevel";

    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { createEventDispatcher } from "svelte";
    import { getTimerPbConfig  } from "./utils.js";
    let tcList = [];
    let selectedTc = "";
    export let preSelect = "";
    const dispatch = createEventDispatcher();

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
        dispatch("select", {
            text: selectedTc,
            SK: selectedTc,
            decoded: timerPbConfig,
        });
    }
</script>
<select bind:value={selectedTc} on:change={doDispatch}>
    {#each tcList as tc}
        <option>{tc.SK}</option>
    {/each}
</select>
