function asNumber(value) {
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

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

export function getParticipant(driverMap, carNumber) {
    if (carNumber == null || carNumber === "") return undefined;
    return (driverMap || {})[carNumber];
}

export function getCarNumber(race, lane) {
    return race?.carNumbers?.[lane - 1];
}

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
