<script>
    import "./Charts.css";
    import { push, pop, replace } from "svelte-spa-router";
    import { carFilter } from "./stores";
    export let heats = {};
    export let chartId = "";
    function getState(heat, letter) {
        return heats[heat][`${letter}state`];
    }
    const gotoChartPos = (heat, letter) => {
        push(`/ChartPosition/${chartId}/${heat}?clickedOn=${heat}${letter}`);
    };
    function isFilterMatch(heat) {
        console.log(heats[heat]);
        if (!$carFilter) {
            return true;
        }
        return (
            getState(heat, "A").filterMatches ||
            getState(heat, "B").filterMatches
        );
    }
</script>

{#each Object.keys(heats) as heat}
    {#if isFilterMatch(heat)}
        <div
            class="overlay {getState(heat, 'A').bracketClass}"
            on:click={() => {
                gotoChartPos(heat, "A");
            }}
        >
            {heat}A {getState(heat, "A").posHtml}
        </div>
        <div
            class="overlay {getState(heat, 'B').bracketClass}"
            on:click={() => {
                gotoChartPos(heat, "B");
            }}
        >
            {heat}B {getState(heat, "B").posHtml}
        </div>
        <hr />
    {/if}
{/each}
<!--

{JSON.stringify(heats)}
-->
