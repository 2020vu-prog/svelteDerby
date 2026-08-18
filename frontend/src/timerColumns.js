"use strict";

const BLOCKED_PIN_STATE = 1;
const DEFAULT_RACE_GAP_MICROS = 10 * 1000 * 1000;

function numericValue(value) {
    if (value === undefined || value === null) return undefined;
    if (typeof value === "number") return value;
    if (typeof value === "string") return Number(value);
    if (typeof value.toNumber === "function") return value.toNumber();
    return Number(value);
}

function getTimerPinGpsMicros(timerPin) {
    const gpsTime = timerPin?.stamp?.gpsTime;
    if (!gpsTime) return undefined;

    const seconds = numericValue(gpsTime.seconds);
    const nanos = numericValue(gpsTime.nanos) || 0;
    if (!Number.isFinite(seconds) || !Number.isFinite(nanos)) return undefined;

    return seconds * 1000 * 1000 + Math.round(nanos / 1000);
}

function timerDataListToBlockedEvents(timerId, timerDataList) {
    if (!timerId || !timerDataList?.timerData) return [];

    return timerDataList.timerData.flatMap((timerData) => {
        const timerPin = timerData.timerPin;
        if (!timerPin || timerPin.pinState !== BLOCKED_PIN_STATE) return [];

        const gpsMicros = getTimerPinGpsMicros(timerPin);
        if (!Number.isFinite(gpsMicros)) return [];

        return [
            {
                key: `${timerId}:${timerPin.pinName}:${gpsMicros}`,
                timerId,
                pinName: timerPin.pinName,
                gpsMicros,
            },
        ];
    });
}

function mappingKey(mapping) {
    return `${mapping.timerId}:${mapping.pinName}`;
}

function getConfiguredMappings(mappings) {
    const seen = new Set();
    return (mappings || []).filter((mapping) => {
        if (!mapping?.timerId || !mapping?.pinName) return false;
        const key = mappingKey(mapping);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function getMappingConflicts(mappings) {
    const mappingsByKey = new Map();

    for (const mapping of mappings || []) {
        if (!mapping?.timerId || !mapping?.pinName) continue;
        const key = mappingKey(mapping);
        const matchingMappings = mappingsByKey.get(key) || [];
        matchingMappings.push(mapping);
        mappingsByKey.set(key, matchingMappings);
    }

    return [...mappingsByKey.values()]
        .filter((matchingMappings) => matchingMappings.length > 1)
        .map((matchingMappings) => ({
            timerId: matchingMappings[0].timerId,
            pinName: matchingMappings[0].pinName,
            virtualLanes: matchingMappings.map(
                (mapping) => mapping.virtualLane
            ),
            timerNames: [
                ...new Set(
                    matchingMappings
                        .map((mapping) => mapping.timerName)
                        .filter(Boolean)
                ),
            ],
        }));
}

function ordinal(place) {
    const mod100 = place % 100;
    if (mod100 >= 11 && mod100 <= 13) return `${place}th`;
    switch (place % 10) {
        case 1:
            return `${place}st`;
        case 2:
            return `${place}nd`;
        case 3:
            return `${place}rd`;
        default:
            return `${place}th`;
    }
}

function rankRaceEvents(raceEvents, mappings) {
    const firstByVirtualLane = new Map();
    const mappingByTimerLane = new Map(
        mappings.map((mapping) => [mappingKey(mapping), mapping])
    );

    for (const event of raceEvents) {
        const mapping = mappingByTimerLane.get(mappingKey(event));
        if (mapping && !firstByVirtualLane.has(mapping.virtualLane)) {
            firstByVirtualLane.set(mapping.virtualLane, event);
        }
    }

    const rankedEvents = [...firstByVirtualLane.entries()]
        .map(([virtualLane, event]) => ({ virtualLane, ...event }))
        .sort((a, b) => a.gpsMicros - b.gpsMicros);
    const winningMicros = rankedEvents[0]?.gpsMicros;
    const timestampCounts = rankedEvents.reduce((counts, event) => {
        counts.set(event.gpsMicros, (counts.get(event.gpsMicros) || 0) + 1);
        return counts;
    }, new Map());
    let previousMicros;
    let previousPlace = 0;

    rankedEvents.forEach((event, index) => {
        const place =
            event.gpsMicros === previousMicros ? previousPlace : index + 1;
        event.place = place;
        event.placeLabel = ordinal(place);
        event.deltaMicros = event.gpsMicros - winningMicros;
        event.tied = timestampCounts.get(event.gpsMicros) > 1;
        previousMicros = event.gpsMicros;
        previousPlace = place;
    });

    const runnerUp = rankedEvents.find(
        (event) => event.gpsMicros > winningMicros
    );
    const winningMarginMicros = runnerUp
        ? runnerUp.gpsMicros - winningMicros
        : undefined;
    rankedEvents.forEach((event) => {
        if (event.deltaMicros === 0 && !event.tied) {
            event.winByMicros = winningMarginMicros;
        }
    });

    const rankedByVirtualLane = new Map(
        rankedEvents.map((event) => [event.virtualLane, event])
    );
    return mappings.map((mapping) => ({
        mapping,
        result: rankedByVirtualLane.get(mapping.virtualLane),
    }));
}

function buildTimerColumnRaces(
    events,
    mappings,
    raceGapMicros = DEFAULT_RACE_GAP_MICROS
) {
    const configuredMappings = getConfiguredMappings(mappings);
    const configuredKeys = new Set(configuredMappings.map(mappingKey));
    const sortedEvents = (events || [])
        .filter(
            (event) =>
                Number.isFinite(event?.gpsMicros) &&
                configuredKeys.has(mappingKey(event))
        )
        .sort((a, b) => a.gpsMicros - b.gpsMicros);

    const groupedEvents = [];
    let currentRace = [];
    let previousMicros;
    for (const event of sortedEvents) {
        if (
            currentRace.length &&
            event.gpsMicros - previousMicros > raceGapMicros
        ) {
            groupedEvents.push(currentRace);
            currentRace = [];
        }
        currentRace.push(event);
        previousMicros = event.gpsMicros;
    }
    if (currentRace.length) groupedEvents.push(currentRace);

    return groupedEvents
        .map((raceEvents) => ({
            key: raceEvents[0].gpsMicros,
            startMicros: raceEvents[0].gpsMicros,
            lanes: rankRaceEvents(raceEvents, configuredMappings),
        }))
        .reverse();
}

module.exports = {
    BLOCKED_PIN_STATE,
    DEFAULT_RACE_GAP_MICROS,
    buildTimerColumnRaces,
    getConfiguredMappings,
    getMappingConflicts,
    getTimerPinGpsMicros,
    ordinal,
    timerDataListToBlockedEvents,
};
