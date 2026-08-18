<script>
    import {
        driverMap,
        nextOnBlockKey,
        racePhaseMap,
        raceConfig,
        roleMap,
        standingsMap,
    } from "./stores.js";
    import PaInfoDriverCard from "./PaInfoDriverCard.svelte";
    import {
        formatWinTime,
        fmtChartPosition,
        getRaceTypeEmoji,
        hhmmssFmt,
        isPendingNeeded,
        isAllowedRoutePath,
    } from "./utils.js";
    import {
        getCarNumber,
        getCompletedRaceStatuses,
        getLatestCompletedStanding,
        getNextOnBlocksStatuses,
        getParticipant,
    } from "./paInfo.js";

    let nextRaceLabel = "";
    let completedRaceLabel = "";

    $: activeOrg = $raceConfig?.orgIz;
    $: activeRoles = $roleMap;
    $: canAnnounce =
        Boolean(activeOrg && activeRoles) && isAllowedRoutePath("/pa_info");
    $: nextRace =
        ($nextOnBlockKey && $racePhaseMap[$nextOnBlockKey]) || undefined;
    $: completedRace = getLatestCompletedStanding($standingsMap);
    $: setRaceLabel(nextRace, "next");
    $: setRaceLabel(completedRace, "completed");

    async function setRaceLabel(race, target) {
        if (!race) {
            if (target === "next") nextRaceLabel = "";
            else completedRaceLabel = "";
            return;
        }

        const [label] = await fmtChartPosition(race);
        if (target === "next" && race === nextRace) nextRaceLabel = label;
        if (target === "completed" && race === completedRace) {
            completedRaceLabel = label;
        }
    }

    function getNextRaceBackground(race) {
        if (!race) return "#6c757d";
        if (!isPendingNeeded(race)) return "#b8860b";
        return race.rs ? "#198754" : "#b02a37";
    }

    function getPhaseIcon(race) {
        if (!race) return "";

        let icon = race.phaseResults ? "" : race.phaseLiteral;
        if (!isPendingNeeded(race)) icon = race.pt?.charAt(0) || icon;
        return getRaceTypeEmoji(icon) || icon;
    }

    function participantFor(race, lane) {
        return getParticipant($driverMap, getCarNumber(race, lane));
    }
</script>

{#if canAnnounce}
    <section class="pa-info">
        <h1>PA Info</h1>

        <section class="race-section" aria-labelledby="next-on-blocks-heading">
            <header
                class="race-header next-race-header"
                style:background={getNextRaceBackground(nextRace)}
            >
                <div>
                    <h2 id="next-on-blocks-heading">Next on Blocks</h2>
                    {#if nextRace}
                        <div>{nextRaceLabel}</div>
                    {/if}
                </div>
                {#if nextRace}
                    <div class="race-meta">
                        <span class="phase-icon">{getPhaseIcon(nextRace)}</span>
                        <span>{hhmmssFmt(nextRace.at)}</span>
                    </div>
                {/if}
            </header>

            {#if nextRace}
                <div class="lane-grid">
                    {#each [1, 2] as lane}
                        <PaInfoDriverCard
                            lane={lane}
                            carNumber={getCarNumber(nextRace, lane)}
                            participant={participantFor(nextRace, lane)}
                            isWinner={Boolean(nextRace.isWinner?.(lane, true))}
                            statuses={getNextOnBlocksStatuses(
                                nextRace,
                                lane,
                                $standingsMap,
                                formatWinTime
                            )}
                        />
                    {/each}
                </div>
            {:else}
                <div class="empty-state">Starting blocks are empty.</div>
            {/if}
        </section>

        <section class="race-section" aria-labelledby="completed-race-heading">
            <header class="race-header completed-race-header">
                <div>
                    <h2 id="completed-race-heading">Most Recent Finish</h2>
                    {#if completedRace}
                        <div>{completedRaceLabel}</div>
                    {/if}
                </div>
                {#if completedRace}
                    <span>{hhmmssFmt(completedRace.at)}</span>
                {/if}
            </header>

            {#if completedRace}
                <div class="lane-grid">
                    {#each [1, 2] as lane}
                        <PaInfoDriverCard
                            lane={lane}
                            carNumber={getCarNumber(completedRace, lane)}
                            participant={participantFor(completedRace, lane)}
                            isWinner={Boolean(
                                completedRace.isWinner?.(lane, 0)
                            )}
                            statuses={getCompletedRaceStatuses(
                                completedRace,
                                lane,
                                formatWinTime
                            )}
                        />
                    {/each}
                </div>
            {:else}
                <div class="empty-state">No completed races.</div>
            {/if}
        </section>
    </section>
{:else}
    <section class="pa-info permission-denied" aria-live="polite">
        <h1>PA Info</h1>
        <p>You do not have permission to view this screen.</p>
    </section>
{/if}

<style>
    .pa-info {
        margin: 0 auto;
        max-width: 80rem;
        padding: 1rem;
    }

    h1 {
        font-size: 1.75rem;
        margin: 0 0 1rem;
    }

    .race-section + .race-section {
        margin-top: 1.5rem;
    }

    .race-header {
        align-items: center;
        border-radius: 0.4rem 0.4rem 0 0;
        color: white;
        display: flex;
        justify-content: space-between;
        min-height: 4.25rem;
        padding: 0.65rem 1rem;
    }

    .race-header h2 {
        font-size: 1.35rem;
        margin: 0;
    }

    .completed-race-header {
        background: #117a8b;
    }

    .race-meta {
        align-items: center;
        display: flex;
        gap: 0.75rem;
    }

    .phase-icon {
        font-size: 1.75rem;
        font-weight: 800;
    }

    .lane-grid {
        background: #e9ecef;
        display: grid;
        gap: 1rem;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        padding: 1rem;
    }

    .empty-state {
        background: #f8f9fa;
        border: 2px solid #ced4da;
        border-radius: 0 0 0.4rem 0.4rem;
        color: #555;
        font-size: 1.1rem;
        padding: 2rem 1rem;
        text-align: center;
    }

    @media (max-width: 640px) {
        .pa-info {
            padding: 0.5rem;
        }

        .lane-grid {
            grid-template-columns: 1fr;
            padding: 0.65rem;
        }

        .race-header {
            align-items: flex-start;
            gap: 0.5rem;
        }
    }
</style>
