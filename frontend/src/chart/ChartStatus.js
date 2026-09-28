const BRACKET_STATUS_PRECEDENCE = [
    "pendingSeed",
    "ready",
    "phaseOneComplete",
    "complete",
];

export function getBracketSummaryClass(recap = {}) {
    return BRACKET_STATUS_PRECEDENCE.find((status) => recap[status]);
}

function heatIsComplete(states = []) {
    if (states.length !== 2) return false;
    if (states.every((state) => state.bracketClass === "complete")) return true;

    return states.some(
        (state) =>
            state.bracketClass === "haveBye" ||
            state.bracketClass === "haveForfeit"
    );
}

function heatHasCarNumber(states = []) {
    return states.some(
        (state) => state.bracketClass === "havePtcp" || state.rsFromDexie
    );
}

export function getInitialHiddenColumnIds(layout, heatStates = {}) {
    const heats = Object.values(layout.heats);
    const requiredHeats = heats.filter((heat) => !heat.isOptional);
    const hidden = new Set();

    for (const column of layout.columns) {
        const columnHeats = heats.filter((heat) => heat.columnId === column.id);
        const requiredColumnHeats = columnHeats.filter(
            (heat) => !heat.isOptional
        );
        const completionHeats = requiredColumnHeats.length
            ? requiredColumnHeats
            : columnHeats;
        const hasCarNumber = columnHeats.some((heat) =>
            heatHasCarNumber(heatStates[heat.id])
        );
        const allComplete =
            completionHeats.length > 0 &&
            completionHeats.every((heat) =>
                heatIsComplete(heatStates[heat.id])
            );

        if (!hasCarNumber || allComplete) hidden.add(column.id);
    }

    if (hidden.size !== layout.columns.length) return [...hidden];

    const raceComplete =
        requiredHeats.length > 0 &&
        requiredHeats.every((heat) => heatIsComplete(heatStates[heat.id]));
    const raceBegun = heats.some((heat) =>
        heatHasCarNumber(heatStates[heat.id])
    );
    let fallbackColumns = [];

    if (raceComplete) {
        const championshipHeat = requiredHeats.reduce((latest, heat) => {
            const heatColumn = layout.columns.findIndex(
                (column) => column.id === heat.columnId
            );
            const latestColumn = layout.columns.findIndex(
                (column) => column.id === latest?.columnId
            );
            return heatColumn > latestColumn ? heat : latest;
        }, undefined);
        if (championshipHeat) fallbackColumns = [championshipHeat.columnId];
    } else if (!raceBegun) {
        fallbackColumns = layout.columns
            .filter((column) =>
                heats
                    .filter((heat) => heat.columnId === column.id)
                    .some((heat) =>
                        (heatStates[heat.id] || []).some(
                            (state) => state.isSeed
                        )
                    )
            )
            .map((column) => column.id);
    }

    for (const columnId of fallbackColumns) hidden.delete(columnId);
    return [...hidden];
}
