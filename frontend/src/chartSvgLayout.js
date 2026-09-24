const HEAT_WIDTH = 228;
const HEAT_HEIGHT = 58;
const COLUMN_GAP = 104;
const ROW_GAP = 24;
const MARGIN = 36;
const POSITIONED_HEAT_WIDTH = 170;
const POSITIONED_HEAT_PADDING = 30;

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

function numericPosition(position) {
    if (!position) return undefined;

    const x = Number(position.left);
    const y = Number(position.top);
    return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : undefined;
}

function buildPositionedLayout(heats, edges, imgPositions, imgSize) {
    const heatLayout = {};
    const slots = {};
    const placements = {};
    let right = 0;
    let bottom = 0;

    for (const heat of heats) {
        const heatSlots = ["A", "B"]
            .map((slot) => ({
                slot,
                position: numericPosition(imgPositions[`${heat.id}${slot}`]),
            }))
            .filter(({ position }) => position);
        if (!heatSlots.length) continue;

        const left = Math.min(...heatSlots.map(({ position }) => position.x));
        const top = Math.min(...heatSlots.map(({ position }) => position.y));
        const slotBottom = Math.max(
            ...heatSlots.map(({ position }) => position.y)
        );

        heatLayout[heat.id] = {
            ...heat,
            x: left - 10,
            y: top - POSITIONED_HEAT_PADDING,
            width: POSITIONED_HEAT_WIDTH,
            height: slotBottom - top + POSITIONED_HEAT_PADDING * 2,
        };
        for (const { slot, position } of heatSlots) {
            slots[`${heat.id}${slot}`] = position;
        }
        right = Math.max(right, left + POSITIONED_HEAT_WIDTH);
        bottom = Math.max(bottom, slotBottom + POSITIONED_HEAT_PADDING);
    }

    for (const [id, position] of Object.entries(imgPositions)) {
        if (!/^Place\d+$/i.test(id)) continue;
        const point = numericPosition(position);
        if (!point) continue;

        placements[id] = {
            id,
            x: point.x - 10,
            y: point.y - POSITIONED_HEAT_PADDING,
            width: POSITIONED_HEAT_WIDTH,
            height: POSITIONED_HEAT_PADDING * 2,
        };
        right = Math.max(right, point.x + POSITIONED_HEAT_WIDTH);
        bottom = Math.max(bottom, point.y + POSITIONED_HEAT_PADDING);
    }

    return {
        heats: heatLayout,
        edges,
        placements,
        positioned: true,
        slots,
        viewBox: {
            width: Math.max(Number(imgSize?.width) || 0, right + MARGIN),
            height: Math.max(Number(imgSize?.height) || 0, bottom + MARGIN),
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

    for (const heat of heats) {
        const detail = progress[heat.id];
        for (const [result, destination] of [
            ["winner", detail?.WinnerDest],
            ["loser", detail?.LoserDest],
        ]) {
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

    if (Object.keys(imgPositions).length) {
        return buildPositionedLayout(heats, edges, imgPositions, imgSize);
    }

    const columns = buildColumns(heats, edges);
    const columnGroups = new Map();
    for (const heat of heats) {
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

    const placementLayout = {};
    [...placements]
        .sort(
            (left, right) =>
                Number(left.replace("Place", "")) -
                Number(right.replace("Place", ""))
        )
        .forEach((id, index) => {
            placementLayout[id] = {
                id,
                x: MARGIN + (maxColumn + 1) * (HEAT_WIDTH + COLUMN_GAP),
                y: MARGIN + index * (HEAT_HEIGHT + ROW_GAP),
                width: HEAT_WIDTH,
                height: HEAT_HEIGHT,
            };
        });

    const totalRows = Math.max(maxRows, placements.size);
    const viewBox = {
        width:
            MARGIN * 2 +
            (placements.size ? maxColumn + 2 : maxColumn + 1) * HEAT_WIDTH +
            (placements.size ? maxColumn + 1 : maxColumn) * COLUMN_GAP,
        height:
            MARGIN * 2 + totalRows * HEAT_HEIGHT + (totalRows - 1) * ROW_GAP,
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
