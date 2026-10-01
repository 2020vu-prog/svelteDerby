const HEAT_WIDTH = 228;
const HEAT_HEIGHT = 58;
const COLUMN_GAP = 104;
const ROW_GAP = 24;
const MARGIN = 36;
const POSITIONED_HEAT_WIDTH = 170;
const POSITIONED_HEAT_HEIGHT = 72;
const POSITIONED_COLUMN_GAP = 12;
const POSITIONED_ROW_GAP = 22;
const POSITIONED_COLUMN_TOLERANCE = 72;
const HIDDEN_COLUMN_WIDTH = 16;
const PLACEMENT_MIN_WIDTH = 300;
const PLACEMENT_HEIGHT = 44;

function compareHeatIds(left, right) {
    return (
        Number(left) - Number(right) ||
        String(left).localeCompare(String(right))
    );
}

function parseDestination(value) {
    if (typeof value !== "string") return [];

    return Array.from(value.matchAll(/(\d+)([A-Z])/gi), (match) => ({
        heat: String(Number(match[1])),
        slot: match[2].toUpperCase(),
    }));
}

function placementDestination(value) {
    if (typeof value !== "string") return undefined;

    const match = value.match(/^Place\s?(\d+)$/i);
    return match ? `Place${match[1]}` : undefined;
}

function isChampionshipResetDestination(value) {
    return typeof value === "string" && /^\(\s*[AB]WINS\?/i.test(value);
}

function numericPosition(position) {
    if (!position) return undefined;

    const x = Number(position.left);
    const y = Number(position.top);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

function buildPositionedLayout(heats, edges, imgPositions) {
    const heatLayout = {};
    const slots = {};
    const placements = {};
    const positionedHeats = heats
        .map((heat) => {
            const heatSlots = ["A", "B"]
                .map((slot) => ({
                    slot,
                    position: numericPosition(
                        imgPositions[`${heat.id}${slot}`]
                    ),
                }))
                .filter(({ position }) => position);
            if (!heatSlots.length) return undefined;

            return {
                ...heat,
                sourceX: Math.min(
                    ...heatSlots.map(({ position }) => position.x)
                ),
                sourceCenterY:
                    heatSlots.reduce(
                        (total, { position }) => total + position.y,
                        0
                    ) / heatSlots.length,
            };
        })
        .filter(Boolean)
        .sort(
            (left, right) =>
                left.sourceX - right.sourceX ||
                left.sourceCenterY - right.sourceCenterY
        );
    const primaryHeats = positionedHeats.filter((heat) => !heat.isOptional);
    const optionalHeats = positionedHeats.filter((heat) => heat.isOptional);

    const columns = [];
    for (const heat of primaryHeats) {
        const column = columns[columns.length - 1];
        if (
            !column ||
            heat.sourceX - column.sourceX > POSITIONED_COLUMN_TOLERANCE
        ) {
            columns.push({ sourceX: heat.sourceX, heats: [heat] });
        } else {
            column.heats.push(heat);
        }
    }

    const placementPoints = Object.entries(imgPositions)
        .filter(([id]) => /^Place\d+$/i.test(id))
        .map(([id, position]) => ({ id, position: numericPosition(position) }))
        .filter(({ position }) => position)
        .sort(
            (left, right) =>
                Number(left.id.replace(/\D/g, "")) -
                Number(right.id.replace(/\D/g, ""))
        );
    function frameHeight(items, sourceCenterY) {
        const rows = items
            .map(sourceCenterY)
            .sort((left, right) => left - right);
        const closestGap = rows
            .slice(1)
            .reduce(
                (gap, row, index) => Math.min(gap, row - rows[index]),
                Infinity
            );

        return Math.max(
            1,
            Math.min(POSITIONED_HEAT_HEIGHT, closestGap - POSITIONED_ROW_GAP)
        );
    }

    function positionHeat(heat, columnIndex, height) {
        const columnId = `column-${columnIndex + 1}`;
        const x =
            MARGIN +
            columnIndex * (POSITIONED_HEAT_WIDTH + POSITIONED_COLUMN_GAP);
        const y = heat.sourceCenterY - height / 2;
        const slotAreaTop = Math.min(20, height * 0.32);
        const slotAreaBottom = Math.max(slotAreaTop, height - 6);
        const slotAreaHeight = slotAreaBottom - slotAreaTop;

        heatLayout[heat.id] = {
            ...heat,
            x,
            y,
            width: POSITIONED_HEAT_WIDTH,
            height,
            columnId,
        };
        slots[`${heat.id}A`] = {
            x: x + 8,
            y: y + slotAreaTop + slotAreaHeight / 3,
        };
        slots[`${heat.id}B`] = {
            x: x + 8,
            y: y + slotAreaTop + (slotAreaHeight * 5) / 6,
        };
    }

    columns.forEach((column, columnIndex) => {
        const height = frameHeight(column.heats, (heat) => heat.sourceCenterY);
        column.height = height;
        column.heats
            .sort((left, right) => left.sourceCenterY - right.sourceCenterY)
            .forEach((heat) => positionHeat(heat, columnIndex, height));
    });

    optionalHeats.forEach((heat) => {
        const sourceHeat = heatLayout[heat.optionalSourceHeatId];
        const sourceColumnIndex = sourceHeat
            ? Math.round(
                  (sourceHeat.x - MARGIN) /
                      (POSITIONED_HEAT_WIDTH + POSITIONED_COLUMN_GAP)
              )
            : 0;
        positionHeat(
            heat,
            sourceColumnIndex,
            columns[sourceColumnIndex]?.height || POSITIONED_HEAT_HEIGHT
        );
    });

    const heatBottom = Math.max(
        0,
        ...Object.values(heatLayout).map((heat) => heat.y + heat.height)
    );
    placementPoints.forEach(({ id }) => {
        placements[id] = {
            id,
            x: MARGIN,
            y: 0,
            width: PLACEMENT_MIN_WIDTH,
            height: PLACEMENT_HEIGHT,
        };
    });

    const boxes = Object.values(heatLayout);
    const top = boxes.length ? Math.min(...boxes.map((box) => box.y)) : 0;
    const offsetY = MARGIN - top;
    for (const heat of Object.values(heatLayout)) heat.y += offsetY;
    for (const slot of Object.values(slots)) slot.y += offsetY;
    const columnCount = Math.max(1, columns.length);

    return layoutSvgPlacements({
        heats: heatLayout,
        edges,
        placements,
        positioned: true,
        slots,
        columns: columns.map((column, index) => ({
            id: `column-${index + 1}`,
            label: `Column ${index + 1}`,
            x: MARGIN + index * (POSITIONED_HEAT_WIDTH + POSITIONED_COLUMN_GAP),
            width: POSITIONED_HEAT_WIDTH,
        })),
        columnGap: POSITIONED_COLUMN_GAP,
        margin: MARGIN,
        viewBox: {
            width:
                MARGIN * 2 +
                columnCount * POSITIONED_HEAT_WIDTH +
                Math.max(0, columnCount - 1) * POSITIONED_COLUMN_GAP,
            height: heatBottom + offsetY + MARGIN,
        },
    });
}

function buildColumns(heats, edges) {
    const columns = Object.fromEntries(heats.map((heat) => [heat.id, 0]));
    const incoming = Object.fromEntries(heats.map((heat) => [heat.id, []]));

    for (const edge of edges) {
        if (edge.toHeat) incoming[edge.toHeat].push(edge.fromHeat);
    }

    // A bounded relaxation also handles malformed data without hanging the UI.
    for (let pass = 0; pass < heats.length; pass++) {
        let changed = false;
        for (const heat of heats) {
            const nextColumn = incoming[heat.id].reduce(
                (column, source) => Math.max(column, columns[source] + 1),
                0
            );
            if (nextColumn > columns[heat.id]) {
                columns[heat.id] = nextColumn;
                changed = true;
            }
        }
        if (!changed) break;
    }

    return columns;
}

/**
 * Converts a chart's existing progression data into a generic SVG layout.
 * Authored slot positions provide the primary geometry; graph layout is a fallback.
 */
export function buildSvgChartLayout(
    progress = {},
    imgPositions = {},
    imgSize = {}
) {
    const heats = Object.keys(progress)
        .map((id) => ({
            id: String(id),
            round: progress[id]["#Round"] || "Unassigned",
        }))
        .sort((left, right) => compareHeatIds(left.id, right.id));
    const heatIds = new Set(heats.map((heat) => heat.id));
    const heatIdByNumber = new Map(
        heats.map((heat) => [String(Number(heat.id)), heat.id])
    );
    const edges = [];
    const placements = new Set();
    const optionalHeatIds = new Set();
    const optionalSourceHeatIds = new Map();

    for (const heat of heats) {
        const detail = progress[heat.id];
        for (const [result, destination] of [
            ["winner", detail?.WinnerDest],
            ["loser", detail?.LoserDest],
        ]) {
            if (isChampionshipResetDestination(destination)) {
                for (const target of parseDestination(destination)) {
                    const heatId =
                        heatIdByNumber.get(target.heat) || target.heat;
                    if (heatIds.has(heatId)) {
                        optionalHeatIds.add(heatId);
                        optionalSourceHeatIds.set(heatId, heat.id);
                    }
                }
                continue;
            }
            const heatDestinations = parseDestination(destination)
                .map((target) => ({
                    ...target,
                    heat: heatIdByNumber.get(target.heat) || target.heat,
                }))
                .filter((target) => heatIds.has(target.heat));
            const placement = placementDestination(destination);

            if (placement) placements.add(placement);
            for (const target of heatDestinations) {
                edges.push({
                    fromHeat: heat.id,
                    toHeat: target.heat,
                    toSlot: target.slot,
                    result,
                });
            }
            if (placement) {
                edges.push({
                    fromHeat: heat.id,
                    placement,
                    result,
                });
            }
        }
    }

    for (const heat of heats) {
        heat.isOptional = optionalHeatIds.has(heat.id);
        heat.optionalSourceHeatId = optionalSourceHeatIds.get(heat.id);
        heat.annotation = progress[heat.id]?.Annotation || "";
    }

    if (Object.keys(imgPositions).length) {
        return buildPositionedLayout(heats, edges, imgPositions);
    }

    const primaryHeats = heats.filter((heat) => !heat.isOptional);
    const optionalHeats = heats.filter((heat) => heat.isOptional);
    const primaryHeatIds = new Set(primaryHeats.map((heat) => heat.id));
    const primaryEdges = edges.filter(
        (edge) =>
            primaryHeatIds.has(edge.fromHeat) &&
            (!edge.toHeat || primaryHeatIds.has(edge.toHeat))
    );
    const columns = buildColumns(primaryHeats, primaryEdges);
    const columnGroups = new Map();
    for (const heat of primaryHeats) {
        const column = columns[heat.id];
        if (!columnGroups.has(column)) columnGroups.set(column, []);
        columnGroups.get(column).push(heat);
    }

    const heatLayout = {};
    const maxColumn = Math.max(0, ...Object.values(columns));
    let maxRows = 1;
    for (const [column, group] of columnGroups) {
        group.sort((left, right) => compareHeatIds(left.id, right.id));
        maxRows = Math.max(maxRows, group.length);
        group.forEach((heat, row) => {
            heatLayout[heat.id] = {
                ...heat,
                x: MARGIN + column * (HEAT_WIDTH + COLUMN_GAP),
                y: MARGIN + row * (HEAT_HEIGHT + ROW_GAP),
                width: HEAT_WIDTH,
                height: HEAT_HEIGHT,
                columnId: `column-${column + 1}`,
            };
        });
    }

    let auxiliaryTop =
        MARGIN + maxRows * HEAT_HEIGHT + Math.max(0, maxRows) * ROW_GAP;
    optionalHeats.forEach((heat, index) => {
        const sourceHeat = heatLayout[heat.optionalSourceHeatId];
        heatLayout[heat.id] = {
            ...heat,
            x: sourceHeat?.x || MARGIN + maxColumn * (HEAT_WIDTH + COLUMN_GAP),
            y: auxiliaryTop + index * (HEAT_HEIGHT + ROW_GAP),
            width: HEAT_WIDTH,
            height: HEAT_HEIGHT,
            columnId: sourceHeat?.columnId || `column-${maxColumn + 1}`,
        };
    });
    if (optionalHeats.length) {
        auxiliaryTop += optionalHeats.length * (HEAT_HEIGHT + ROW_GAP);
    }

    const placementLayout = {};
    [...placements]
        .sort(
            (left, right) =>
                Number(left.replace("Place", "")) -
                Number(right.replace("Place", ""))
        )
        .forEach((id) => {
            placementLayout[id] = {
                id,
                x: MARGIN,
                y: 0,
                width: PLACEMENT_MIN_WIDTH,
                height: PLACEMENT_HEIGHT,
            };
        });

    const bottom = Math.max(
        0,
        ...Object.values(heatLayout).map((heat) => heat.y + heat.height),
        ...Object.values(placementLayout).map(
            (placement) => placement.y + placement.height
        )
    );
    const viewBox = {
        width:
            MARGIN * 2 + (maxColumn + 1) * HEAT_WIDTH + maxColumn * COLUMN_GAP,
        height: bottom + MARGIN,
    };

    return layoutSvgPlacements({
        heats: heatLayout,
        edges,
        placements: placementLayout,
        columns: Array.from({ length: maxColumn + 1 }, (_, index) => ({
            id: `column-${index + 1}`,
            label: `Column ${index + 1}`,
            x: MARGIN + index * (HEAT_WIDTH + COLUMN_GAP),
            width: HEAT_WIDTH,
        })),
        columnGap: COLUMN_GAP,
        margin: MARGIN,
        viewBox,
    });
}

export function layoutSvgPlacements(layout, labels = {}) {
    const margin = layout.margin || 0;
    const placements = Object.values(layout.placements || {}).sort(
        (left, right) =>
            Number(left.id.replace(/\D/g, "")) -
            Number(right.id.replace(/\D/g, ""))
    );
    const width = Math.max(
        PLACEMENT_MIN_WIDTH,
        ...placements.map((placement) => {
            const label = labels[placement.id] || placement.id;
            return Math.ceil(String(label).length * 22 * 0.56 + 16);
        })
    );
    const heatBottom = Math.max(
        margin,
        ...Object.values(layout.heats || {}).map((heat) => heat.y + heat.height)
    );
    const placementLayout = Object.fromEntries(
        placements.map((placement, index) => [
            placement.id,
            {
                ...placement,
                x: margin,
                y: heatBottom + ROW_GAP + index * (PLACEMENT_HEIGHT + ROW_GAP),
                width,
                height: PLACEMENT_HEIGHT,
            },
        ])
    );
    const placementBottom = placements.length
        ? Math.max(
              ...Object.values(placementLayout).map(
                  (placement) => placement.y + placement.height
              )
          )
        : heatBottom;

    return {
        ...layout,
        placements: placementLayout,
        viewBox: {
            width: Math.max(layout.viewBox.width, margin * 2 + width),
            height: placementBottom + margin,
        },
    };
}

// The column holding the championship heat: the heat annotated "Championship",
// else the heat that feeds a championship reset heat, else the heat whose
// winner takes Place1.
export function svgChampionshipColumnId(layout) {
    const heats = Object.values(layout.heats || {});
    const heatId =
        heats.find((heat) => heat.annotation === "Championship")?.id ??
        heats.find((heat) => heat.optionalSourceHeatId)?.optionalSourceHeatId ??
        (layout.edges || []).find(
            (edge) =>
                edge.fromHeat &&
                edge.placement === "Place1" &&
                edge.result === "winner"
        )?.fromHeat;
    return layout.heats?.[heatId]?.columnId;
}

// What to show under a hidden column's eye icon: a "flag" for the
// championship column, otherwise the direction ("left" or "right") winners
// advance toward it.
export function svgColumnGuide(columns, championshipColumnId, columnId) {
    const target = columns.findIndex(
        (column) => column.id === championshipColumnId
    );
    const index = columns.findIndex((column) => column.id === columnId);
    if (target < 0 || index < 0) return undefined;
    if (index === target) return "flag";
    return index < target ? "right" : "left";
}

export function applySvgColumnVisibility(layout, hiddenColumnIds = []) {
    const hidden = new Set(hiddenColumnIds);
    let nextX = layout.margin || 0;
    const columns = (layout.columns || []).map((column) => {
        const isHidden = hidden.has(column.id);
        const displayWidth = isHidden ? HIDDEN_COLUMN_WIDTH : column.width;
        const displayedColumn = {
            ...column,
            x: nextX,
            width: displayWidth,
            contentWidth: column.width,
            hidden: isHidden,
        };
        nextX += displayWidth + (layout.columnGap || 0);
        return displayedColumn;
    });
    const columnX = new Map(
        columns
            .filter((column) => !column.hidden)
            .map((column) => [column.id, column.x])
    );
    const moveBox = (box) => {
        const x = columnX.get(box.columnId);
        return x === undefined ? undefined : { ...box, x };
    };
    const heats = Object.fromEntries(
        Object.entries(layout.heats)
            .map(([id, heat]) => [id, moveBox(heat)])
            .filter(([, heat]) => heat)
    );
    const placements = layout.placements;
    const slots = layout.slots
        ? Object.fromEntries(
              Object.entries(layout.slots)
                  .map(([id, slot]) => {
                      const heat = heats[id.slice(0, -1)];
                      const originalHeat = layout.heats[id.slice(0, -1)];
                      return heat && originalHeat
                          ? [
                                id,
                                {
                                    ...slot,
                                    x: slot.x + heat.x - originalHeat.x,
                                },
                            ]
                          : undefined;
                  })
                  .filter(Boolean)
          )
        : undefined;
    const edges = layout.edges.filter((edge) => {
        const sourceVisible = Boolean(heats[edge.fromHeat]);
        const targetVisible = edge.toHeat ? Boolean(heats[edge.toHeat]) : true;
        return sourceVisible && targetVisible;
    });
    const boxes = Object.values(heats);
    const bottom = boxes.length
        ? Math.max(...boxes.map((box) => box.y + box.height))
        : layout.margin || 0;
    return layoutSvgPlacements({
        ...layout,
        heats,
        placements,
        slots,
        edges,
        columns,
        viewBox: {
            width: columns.length
                ? nextX - (layout.columnGap || 0) + (layout.margin || 0)
                : (layout.margin || 0) * 2,
            height: bottom + (layout.margin || 0),
        },
    });
}

export function svgSlotFontSize(label, width, baseSize = 22) {
    const availableWidth = Math.max(1, width - 16);
    const estimatedWidth = String(label || "").length * baseSize * 0.56;
    return estimatedWidth > availableWidth
        ? (baseSize * availableWidth) / estimatedWidth
        : baseSize;
}

// Heat titles are bold, so they run wider per character than slot labels.
const HEAT_TITLE_CHAR_WIDTH = 0.62;

export function svgHeatTitleLayout(heatId, annotation, width, baseSize = 14) {
    const text = `Heat ${heatId}${annotation ? ` (${annotation})` : ""}`;
    const availableWidth = Math.max(1, width - 16);
    const estimatedWidth = text.length * baseSize * HEAT_TITLE_CHAR_WIDTH;
    return {
        text,
        fontSize:
            estimatedWidth > availableWidth
                ? (baseSize * availableWidth) / estimatedWidth
                : baseSize,
    };
}

export function svgSlotTextLayout(label, width, baseSize = 22) {
    const value = String(label || "");
    const participant = value.match(/^(\d+)(?:\s+(.*))?$/);
    if (!participant) {
        return {
            label: value,
            labelFontSize: svgSlotFontSize(value, width, baseSize),
        };
    }

    const carNumber = participant[1];
    const driverName = participant[2] || "";
    const availableWidth = Math.max(
        1,
        width - 16 - carNumber.length * baseSize * 0.56 - (driverName ? 6 : 0)
    );
    return {
        carNumber,
        driverName,
        labelFontSize: baseSize,
        driverFontSize: svgSlotFontSize(
            driverName,
            availableWidth + 16,
            baseSize
        ),
    };
}

export function svgEdgePath(edge, layout) {
    const source = layout.heats[edge.fromHeat];
    const target = edge.toHeat
        ? layout.heats[edge.toHeat]
        : layout.placements[edge.placement];
    if (!source || !target) return "";

    if (layout.positioned) {
        const sourceSlots = ["A", "B"]
            .map((slot) => layout.slots[`${edge.fromHeat}${slot}`])
            .filter(Boolean);
        const targetSlot = edge.toHeat
            ? layout.slots[`${edge.toHeat}${edge.toSlot}`]
            : undefined;
        if (!sourceSlots.length) return "";

        const startX = source.x + source.width;
        const startY =
            sourceSlots.reduce((total, slot) => total + slot.y, 0) /
            sourceSlots.length;
        const endX = targetSlot ? targetSlot.x - 8 : target.x;
        const endY = targetSlot ? targetSlot.y : target.y + target.height / 2;
        const bendX = startX + (endX - startX) / 2;

        return `M ${startX} ${startY} H ${bendX} V ${endY} H ${endX}`;
    }

    const startX = source.x + source.width;
    const startY = source.y + source.height / 2;
    const endX = target.x;
    const endY =
        target.y +
        (edge.toSlot === "B" ? target.height * 0.75 : target.height * 0.25);
    const bendX = startX + (endX - startX) / 2;

    return `M ${startX} ${startY} H ${bendX} V ${endY} H ${endX}`;
}
