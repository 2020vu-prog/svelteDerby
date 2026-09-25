<script>
    import { replace } from "svelte-spa-router";
    import { developerMode } from "../stores.js";

    export let chartId = "";
    export let activeView = "image";

    const standardViews = [
        { id: "image", label: "Image", path: "/chartDetail" },
        { id: "cards", label: "Cards", path: "/chartDetailCardList" },
    ];

    $: views = $developerMode
        ? [...standardViews, { id: "svg", path: "/chartSvgPrototype" }]
        : standardViews;

    function goToNextView() {
        const activeIndex = views.findIndex((view) => view.id === activeView);
        const nextView = views[(activeIndex + 1) % views.length];
        replace(`${nextView.path}/${chartId}`);
    }

    function handleKeydown(event) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            goToNextView();
        }
    }
</script>

<span
    class="chart-view-toggle"
    role="button"
    tabindex="0"
    aria-label="Switch chart view"
    on:click={goToNextView}
    on:keydown={handleKeydown}
>
    <slot />
</span>

<style>
    .chart-view-toggle {
        cursor: pointer;
    }
</style>
