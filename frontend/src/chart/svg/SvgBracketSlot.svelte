<script>
    import { onMount } from "svelte";
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
    export let onStateLoadStart = () => {};
    export let onStateLoadEnd = () => {};
    // Called with the freshly loaded slot state.
    export let onStateChange = () => {};

    async function refreshDataFromDb(
        nextChartJson,
        nextChartId,
        nextHeatId,
        nextSlot
    ) {
        const version = ++loadVersion;
        onStateLoadStart();
        try {
            const nextState = await augmentChartState(
                nextChartJson,
                nextChartId,
                nextHeatId,
                nextSlot
            );
            if (version === loadVersion) {
                state = nextState;
                onStateChange(nextState);
            }
        } finally {
            onStateLoadEnd();
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
