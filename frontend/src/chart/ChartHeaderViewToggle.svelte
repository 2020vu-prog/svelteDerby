<script>
    import { replace } from "svelte-spa-router";
    import { developerMode } from "../stores.js";
    import { persistable } from "../storedb.js";

    export let chartId = "";
    export let title = "";

    const chartViewSelectionCounter = persistable(
        "pref:chartViewSelectionCounter",
        0
    );
    const standardViews = [
        { path: "/chartDetail" },
        { path: "/chartDetailCardList" },
    ];

    $: views = $developerMode
        ? [...standardViews, { path: "/chartSvgPrototype" }]
        : standardViews;

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
        const nextView = views[nextViewCounter() % views.length];
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
