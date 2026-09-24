<script>
    import { onMount } from "svelte";
    import { push } from "svelte-spa-router";
    import { db } from "./eventDb.js";
    import BracketSvg from "./BracketSvg.svelte";
    import ChartViewToggle from "./ChartViewToggle.svelte";
    import { getChartJson, augmentChartState } from "./utils.js";
    import { doRefreshBlocks, driverMap, spinnerPanelBusy } from "./stores.js";

    export let params = {};

    let bracketMeta = {};
    let chartJson;
    let slotStates = {};
    let loadError = "";
    let slotRefreshKey = "";
    let slotLoadVersion = 0;

    async function refreshSlotStates() {
        if (!chartJson) return;

        const loadVersion = ++slotLoadVersion;
        const entries = await Promise.all(
            Object.keys(chartJson.progress).flatMap((heatId) =>
                ["A", "B"].map(async (slot) => [
                    `${heatId}${slot}`,
                    await augmentChartState(
                        chartJson,
                        params.chartId,
                        heatId,
                        slot
                    ),
                ])
            )
        );
        if (loadVersion === slotLoadVersion) {
            slotStates = Object.fromEntries(entries);
        }
    }

    $: {
        const refreshKey = chartJson
            ? `${$doRefreshBlocks}:${Object.keys($driverMap).length}`
            : "";
        if (refreshKey && refreshKey !== slotRefreshKey) {
            slotRefreshKey = refreshKey;
            refreshSlotStates();
        }
    }

    onMount(async () => {
        $spinnerPanelBusy = true;
        try {
            const metadata = await db.BracketMetaData.get(params.chartId);
            if (!metadata) {
                loadError = "Chart metadata was not found.";
                return;
            }
            bracketMeta = metadata;

            chartJson = await getChartJson(bracketMeta);
            if (!chartJson) {
                loadError = "Chart progression data was not found.";
                return;
            }
        } catch (error) {
            loadError = "Unable to load this chart.";
        } finally {
            $spinnerPanelBusy = false;
        }
    });

    function openChartPosition(event) {
        const { heatId, slot } = event.detail;
        push(
            `/ChartPosition/${params.chartId}/${heatId}?clickedOn=${heatId}${slot}`
        );
    }
</script>

<h3>
    <ChartViewToggle chartId={params.chartId} activeView="svg">
        SVG Chart Prototype
    </ChartViewToggle>
</h3>
{#if bracketMeta.bracketName}
    <p>{bracketMeta.bracketName}</p>
{/if}

{#if loadError}
    <p>{loadError}</p>
{:else if chartJson}
    <BracketSvg
        chartJson={chartJson}
        slotStates={slotStates}
        on:slotclick={openChartPosition}
    />
{:else}
    <p>Loading chart...</p>
{/if}
