<script>
    import { createEventDispatcher, onMount } from "svelte";
    import { faEye } from "@fortawesome/free-solid-svg-icons/faEye";
    import { faEyeSlash } from "@fortawesome/free-solid-svg-icons/faEyeSlash";
    import {
        applySvgColumnVisibility,
        buildSvgChartLayout,
        layoutSvgPlacements,
        svgEdgePath,
        svgSlotTextLayout,
    } from "./ChartSvgLayout.js";
    import {
        getBracketSummaryClass,
        getInitialHiddenColumnIds,
    } from "../ChartStatus.js";
    import { doRefreshBlocks } from "../../stores.js";
    import { augmentChartState } from "../../utils.js";
    import SvgBracketSlot from "./SvgBracketSlot.svelte";

    export let chartJson = { progress: {} };
    export let chartId = "";

    const dispatch = createEventDispatcher();
    const ZOOM_LEVELS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8];
    let zoomIndex = 0;
    let chartViewport;
    let fittedWidth;
    let hiddenColumnIds = new Set();
    let visibilityChartId = chartId;
    let mounted = false;
    let statusLoadVersion = 0;
    let columnStatuses = {};
    let placementStates = {};
    let visibilityInitializedFor = "";
    $: zoom = ZOOM_LEVELS[zoomIndex];
    $: baseLayout = buildSvgChartLayout(
        chartJson.progress,
        chartJson.imgPositions,
        chartJson.imgSize
    );
    $: compactLayout = applySvgColumnVisibility(baseLayout, hiddenColumnIds);
    $: placementLabels = Object.fromEntries(
        Object.values(baseLayout.placements).map((placement) => [
            placement.id,
            placementLabel(placement, placementStates[placement.id] || {}),
        ])
    );
    $: layout = layoutSvgPlacements(compactLayout, placementLabels);
    $: heatAreaBottom = Math.max(
        34,
        ...Object.values(layout.heats).map((heat) => heat.y + heat.height)
    );
    $: svgWidth = fittedWidth ? `${fittedWidth * zoom}px` : "100%";
    $: if (chartId !== visibilityChartId) {
        visibilityChartId = chartId;
        hiddenColumnIds = new Set();
        columnStatuses = {};
        visibilityInitializedFor = "";
        placementStates = {};
    }
    $: if (mounted) {
        $doRefreshBlocks;
        refreshColumnStatuses(chartJson, chartId, baseLayout);
    }

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

    function slotLayout(heat, state) {
        return svgSlotTextLayout(slotLabel(state), heat.width);
    }

    function driverNameX(heat, slot, state) {
        return (
            slotX(heat, slot) +
            slotLayout(heat, state).carNumber.length * 22 * 0.56 +
            6
        );
    }

    function slotX(heat, slot) {
        return layout.slots?.[`${heat.id}${slot}`]
            ? layout.slots[`${heat.id}${slot}`].x - heat.x
            : 8;
    }

    function slotY(heat, slot) {
        return layout.slots?.[`${heat.id}${slot}`]
            ? layout.slots[`${heat.id}${slot}`].y - heat.y
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

    function choosePlacement(position) {
        dispatch("slotclick", {
            heatId: position,
            slot: position,
            clickedOn: position,
        });
    }

    function handleSlotKeydown(event, heatId, slot) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            chooseSlot(heatId, slot);
        }
    }

    function handlePlacementKeydown(event, position) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            choosePlacement(position);
        }
    }

    function placementLabel(placement, state) {
        const place = placement.id.replace(/^(Place)(\d+)$/i, "$1 $2");
        const participant = slotLabel(state);
        return participant ? `${place} - ${participant}` : place;
    }

    function placementTextLayout(placement, state) {
        return svgSlotTextLayout(
            placementLabel(placement, state),
            placement.width
        );
    }

    function updatePlacementState(position, state) {
        placementStates = { ...placementStates, [position]: state };
    }

    function setZoomIndex(value) {
        zoomIndex = Math.min(
            ZOOM_LEVELS.length - 1,
            Math.max(0, Number(value))
        );
    }

    function setColumnHidden(columnId, hidden) {
        const next = new Set(hiddenColumnIds);
        if (hidden) next.add(columnId);
        else next.delete(columnId);
        hiddenColumnIds = next;
    }

    async function refreshColumnStatuses(
        nextChartJson,
        nextChartId,
        nextLayout
    ) {
        const version = ++statusLoadVersion;
        const recapByColumn = {};
        const heatStates = {};

        await Promise.all(
            Object.values(nextLayout.heats).flatMap((heat) =>
                ["A", "B"].map(async (slot) => {
                    const state = await augmentChartState(
                        nextChartJson,
                        nextChartId,
                        heat.id,
                        slot
                    );
                    recapByColumn[heat.columnId] ||= {};
                    recapByColumn[heat.columnId][state.bracketClass] = true;
                    heatStates[heat.id] ||= [];
                    heatStates[heat.id].push(state);
                })
            )
        );
        if (version !== statusLoadVersion) return;

        columnStatuses = Object.fromEntries(
            nextLayout.columns.map((column) => [
                column.id,
                getBracketSummaryClass(recapByColumn[column.id]),
            ])
        );
        if (visibilityInitializedFor !== nextChartId) {
            hiddenColumnIds = new Set(
                getInitialHiddenColumnIds(nextLayout, heatStates)
            );
            visibilityInitializedFor = nextChartId;
        }
    }

    onMount(() => {
        mounted = true;
        let fittedDevicePixelRatio = window.devicePixelRatio;

        function fitToViewport() {
            fittedWidth = chartViewport.clientWidth;
        }

        function handleResize() {
            if (window.devicePixelRatio === fittedDevicePixelRatio) {
                fitToViewport();
            }
        }

        fitToViewport();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    });
</script>

<div class="zoom-controls" aria-label="Chart zoom controls">
    <button
        type="button"
        title="Zoom out"
        aria-label="Zoom out"
        disabled={zoomIndex === 0}
        on:click={() => setZoomIndex(zoomIndex - 1)}>−</button
    >
    <input
        type="range"
        min="0"
        max={ZOOM_LEVELS.length - 1}
        step="1"
        value={zoomIndex}
        aria-label="Chart zoom"
        on:input={(event) => setZoomIndex(event.currentTarget.value)}
    />
    <button
        type="button"
        title="Zoom in"
        aria-label="Zoom in"
        disabled={zoomIndex === ZOOM_LEVELS.length - 1}
        on:click={() => setZoomIndex(zoomIndex + 1)}>+</button
    >
    <button
        type="button"
        class="zoom-value"
        title="Fit chart to width"
        aria-label="Fit chart to width"
        disabled={zoomIndex === 0}
        on:click={() => setZoomIndex(0)}>{Math.round(zoom * 100)}%</button
    >
</div>

<div
    class="svg-bracket"
    aria-label="SVG bracket prototype"
    bind:this={chartViewport}
>
    <svg
        viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height}`}
        style={`width: ${svgWidth}`}
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
        <g class="column-controls" aria-label="Chart columns">
            {#each layout.columns as column}
                {#if column.hidden}
                    <line
                        class="hidden-column-placeholder"
                        x1={column.x + column.width / 2}
                        y1="34"
                        x2={column.x + column.width / 2}
                        y2={heatAreaBottom}
                    />
                {/if}
                <g
                    class={`column-control ${columnStatuses[column.id] || ""}`}
                    role="button"
                    tabindex="0"
                    aria-label={`${column.hidden ? "Show" : "Hide"} ${column.label}`}
                    transform={`translate(${column.x + column.width / 2 - 14} 6)`}
                    on:click={() => setColumnHidden(column.id, !column.hidden)}
                    on:keydown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setColumnHidden(column.id, !column.hidden);
                        }
                    }}
                >
                    <title
                        >{column.hidden ? "Show" : "Hide"} {column.label}</title
                    >
                    <rect width="28" height="24" rx="4" />
                    <path
                        d={(column.hidden ? faEye : faEyeSlash).icon[4]}
                        transform="translate(6 7) scale(0.03125)"
                    />
                </g>
            {/each}
        </g>
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
                                >Heat {heat.id}{heat.annotation
                                    ? ` (${heat.annotation})`
                                    : ""}</text
                            >
                            <text
                                class={`slot ${state.bracketClass || ""}`}
                                x={slotX(heat, "A")}
                                y={slotY(heat, "A")}
                                style={`font-size: ${slotLayout(heat, state).labelFontSize}px`}
                            >
                                {#if slotLayout(heat, state).carNumber}
                                    <tspan
                                        >{slotLayout(heat, state)
                                            .carNumber}</tspan
                                    >
                                    {#if slotLayout(heat, state).driverName}
                                        <tspan
                                            x={driverNameX(heat, "A", state)}
                                            style={`font-size: ${slotLayout(heat, state).driverFontSize}px`}
                                            >{slotLayout(heat, state)
                                                .driverName}</tspan
                                        >
                                    {/if}
                                {:else}
                                    {slotLayout(heat, state).label}
                                {/if}
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
                                style={`font-size: ${slotLayout(heat, state).labelFontSize}px`}
                            >
                                {#if slotLayout(heat, state).carNumber}
                                    <tspan
                                        >{slotLayout(heat, state)
                                            .carNumber}</tspan
                                    >
                                    {#if slotLayout(heat, state).driverName}
                                        <tspan
                                            x={driverNameX(heat, "B", state)}
                                            style={`font-size: ${slotLayout(heat, state).driverFontSize}px`}
                                            >{slotLayout(heat, state)
                                                .driverName}</tspan
                                        >
                                    {/if}
                                {:else}
                                    {slotLayout(heat, state).label}
                                {/if}
                            </text>
                        </g>
                    </SvgBracketSlot>
                </g>
            </g>
        {/each}

        {#each Object.values(layout.placements) as placement}
            <g
                class="placement"
                role="button"
                tabindex="0"
                on:click={() => choosePlacement(placement.id)}
                on:keydown={(event) =>
                    handlePlacementKeydown(event, placement.id)}
                transform={`translate(${placement.x} ${placement.y})`}
            >
                <SvgBracketSlot
                    chartJson={chartJson}
                    chartId={chartId}
                    position={placement.id}
                    on:statechange={(event) =>
                        updatePlacementState(placement.id, event.detail)}
                    let:state
                >
                    <g
                        aria-label={`${placementLabel(placement, state)} placement`}
                    >
                        <rect
                            width={placement.width}
                            height={placement.height}
                        />
                        <text
                            class={`slot ${state.bracketClass || ""}`}
                            x="8"
                            y="30"
                            style={`font-size: ${placementTextLayout(placement, state).labelFontSize}px`}
                            >{placementTextLayout(placement, state).label}</text
                        >
                    </g>
                </SvgBracketSlot>
            </g>
        {/each}
    </svg>
</div>

<style>
    .zoom-controls {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 6px;
        margin: 0 0 6px;
    }

    .zoom-controls button {
        min-width: 32px;
        height: 32px;
        padding: 0 8px;
        border: 1px solid #77909a;
        border-radius: 4px;
        background: #fff;
        color: #172126;
        font-weight: 700;
        cursor: pointer;
    }

    .zoom-controls button:disabled {
        color: #7b8589;
        cursor: default;
    }

    .zoom-controls input {
        width: 120px;
    }

    .zoom-controls .zoom-value {
        min-width: 58px;
    }

    .svg-bracket {
        max-width: 100%;
        overflow: auto;
        border: 1px solid #c7ced1;
        background: #fff;
    }

    svg {
        display: block;
        height: auto;
        max-width: none;
    }

    .connections path {
        fill: none;
        stroke-width: 2.5;
    }

    .column-control {
        cursor: pointer;
    }

    .column-control rect {
        fill: #fff;
        stroke: #77909a;
        stroke-width: 1;
    }

    .column-control path {
        fill: #31515d;
    }

    .column-control.ready path {
        fill: green;
    }

    .column-control.ready rect {
        stroke: green;
        stroke-width: 2;
    }

    .column-control.pendingSeed path {
        fill: red;
    }

    .column-control.pendingSeed rect {
        stroke: red;
        stroke-width: 2;
    }

    .column-control.complete path {
        fill: gray;
    }

    .column-control.complete rect {
        stroke: gray;
        stroke-width: 2;
    }

    .column-control.phaseOneComplete path {
        fill: yellow;
    }

    .column-control.phaseOneComplete rect {
        stroke: yellow;
        stroke-width: 2;
    }

    .column-control:focus {
        outline: none;
    }

    .column-control:focus rect,
    .column-control:hover rect {
        fill: #e2f1f6;
    }

    .hidden-column-placeholder {
        stroke: #77909a;
        stroke-width: 2;
        stroke-dasharray: 5 5;
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
    .heat > rect {
        fill: #f8fbfc;
        stroke: #31515d;
        stroke-width: 5;
    }
    .placement rect {
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
    .heat:has(.slot.complete) > rect {
        stroke: gray;
    }
    .heat:has(.slot.phaseOneComplete) > rect {
        stroke: yellow;
    }
    .heat:has(.slot.ready) > rect {
        stroke: green;
    }
    .heat:has(.slot.pendingSeed) > rect {
        stroke: red;
    }
</style>
