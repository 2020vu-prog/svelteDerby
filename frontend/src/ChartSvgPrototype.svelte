<script>
    import { onMount } from "svelte";
    import { push } from "svelte-spa-router";
    import { db } from "./eventDb.js";
    import BracketSvg from "./BracketSvg.svelte";
    import ChartViewToggle from "./ChartViewToggle.svelte";
    import { getChartJson } from "./utils.js";
    import { spinnerPanelBusy } from "./stores.js";

    export let params = {};

    let bracketMeta = {};
    let chartJson;
    let loadError = "";

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
        chartId={params.chartId}
        on:slotclick={openChartPosition}
    />
{:else}
    <p>Loading chart...</p>
{/if}
