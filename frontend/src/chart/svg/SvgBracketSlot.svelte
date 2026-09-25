<script>
    import { onMount } from "svelte";
    import { doRefreshBlocks } from "../../stores.js";
    import { augmentChartState } from "../../utils.js";

    export let chartJson;
    export let chartId;
    export let heatId;
    export let slot;

    let state = {};
    let mounted = false;
    let loadVersion = 0;

    async function refreshDataFromDb(
        nextChartJson,
        nextChartId,
        nextHeatId,
        nextSlot
    ) {
        const version = ++loadVersion;
        const nextState = await augmentChartState(
            nextChartJson,
            nextChartId,
            nextHeatId,
            nextSlot
        );
        if (version === loadVersion) state = nextState;
    }

    onMount(() => {
        mounted = true;
    });

    $: if (mounted) {
        $doRefreshBlocks;
        refreshDataFromDb(chartJson, chartId, heatId, slot);
    }
</script>

<slot state={state} />
