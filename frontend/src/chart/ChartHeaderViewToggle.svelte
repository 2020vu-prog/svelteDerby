<script>
    import { replace } from "svelte-spa-router";
    import { developerMode } from "#src/stores.js";
    import { persistable } from "#src/storedb.js";
    import {
        CHART_VIEW_SELECTION_KEY,
        getSelectedChartView,
    } from "#src/chart/ChartViewSelection.js";

    export let chartId = "";
    export let title = "";

    const chartViewSelectionCounter = persistable(CHART_VIEW_SELECTION_KEY, 0);

    function nextViewCounter() {
        const counter =
            Number.isSafeInteger($chartViewSelectionCounter) &&
            $chartViewSelectionCounter >= 0
                ? $chartViewSelectionCounter
                : 0;
        $chartViewSelectionCounter = counter + 1;
        return $chartViewSelectionCounter;
    }

    function goToNextView() {
        nextViewCounter();
        const nextView = getSelectedChartView($developerMode);
        replace(`${nextView.path}/${chartId}`);
    }

    function handleKeydown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goToNextView();
        }
    }
</script>

<h3 class="chart-title">
    <span
        class="chart-view-toggle"
        role="button"
        tabindex="0"
        aria-label="Switch chart view"
        on:click={goToNextView}
        on:keydown={handleKeydown}
    >
        {title}
    </span>
</h3>

<style>
    .chart-title {
        text-align: center;
        z-index: 9;
    }
    .chart-view-toggle {
        cursor: pointer;
    }
</style>
