/**
 * @typedef {Object} PaInfoStatus
 * @property {string} label Text displayed on the driver card.
 * @property {boolean} winner Whether the status should receive winner emphasis.
 */

/**
 * @callback FormatWinTime
 * @param {number|string} value Race-time difference in milliseconds or a tie literal.
 * @returns {string} Display-ready race-time text.
 */

/**
 * Converts a potentially missing timestamp to a sortable number.
 *
 * @param {*} value Candidate numeric value.
 * @returns {number} The finite numeric value, or zero when invalid.
 */
function asNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

/**
 * Finds the newest non-deleted race standing that contains results.
 *
 * @param {Record<string, Object>} standingsMap Race standings keyed by standing ID.
 * @returns {Object|undefined} Most recently completed standing, if one exists.
 */
export function getLatestCompletedStanding(standingsMap) {
    return Object.values(standingsMap || {})
        .filter(
            (standing) =>
                standing &&
                !standing.del &&
                typeof standing.hasResults === "function" &&
                standing.hasResults()
        )
        .sort((a, b) => asNumber(b.at) - asNumber(a.at))[0];
}

/**
 * Looks up a participant using the car-number key used by the driver store.
 *
 * @param {Record<string, Object>} driverMap Participants keyed by car number.
 * @param {string|number|null|undefined} carNumber Car number to locate.
 * @returns {Object|undefined} Matching participant, if present.
 */
export function getParticipant(driverMap, carNumber) {
    if (carNumber == null || carNumber === "") return undefined;
    return (driverMap || {})[carNumber];
}

/**
 * Returns the car number assigned to a one-based race lane.
 *
 * @param {Object|undefined} race Race phase or standing with a carNumbers array.
 * @param {number} lane One-based lane number.
 * @returns {string|number|undefined} Assigned car number.
 */
export function getCarNumber(race, lane) {
    return race?.carNumbers?.[lane - 1];
}

/**
 * Returns the sole car number on a race with exactly one lane filled in
 * (e.g. a fun/trial/hot run loaded with a single car), regardless of which
 * lane it's in.
 *
 * @param {Object|undefined} race Race phase or standing with a carNumbers array.
 * @returns {string|number|undefined} The sole car number, or undefined when
 *   zero or both lanes are filled.
 */
export function getSoloCarNumber(race) {
    const loaded = (race?.carNumbers || []).filter(
        (carNumber) => carNumber != null && carNumber !== ""
    );
    return loaded.length === 1 ? loaded[0] : undefined;
}

/**
 * Builds winner-status labels for a race currently shown as next on blocks.
 *
 * For phase B, this also reports the driver's prior phase-A win when the
 * associated standing is available.
 *
 * @param {Object|undefined} racePhase Current RacePhase-like value.
 * @param {number} lane One-based lane number.
 * @param {Record<string, Object>} standingsMap Race standings keyed by standing ID.
 * @param {FormatWinTime} formatWinTime Formats a millisecond difference.
 * @returns {PaInfoStatus[]} Statuses to display for the lane.
 */
export function getNextOnBlocksStatuses(
    racePhase,
    lane,
    standingsMap,
    formatWinTime
) {
    if (!racePhase) return [];

    if (racePhase.isWinner?.(lane, true)) {
        let phaseWinTime = racePhase.getPhaseDeltaMS();
        if (lane === 2) phaseWinTime *= -1;
        return [
            {
                label: `${racePhase.phaseLiteral}: ${formatWinTime(
                    phaseWinTime
                )}`,
                winner: true,
            },
        ];
    }

    if (racePhase.phaseLiteral !== "B" || !racePhase.rs) return [];

    const standing = (standingsMap || {})[racePhase.rs];
    if (!standing) return [];

    let phaseWinTime = standing.phase1DeltaMS;
    if (phaseWinTime === 0) {
        return [{ label: "A: Tied", winner: true }];
    }
    if (lane === 1) phaseWinTime *= -1;
    if (!(phaseWinTime > 0)) return [];

    return [
        {
            label: `A: ${formatWinTime(phaseWinTime)}`,
            winner: true,
        },
    ];
}

/**
 * Builds overall and phase-specific winner statuses for a completed race.
 *
 * @param {Object|undefined} standing Completed RaceStanding-like value.
 * @param {number} lane One-based lane number.
 * @param {FormatWinTime} formatWinTime Formats a millisecond difference.
 * @returns {PaInfoStatus[]} Statuses to display for the lane.
 */
export function getCompletedRaceStatuses(standing, lane, formatWinTime) {
    if (!standing) return [];

    const statusDefinitions = [
        { phase: 0, label: "Overall" },
        { phase: 1, label: "A" },
        { phase: 2, label: "B" },
    ];

    return statusDefinitions
        .filter(({ phase }) => standing.isWinner?.(lane, phase))
        .map(({ phase, label }) => ({
            label: `${label}: ${formatWinTime(
                standing.getWinTime(lane, phase)
            )}`,
            winner: phase === 0,
        }));
}
