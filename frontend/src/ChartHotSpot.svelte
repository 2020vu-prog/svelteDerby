<script>
    import "#src/Charts.css";
    import log from "loglevel";

    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "#src/eventDb.js";
    import { parseHeatPos, augmentChartState } from "#src/utils.js";
    import { doRefreshBlocks, driverMap } from "#src/stores.js";
    import { pannable } from "#src/pannable.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let left;
    export let top;
    export let scale;
    export let pos;
    export let chartId;
    export let isPannable;
    export let chartJson;
    // Called with { top, left } when a drag of the hot spot ends.
    export let onHotMove = () => {};

    let scaledTop;
    let scaledLeft;
    let scaledWidth;
    let scaledHeight;
    var bracketClass = "unknown";
    $: {
        log.debug("hotspot:", left, top, scale, pos, chartId);
        recalc();
    }
    $: {
        refreshDataFromDb($doRefreshBlocks);
    }
    const recalc = () => {
        scaledTop = top * scale;
        scaledLeft = left * scale;
        scaledWidth = 175 * scale;
        scaledHeight = 30 * scale;
    };
    const gotoChartPos = () => {
        push(`/ChartPosition/${chartId}/${heatPos}?clickedOn=${pos}`);
    };
    var heatPos, heatLetter;
    onMount(async () => {
        [heatPos, heatLetter] = parseHeatPos(pos);
        refreshDataFromDb();
    });
    var bpFromDexie = {};
    var rsFromDexie = {};
    var posHtml = "";
    const refreshDataFromDb = async (trigger) => {
        const rc = await augmentChartState(
            chartJson,
            chartId,
            heatPos,
            heatLetter
        );

        //log.debug('acs:',JSON.stringify(rc))
        bracketClass = rc.bracketClass;
        posHtml = rc.posHtml;
    };

    function handlePanStart() {
        log.debug("chs panStart  ");
    }
    function handlePanMove(event) {
        log.debug(
            "chs panMove x: " + event.detail.dx + " y:" + event.detail.dy
        );
        left = parseInt(event.detail.dx, 10) + parseInt(left, 10);
        top = parseInt(event.detail.dy, 10) + parseInt(top, 10);
    }
    function handlePanEnd(event) {
        log.debug("chs panEnd : " + event);
        onHotMove({
            top: top,
            left: left,
        });
        log.debug("chs panMoved.");
    }
</script>

{#if isPannable}
    <div
        class="overlay {bracketClass}"
        id="myDIV"
        use:pannable
        on:panstart={handlePanStart}
        on:panmove={handlePanMove}
        on:panend={handlePanEnd}
        style="position: absolute;width: {scaledWidth}px;height: {scaledHeight}px;z-index:
        2;left: {scaledLeft}px;top: {scaledTop}px;"
    >
        {pos}
        {posHtml}
    </div>
{:else}
    <div
        class="overlay {bracketClass}"
        id={pos}
        on:click={() => gotoChartPos()}
        style="position: absolute;width: {scaledWidth}px;height: {scaledHeight}px;z-index:
        2;left: {scaledLeft}px;top: {scaledTop}px;"
    >
        {pos}
        {posHtml}
    </div>
{/if}
