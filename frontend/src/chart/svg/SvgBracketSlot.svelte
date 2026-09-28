<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { doRefreshBlocks } from "../../stores.js";
    import { augmentChartState, parseHeatPos } from "../../utils.js";

    export let chartJson;
    export let chartId;
    export let heatId = "";
    export let slot = "";
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
    }

    onMount(() => {
        mounted = true;
    });

    $: [resolvedHeatId, resolvedSlot] = position
        ? parseHeatPos(position)
        : [heatId, slot];

    $: if (mounted) {
        $doRefreshBlocks;
        refreshDataFromDb(chartJson, chartId, resolvedHeatId, resolvedSlot);
    }
</script>

<slot state={state} />
