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
    const placementHeight = 44;
    const placementColumnCount = Math.max(1, columns.length);
    placementPoints.forEach(({ id }, index) => {
        const columnIndex = index % placementColumnCount;
        const row = Math.floor(index / placementColumnCount);
        placements[id] = {
            id,
            x:
                MARGIN +
                columnIndex * (POSITIONED_HEAT_WIDTH + POSITIONED_COLUMN_GAP),
            y:
                heatBottom +
                POSITIONED_ROW_GAP +
                row * (placementHeight + POSITIONED_ROW_GAP),
            width: POSITIONED_HEAT_WIDTH,
            height: placementHeight,
        };
    });

    const boxes = [...Object.values(heatLayout), ...Object.values(placements)];
    const top = boxes.length ? Math.min(...boxes.map((box) => box.y)) : 0;
    const offsetY = MARGIN - top;
    for (const heat of Object.values(heatLayout)) heat.y += offsetY;
    for (const slot of Object.values(slots)) slot.y += offsetY;
    for (const placement of Object.values(placements)) placement.y += offsetY;

    const bottom = Math.max(
        0,
        ...Object.values(heatLayout).map((heat) => heat.y + heat.height),
        ...Object.values(placements).map(
            (placement) => placement.y + placement.height
        )
    );
    const columnCount = Math.max(1, columns.length);

    return {
        heats: heatLayout,
        edges,
        placements,
        positioned: true,
        slots,
        viewBox: {
            width:
                MARGIN * 2 +
                columnCount * POSITIONED_HEAT_WIDTH +
                Math.max(0, columnCount - 1) * POSITIONED_COLUMN_GAP,
            height: bottom + MARGIN,
        },
    };
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
        .forEach((id, index) => {
            const column = index % (maxColumn + 1);
            const row = Math.floor(index / (maxColumn + 1));
            placementLayout[id] = {
                id,
                x: MARGIN + column * (HEAT_WIDTH + COLUMN_GAP),
                y: auxiliaryTop + row * (HEAT_HEIGHT + ROW_GAP),
                width: HEAT_WIDTH,
                height: HEAT_HEIGHT,
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

    return { heats: heatLayout, edges, placements: placementLayout, viewBox };
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
