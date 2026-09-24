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

    async function refreshDataFromDb() {
        const version = ++loadVersion;
        const nextState = await augmentChartState(
            chartJson,
            chartId,
            heatId,
            slot
        );
        if (version === loadVersion) state = nextState;
    }

    onMount(async () => {
        mounted = true;
        await refreshDataFromDb();
    });

    $: if (mounted) refreshDataFromDb($doRefreshBlocks);
</script>

<slot {state} />
