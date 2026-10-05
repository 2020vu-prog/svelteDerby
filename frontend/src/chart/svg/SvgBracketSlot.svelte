<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { doRefreshBlocks } from "#src/stores.js";
    import { augmentChartState, parseHeatPos } from "#src/utils.js";

    export let chartJson;
    export let chartId;
    export let heatId = "";
    export let slotId = "";
    export let position = "";

    let state = {};
    let mounted = false;
    let loadVersion = 0;
    const dispatch = createEventDispatcher();

    async function refreshDataFromDb(
        nextChartJson,
        nextChartId,
        nextHeatId,
        nextSlot
    ) {
        const version = ++loadVersion;
        dispatch("stateloadstart");
        try {
            const nextState = await augmentChartState(
                nextChartJson,
                nextChartId,
                nextHeatId,
                nextSlot
            );
            if (version === loadVersion) {
                state = nextState;
                dispatch("statechange", nextState);
            }
        } finally {
            dispatch("stateloadend");
        }
    }

    onMount(() => {
        mounted = true;
    });

    $: [resolvedHeatId, resolvedSlot] = position
        ? parseHeatPos(position)
        : [heatId, slotId];

    $: if (mounted) {
        $doRefreshBlocks;
        refreshDataFromDb(chartJson, chartId, resolvedHeatId, resolvedSlot);
    }
</script>

<slot state={state} />
