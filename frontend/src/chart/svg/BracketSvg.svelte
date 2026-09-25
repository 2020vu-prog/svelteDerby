<script>
    import { createEventDispatcher } from "svelte";
    import { buildSvgChartLayout, svgEdgePath } from "./ChartSvgLayout.js";
    import SvgBracketSlot from "./SvgBracketSlot.svelte";

    export let chartJson = { progress: {} };
    export let chartId = "";

    const dispatch = createEventDispatcher();
    $: layout = buildSvgChartLayout(
        chartJson.progress,
        chartJson.imgPositions,
        chartJson.imgSize
    );

    function slotText(state) {
        const value = state.posHtml || "";
        if (typeof document === "undefined")
            return value.replace(/<[^>]*>/g, "");

        const element = document.createElement("div");
        element.innerHTML = value;
        return element.textContent || "";
    }

    function slotLabel(state) {
        return slotText(state).replace(/^\s*-\s*/, "");
    }

    function slotAriaLabel(heatId, slot, state) {
        const label = slotLabel(state);
        return `Heat ${heatId}, position ${slot}${label ? `, ${label}` : ""}`;
    }

    function slotX(heat, slot) {
        return layout.slots?.[`${heat.id}${slot}`]
            ? layout.slots[`${heat.id}${slot}`].x - heat.x
            : 8;
    }

    function slotY(heat, slot) {
        return layout.slots?.[`${heat.id}${slot}`]
            ? layout.slots[`${heat.id}${slot}`].y - heat.y + 14
            : slot === "A"
              ? 31
              : 51;
    }

    function slotHitboxY(heat, slot) {
        return slotY(heat, slot) - 18;
    }

    function chooseSlot(heatId, slot) {
        dispatch("slotclick", { heatId, slot });
    }

    function handleSlotKeydown(event, heatId, slot) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseSlot(heatId, slot);
        }
    }
</script>

<div class="svg-bracket" aria-label="SVG bracket prototype">
    <svg
        viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
        role="group"
        aria-label="SVG bracket prototype"
    >
        <defs>
            <marker
                id="winner-arrow"
                viewBox="0 0 8 8"
                refX="7"
                refY="4"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
            >
                <path d="M 0 0 L 8 4 L 0 8 z" class="winner-arrow" />
            </marker>
        </defs>
        <g class="connections">
            {#each layout.edges.filter((edge) => edge.toHeat && edge.result === "winner") as edge}
                <path
                    d={svgEdgePath(edge, layout)}
                    marker-end="url(#winner-arrow)"
                />
            {/each}
        </g>

        {#each Object.values(layout.heats) as heat}
            <g class="heat" transform={`translate(${heat.x} ${heat.y})`}>
                <rect width={heat.width} height={heat.height} />
                {#if !layout.positioned}
                    <line
                        x1="0"
                        y1={heat.height / 2}
                        x2={heat.width}
                        y2={heat.height / 2}
                    />
                {/if}
                <g
                    class="slot-target"
                    role="button"
                    tabindex="0"
                    on:click={() => chooseSlot(heat.id, "A")}
                    on:keydown={(event) =>
                        handleSlotKeydown(event, heat.id, "A")}
                >
                    <SvgBracketSlot
                        chartJson={chartJson}
                        chartId={chartId}
                        heatId={heat.id}
                        slot="A"
                        let:state
                    >
                        <g aria-label={slotAriaLabel(heat.id, "A", state)}>
                            <rect
                                class="slot-hitbox"
                                x={layout.positioned ? slotX(heat, "A") - 4 : 0}
                                y={layout.positioned
                                    ? slotHitboxY(heat, "A")
                                    : 0}
                                width={heat.width}
                                height={layout.positioned
                                    ? 24
                                    : heat.height / 2}
                            />
                            <text class="heat-number" x="8" y="15"
                                >Heat {heat.id}{heat.isOptional
                                    ? " (If Required)"
                                    : ""}</text
                            >
                            <text
                                class={`slot ${state.bracketClass || ""}`}
                                x={slotX(heat, "A")}
                                y={slotY(heat, "A")}
                            >
                                {slotLabel(state)}
                            </text>
                        </g>
                    </SvgBracketSlot>
                </g>
                <g
                    class="slot-target"
                    role="button"
                    tabindex="0"
                    on:click={() => chooseSlot(heat.id, "B")}
                    on:keydown={(event) =>
                        handleSlotKeydown(event, heat.id, "B")}
                >
                    <SvgBracketSlot
                        chartJson={chartJson}
                        chartId={chartId}
                        heatId={heat.id}
                        slot="B"
                        let:state
                    >
                        <g aria-label={slotAriaLabel(heat.id, "B", state)}>
                            <rect
                                class="slot-hitbox"
                                x={layout.positioned ? slotX(heat, "B") - 4 : 0}
                                y={layout.positioned
                                    ? slotHitboxY(heat, "B")
                                    : heat.height / 2}
                                width={heat.width}
                                height={layout.positioned
                                    ? 24
                                    : heat.height / 2}
                            />
                            <text
                                class={`slot ${state.bracketClass || ""}`}
                                x={slotX(heat, "B")}
                                y={slotY(heat, "B")}
                            >
                                {slotLabel(state)}
                            </text>
                        </g>
                    </SvgBracketSlot>
                </g>
            </g>
        {/each}

        {#each Object.values(layout.placements) as placement}
            <g
                class="placement"
                transform={`translate(${placement.x} ${placement.y})`}
            >
                <rect width={placement.width} height={placement.height} />
                <text x="8" y="34">{placement.id}</text>
            </g>
        {/each}
    </svg>
</div>

<style>
    .svg-bracket {
        max-width: 100%;
        overflow: auto;
        border: 1px solid #c7ced1;
        background: #fff;
    }

    svg {
        display: block;
        width: 100%;
        height: auto;
    }

    .connections path {
        fill: none;
        stroke-width: 2.5;
    }

    .connections path {
        stroke: #007782;
    }
    .winner-arrow {
        fill: #007782;
    }

    .slot-target {
        cursor: pointer;
    }
    .slot-target:focus {
        outline: none;
    }
    .slot-target:focus .slot-hitbox {
        fill: #e2f1f6;
    }
    .heat > rect,
    .placement > rect {
        fill: #f8fbfc;
        stroke: #31515d;
        stroke-width: 2;
    }
    .slot-hitbox {
        fill: transparent;
        stroke: none;
    }
    .heat line {
        stroke: #77909a;
        stroke-width: 1.5;
    }
    text {
        fill: #172126;
        font-family: Arial, sans-serif;
        font-size: 22px;
        paint-order: stroke;
        stroke: #f8fbfc;
        stroke-width: 3px;
        stroke-linejoin: round;
    }
    .heat-number {
        font-size: 14px;
        font-weight: 700;
    }
    .slot.ready {
        fill: #0b6b31;
    }
    .slot.complete {
        fill: #5b6468;
    }
    .slot.pendingSeed {
        fill: #b3261e;
    }
    .slot.phaseOneComplete {
        fill: #806000;
    }
</style>
