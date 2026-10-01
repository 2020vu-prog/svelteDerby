<script>
    import { createEventDispatcher, onMount, tick } from "svelte";
    import { faEye } from "@fortawesome/free-solid-svg-icons/faEye";
    import { faEyeSlash } from "@fortawesome/free-solid-svg-icons/faEyeSlash";
    import { faCog } from "@fortawesome/free-solid-svg-icons/faCog";
    import { faArrowLeft } from "@fortawesome/free-solid-svg-icons/faArrowLeft";
    import { faArrowRight } from "@fortawesome/free-solid-svg-icons/faArrowRight";
    import { faFlagCheckered } from "@fortawesome/free-solid-svg-icons/faFlagCheckered";
    import {
        applySvgColumnVisibility,
        buildSvgChartLayout,
        layoutSvgPlacements,
        svgEdgePath,
        svgHeatTitleLayout,
        svgChampionshipColumnId,
        svgColumnGuide,
        svgSlotTextLayout,
    } from "./ChartSvgLayout.js";
    import {
        getBracketSummaryClass,
        getInitialHiddenColumnIds,
    } from "../ChartStatus.js";
    import { doRefreshBlocks } from "../../stores.js";
    import { augmentChartState } from "../../utils.js";
    import SvgBracketSlot from "./SvgBracketSlot.svelte";
    import { chartHeaderLayout } from "./chartHeader.js";
    import { printSvgElement } from "./printSvg.js";

    export let chartJson = { progress: {} };
    export let chartId = "";
    // Chart image path ("AASBD/..." or "NDR/..."); picks the header logo.
    export let imgPath = "";
    export let chartName = "";
    export let eventName = "";

    const dispatch = createEventDispatcher();
    const ZOOM_LEVELS = [1, 1.25, 1.5, 1.75, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8];
    let zoomIndex = 0;
    let svgElement;
    let settingsElement;
    let settingsOpen = false;
    let showHeader = false;
    let showAll = false;
    // Columns hidden by the default view; restored when Show all columns is turned off.
    let defaultHiddenColumnIds = new Set();
    let showDriverNames = true;
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
    $: championshipColumnId = svgChampionshipColumnId(baseLayout);
    $: compactLayout = applySvgColumnVisibility(baseLayout, hiddenColumnIds);
    $: placementLabels = Object.fromEntries(
        Object.values(baseLayout.placements).map((placement) => [
            placement.id,
            placementLabel(placement, placementStates[placement.id] || {}),
        ])
    );
    $: layout = layoutSvgPlacements(compactLayout, placementLabels);
    // Hidden columns only: a flag for the championship column, else an arrow
    // toward it.
    $: columnGuides = Object.fromEntries(
        layout.columns.map((column) => [
            column.id,
            column.hidden
                ? svgColumnGuide(
                      layout.columns,
                      championshipColumnId,
                      column.id
                  )
                : undefined,
        ])
    );
    $: heatAreaBottom = Math.max(
        34,
        ...Object.values(layout.heats).map((heat) => heat.y + heat.height)
    );
    $: header = chartHeaderLayout({
        eventName,
        chartName,
        imgPath,
        viewWidth: layout.viewBox.width,
    });
    $: headerHeight = header.height;
    $: headerOffset = showHeader ? headerHeight : 0;
    $: svgWidth = fittedWidth ? `${fittedWidth * zoom}px` : "100%";
    $: if (chartId !== visibilityChartId) {
        visibilityChartId = chartId;
        hiddenColumnIds = new Set();
        defaultHiddenColumnIds = new Set();
        showAll = false;
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

    function heatTitle(heat) {
        return svgHeatTitleLayout(heat.id, heat.annotation, heat.width);
    }

    const GUIDE_ICONS = {
        flag: { icon: faFlagCheckered, label: "Championship" },
        left: { icon: faArrowLeft, label: "Winners advance left" },
        right: { icon: faArrowRight, label: "Winners advance right" },
    };

    // Centers a 16px icon under the eye button (the button is 28 wide).
    function guideTransform(icon) {
        const [width, height] = icon;
        const scale = 16 / Math.max(width, height);
        return `translate(${(28 - width * scale) / 2} ${28 + (16 - height * scale) / 2}) scale(${scale})`;
    }

    function slotLayout(heat, state, withDriverNames = true) {
        const textLayout = svgSlotTextLayout(slotLabel(state), heat.width);
        return withDriverNames ? textLayout : { ...textLayout, driverName: "" };
    }

    function driverNameX(heat, slot, state) {
        return (
            slotX(heat, slot) +
            slotLayout(heat, state, showDriverNames).carNumber.length *
                22 *
                0.56 +
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

    function setShowAll(on) {
        showAll = on;
        hiddenColumnIds = on ? new Set() : new Set(defaultHiddenColumnIds);
    }

    function toggleShowAll() {
        setShowAll(!showAll);
        settingsOpen = false;
    }

    function toggleHeader() {
        showHeader = !showHeader;
        settingsOpen = false;
    }

    function toggleShowDriverNames() {
        showDriverNames = !showDriverNames;
        settingsOpen = false;
    }

    async function printChart() {
        settingsOpen = false;
        setShowAll(true);
        if (headerHeight) showHeader = true;
        await tick();
        if (svgElement) {
            printSvgElement(svgElement, {
                title: chartName || "Chart",
            });
        }
    }

    function handleWindowClick(event) {
        if (
            settingsOpen &&
            settingsElement &&
            !settingsElement.contains(event.target)
        ) {
            settingsOpen = false;
        }
    }

    function handleWindowKeydown(event) {
        if (event.key === "Escape") settingsOpen = false;
    }

    function setColumnHidden(columnId, hidden) {
        const next = new Set(hiddenColumnIds);
        if (hidden) {
            next.add(columnId);
            showAll = false;
        } else next.delete(columnId);
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
            defaultHiddenColumnIds = new Set(
                getInitialHiddenColumnIds(nextLayout, heatStates)
            );
            hiddenColumnIds = showAll
                ? new Set()
                : new Set(defaultHiddenColumnIds);
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
    <div class="settings" bind:this={settingsElement}>
        <button
            type="button"
            class="settings-button"
            title="Chart settings"
            aria-label="Chart settings"
            aria-haspopup="menu"
            aria-expanded={settingsOpen}
            on:click={() => (settingsOpen = !settingsOpen)}
        >
            <svg
                viewBox="0 0 512 512"
                width="16"
                height="16"
                aria-hidden="true"
            >
                <path d={faCog.icon[4]} fill="currentColor" />
            </svg>
        </button>
        {#if settingsOpen}
            <div class="settings-menu" role="menu" aria-label="Chart settings">
                <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={showAll}
                    on:click={toggleShowAll}
                >
                    <span class="check">{showAll ? "✓" : ""}</span>
                    <span class="label">Show all columns</span>
                </button>
                <button type="button" role="menuitem" on:click={printChart}>
                    <span class="label">Print</span>
                </button>
                <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={showHeader}
                    disabled={!headerHeight}
                    title={headerHeight ? "" : "No logo or chart name"}
                    on:click={toggleHeader}
                >
                    <span class="check">{showHeader ? "✓" : ""}</span>
                    <span class="label">Show header info</span>
                </button>
                <button
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={showDriverNames}
                    on:click={toggleShowDriverNames}
                >
                    <span class="check">{showDriverNames ? "✓" : ""}</span>
                    <span class="label">Show driver names</span>
                </button>
            </div>
        {/if}
    </div>
</div>

<svelte:window on:click={handleWindowClick} on:keydown={handleWindowKeydown} />

<div
    class="svg-bracket"
    aria-label="SVG bracket prototype"
    bind:this={chartViewport}
>
    <svg
        bind:this={svgElement}
        viewBox={`0 0 ${layout.viewBox.width} ${layout.viewBox.height + headerOffset}`}
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
        {#if headerOffset}
            {#if header.logo}
                <image
                    class="header-logo"
                    href={header.logo.src}
                    x={header.logo.x}
                    y={header.logo.y}
                    width={header.logo.width}
                    height={header.logo.height}
                    aria-label={header.logo.alt}
                />
            {/if}
            {#each [["header-event", header.eventTitle], ["header-title", header.chartTitle]] as [titleClass, title]}
                {#if title}
                    <text
                        class={titleClass}
                        x={title.x}
                        y={title.y}
                        text-anchor="middle"
                        dominant-baseline="central"
                        style={`font-size: ${title.fontSize}px`}
                        >{title.text}</text
                    >
                {/if}
            {/each}
        {/if}
        <g transform={`translate(0 ${headerOffset})`}>
            <g class="column-controls" aria-label="Chart columns">
                {#each layout.columns as column}
                    {#if column.hidden}
                        <line
                            class="hidden-column-placeholder"
                            x1={column.x + column.width / 2}
                            y1={columnGuides[column.id] ? 54 : 34}
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
                        on:click={() =>
                            setColumnHidden(column.id, !column.hidden)}
                        on:keydown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                setColumnHidden(column.id, !column.hidden);
                            }
                        }}
                    >
                        <title
                            >{column.hidden ? "Show" : "Hide"}
                            {column.label}{columnGuides[column.id]
                                ? ` (${GUIDE_ICONS[columnGuides[column.id]].label})`
                                : ""}</title
                        >
                        <rect width="28" height="24" rx="4" />
                        <path
                            d={(column.hidden ? faEye : faEyeSlash).icon[4]}
                            transform="translate(6 7) scale(0.03125)"
                        />
                        {#if columnGuides[column.id]}
                            {@const guide =
                                GUIDE_ICONS[columnGuides[column.id]]}
                            <path
                                class={`column-guide ${columnGuides[column.id]}`}
                                d={guide.icon.icon[4]}
                                transform={guideTransform(guide.icon.icon)}
                            />
                        {/if}
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
                                    x={layout.positioned
                                        ? slotX(heat, "A") - 4
                                        : 0}
                                    y={layout.positioned
                                        ? slotHitboxY(heat, "A")
                                        : 0}
                                    width={heat.width}
                                    height={layout.positioned
                                        ? 24
                                        : heat.height / 2}
                                />
                                <text
                                    class="heat-number"
                                    x="8"
                                    y="15"
                                    style={`font-size: ${heatTitle(heat).fontSize}px`}
                                    >{heatTitle(heat).text}</text
                                >
                                <text
                                    class={`slot ${state.bracketClass || ""}`}
                                    x={slotX(heat, "A")}
                                    y={slotY(heat, "A")}
                                    style={`font-size: ${slotLayout(heat, state, showDriverNames).labelFontSize}px`}
                                >
                                    {#if slotLayout(heat, state, showDriverNames).carNumber}
                                        <tspan
                                            >{slotLayout(
                                                heat,
                                                state,
                                                showDriverNames
                                            ).carNumber}</tspan
                                        >
                                        {#if slotLayout(heat, state, showDriverNames).driverName}
                                            <tspan
                                                x={driverNameX(
                                                    heat,
                                                    "A",
                                                    state
                                                )}
                                                style={`font-size: ${slotLayout(heat, state, showDriverNames).driverFontSize}px`}
                                                >{slotLayout(
                                                    heat,
                                                    state,
                                                    showDriverNames
                                                ).driverName}</tspan
                                            >
                                        {/if}
                                    {:else}
                                        {slotLayout(
                                            heat,
                                            state,
                                            showDriverNames
                                        ).label}
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
                                    x={layout.positioned
                                        ? slotX(heat, "B") - 4
                                        : 0}
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
                                    style={`font-size: ${slotLayout(heat, state, showDriverNames).labelFontSize}px`}
                                >
                                    {#if slotLayout(heat, state, showDriverNames).carNumber}
                                        <tspan
                                            >{slotLayout(
                                                heat,
                                                state,
                                                showDriverNames
                                            ).carNumber}</tspan
                                        >
                                        {#if slotLayout(heat, state, showDriverNames).driverName}
                                            <tspan
                                                x={driverNameX(
                                                    heat,
                                                    "B",
                                                    state
                                                )}
                                                style={`font-size: ${slotLayout(heat, state, showDriverNames).driverFontSize}px`}
                                                >{slotLayout(
                                                    heat,
                                                    state,
                                                    showDriverNames
                                                ).driverName}</tspan
                                            >
                                        {/if}
                                    {:else}
                                        {slotLayout(
                                            heat,
                                            state,
                                            showDriverNames
                                        ).label}
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
                                >{placementTextLayout(placement, state)
                                    .label}</text
                            >
                        </g>
                    </SvgBracketSlot>
                </g>
            {/each}
        </g>
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

    .zoom-controls .settings {
        position: relative;
    }

    .zoom-controls .settings-button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .settings-menu {
        position: absolute;
        top: 100%;
        right: 0;
        z-index: 10;
        display: flex;
        flex-direction: column;
        min-width: 190px;
        margin-top: 4px;
        padding: 4px 0;
        border: 1px solid #77909a;
        border-radius: 4px;
        background: #fff;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .zoom-controls .settings-menu button {
        height: auto;
        padding: 8px 12px;
        border: 0;
        border-radius: 0;
        text-align: left;
        font-weight: 400;
    }

    .zoom-controls .settings-menu button:hover:not(:disabled) {
        background: #e8eef0;
    }

    .header-event,
    .header-title {
        font-weight: 700;
        fill: #172126;
    }

    .settings-menu .check {
        display: inline-block;
        width: 1.25em;
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

    .column-control .column-guide {
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
