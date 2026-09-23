const HEAT_WIDTH = 228;
const HEAT_HEIGHT = 58;
const COLUMN_GAP = 104;
const ROW_GAP = 24;
const MARGIN = 36;

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
 * The result intentionally has no dependency on the legacy PNG or imgPositions.
 */
export function buildSvgChartLayout(progress = {}) {
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
        const detail = progress[heat.id] || progress[heat.id.padStart(2, "0")];
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

    const viewBox = {
        width:
            MARGIN * 2 +
            (placements.size ? maxColumn + 2 : maxColumn + 1) * HEAT_WIDTH +
            (placements.size ? maxColumn + 1 : maxColumn) * COLUMN_GAP,
        height: MARGIN * 2 + maxRows * HEAT_HEIGHT + (maxRows - 1) * ROW_GAP,
    };

    return { heats: heatLayout, edges, placements: placementLayout, viewBox };
}

export function svgEdgePath(edge, layout) {
    const source = layout.heats[edge.fromHeat];
    const target = edge.toHeat
        ? layout.heats[edge.toHeat]
        : layout.placements[edge.placement];
    if (!source || !target) return "";

    const startX = source.x + source.width;
    const startY = source.y + source.height / 2;
    const endX = target.x;
    const endY =
        target.y +
        (edge.toSlot === "B" ? target.height * 0.75 : target.height * 0.25);
    const bendX = startX + (endX - startX) / 2;

    return `M ${startX} ${startY} H ${bendX} V ${endY} H ${endX}`;
}
