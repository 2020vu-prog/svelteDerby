<script>
    import log from "loglevel";
    import { Base64 } from "js-base64";
    import { parse, toSeconds } from "iso8601-duration";
    import { onDestroy, onMount } from "svelte";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";

    import Annotate from "./Annotate.svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import TimerSubscribeStub from "./TimerSubscribeStub.svelte";
    import { db } from "./eventDb.js";
    import {
        axios,
        pushMessage,
        raceConfig,
        timerColumnMappings,
        timerColumnsDuration,
        userEmail,
    } from "./stores.js";
    import { getTimerPbConfig, isEmailAllowedRoutePath } from "./utils.js";

    const {
        buildTimerColumnRaces,
        getConfiguredMappings,
        getMappingConflicts,
        timerDataListToBlockedEvents,
    } = require("./timerColumns.js");

    const MIN_COLUMNS = 2;
    const MAX_COLUMNS = 4;
    const DEFAULT_DURATION = "PT20M";
    const PAGE_ROUTE = "/timerColumns";

    let mappings = ensureMappingCount($timerColumnMappings);
    let duration = $timerColumnsDuration || DEFAULT_DURATION;
    let durationSeconds = durationToSeconds(duration);
    let timerOptions = [];
    let races = [];
    let eventsByKey = new Map();
    let loadingHistory = false;
    let configurationOpen = true;
    let mounted = false;
    let initialized = false;
    let pruneInterval;
    let historyLoadVersion = 0;

    $: authorized = isEmailAllowedRoutePath($userEmail, PAGE_ROUTE);
    $: configuredMappings = getConfiguredMappings(mappings);
    $: mappingConflicts = getMappingConflicts(mappings);
    $: selectedTimerIds = [
        ...new Set(configuredMappings.map((mapping) => mapping.timerId)),
    ];
    $: duplicateMapping = mappingConflicts.length > 0;
    $: if (mounted && authorized && !initialized) initialize();

    onMount(() => {
        mounted = true;
        pruneInterval = setInterval(pruneAndRebuild, 5000);
    });

    onDestroy(() => {
        clearInterval(pruneInterval);
        historyLoadVersion += 1;
    });

    function newMapping(virtualLane) {
        return {
            virtualLane,
            timerName: "",
            timerId: "",
            pinName:
                virtualLane % 2 === 0
                    ? Timer.PinName.lane2
                    : Timer.PinName.lane1,
        };
    }

    function ensureMappingCount(savedMappings) {
        const normalized = Array.isArray(savedMappings)
            ? savedMappings.slice(0, MAX_COLUMNS).map((mapping, index) => ({
                  ...newMapping(index + 1),
                  ...mapping,
                  virtualLane: index + 1,
              }))
            : [];
        while (normalized.length < MIN_COLUMNS) {
            normalized.push(newMapping(normalized.length + 1));
        }
        return normalized;
    }

    async function initialize() {
        initialized = true;
        timerOptions = await loadTimerOptions();
        configurationOpen = !hasValidConfiguration();
        await refreshHistory();
    }

    function hasValidConfiguration() {
        if (mappings.length < MIN_COLUMNS) return false;
        if (getMappingConflicts(mappings).length) return false;

        return mappings.every(
            (mapping) =>
                mapping.timerName &&
                mapping.timerId &&
                mapping.pinName &&
                timerOptions.some(
                    (option) =>
                        option.timerName === mapping.timerName &&
                        option.timerId === mapping.timerId
                )
        );
    }

    async function loadTimerOptions() {
        const timerRecords = await db.TimerPbConfig.toArray();
        const options = [];
        for (const record of timerRecords) {
            const [decoded] = await getTimerPbConfig(record.SK);
            if (decoded?.timerMqttClientId && !decoded.deleted) {
                options.push({
                    timerName: record.SK,
                    timerId: decoded.timerMqttClientId,
                });
            }
        }
        return options.sort((a, b) => a.timerName.localeCompare(b.timerName));
    }

    function durationToSeconds(candidate) {
        try {
            const seconds = toSeconds(parse(candidate.toUpperCase()));
            return Number.isFinite(seconds) && seconds > 0
                ? seconds
                : undefined;
        } catch (error) {
            return undefined;
        }
    }

    function persistMappings() {
        mappings = mappings.map((mapping, index) => ({
            ...mapping,
            virtualLane: index + 1,
        }));
        $timerColumnMappings = mappings;
    }

    async function timerSelectionChanged(index) {
        const selected = timerOptions.find(
            (option) => option.timerName === mappings[index].timerName
        );
        mappings[index].timerId = selected?.timerId || "";
        persistMappings();
        await refreshHistory();
    }

    async function pinSelectionChanged() {
        persistMappings();
        await refreshHistory();
    }

    function addVirtualLane() {
        if (mappings.length >= MAX_COLUMNS) return;
        mappings = [...mappings, newMapping(mappings.length + 1)];
        persistMappings();
    }

    async function removeVirtualLane() {
        if (mappings.length <= MIN_COLUMNS) return;
        mappings = mappings.slice(0, -1);
        persistMappings();
        await refreshHistory();
    }

    async function refreshHistory() {
        const parsedDuration = durationToSeconds(duration);
        if (!parsedDuration) {
            pushMessage({
                text: `Invalid Timer Columns duration: ${duration}`,
                type: "error",
            });
            return;
        }

        durationSeconds = parsedDuration;
        $timerColumnsDuration = duration.toUpperCase();
        duration = $timerColumnsDuration;
        eventsByKey = new Map();
        races = [];

        const loadVersion = ++historyLoadVersion;
        if (configuredMappings.length < MIN_COLUMNS || duplicateMapping) return;

        loadingHistory = true;
        try {
            await Promise.all(
                selectedTimerIds.map((timerId) =>
                    loadTimerHistory(timerId, loadVersion)
                )
            );
            if (loadVersion === historyLoadVersion) pruneAndRebuild();
        } catch (error) {
            log.error("Timer Columns history load failed", error);
            pushMessage({
                text: `Timer Columns history load failed: ${error}`,
                type: "error",
            });
        } finally {
            if (loadVersion === historyLoadVersion) loadingHistory = false;
        }
    }

    async function loadTimerHistory(timerId, loadVersion) {
        const now = Date.now();
        const response = await $axios.get(
            `${$raceConfig.baseUrl}/getTimerPbHistory`,
            {
                params: {
                    orgIz: $raceConfig.orgIz,
                    orgId: $raceConfig.orgId,
                    timerName: timerId,
                    loIso: new Date(now - durationSeconds * 1000).toISOString(),
                    hiIso: new Date(now).toISOString(),
                },
            }
        );
        if (loadVersion !== historyLoadVersion) return;
        if (!Array.isArray(response.data)) {
            throw new Error(
                response.data?.error || `Invalid history for ${timerId}`
            );
        }

        for (const historyRecord of response.data) {
            if (
                !historyRecord?.data64 ||
                historyRecord.SK?.startsWith("9999:")
            ) {
                continue;
            }
            const timerDataList = Timer.TimerDataList.decode(
                Base64.toUint8Array(historyRecord.data64)
            );
            addTimerDataList(timerId, timerDataList, false);
        }
    }

    function handleLiveTimerData(timerId, timerDataList) {
        addTimerDataList(timerId, timerDataList, true);
    }

    function addTimerDataList(timerId, timerDataList, rebuild) {
        for (const event of timerDataListToBlockedEvents(
            timerId,
            timerDataList
        )) {
            eventsByKey.set(event.key, event);
        }
        if (rebuild) pruneAndRebuild();
    }

    function pruneAndRebuild() {
        if (!durationSeconds) return;
        const cutoffMicros = (Date.now() - durationSeconds * 1000) * 1000;
        for (const [key, event] of eventsByKey.entries()) {
            if (event.gpsMicros < cutoffMicros) eventsByKey.delete(key);
        }
        races = buildTimerColumnRaces(
            [...eventsByKey.values()],
            configuredMappings
        );
    }

    function formatGpsTime(gpsMicros) {
        const milliseconds = Math.floor(gpsMicros / 1000);
        const micros = String(gpsMicros % 1000).padStart(3, "0");
        return `${new Date(milliseconds).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
            hour12: false,
        })}${micros}`;
    }

    function formatWinningMargin(result) {
        if (result.tied) return "Tied";
        if (result.deltaMicros !== 0) return "";
        if (!Number.isFinite(result.winByMicros)) return "Winner";
        return `${(result.winByMicros / 1000).toFixed(3)} ms`;
    }

    function raceLabel(race) {
        return `Race ${new Date(race.startMicros / 1000).toLocaleString()}`;
    }
</script>

<h3>Timer Columns</h3>

{#if !authorized}
    <div class="access-denied">CanTimerConfig permission is required.</div>
{:else}
    <details
        class="controls"
        aria-label="Timer column configuration"
        bind:open={configurationOpen}
    >
        <summary>Configuration</summary>
        <div class="mapping-grid">
            {#each mappings as mapping, index (mapping.virtualLane)}
                <fieldset>
                    <legend>Virtual Lane {mapping.virtualLane}</legend>
                    <label>
                        Timer
                        <select
                            bind:value={mapping.timerName}
                            on:change={() => timerSelectionChanged(index)}
                        >
                            <option value="">Select timer</option>
                            {#each timerOptions as option}
                                <option value={option.timerName}>
                                    {option.timerName}
                                </option>
                            {/each}
                        </select>
                    </label>
                    {#if mapping.timerId}
                        <div class="timer-client-id">
                            Client ID: {mapping.timerId}
                        </div>
                    {/if}
                    <label>
                        Physical lane
                        <select
                            bind:value={mapping.pinName}
                            on:change={pinSelectionChanged}
                        >
                            <option value={Timer.PinName.lane1}>Lane 1</option>
                            <option value={Timer.PinName.lane2}>Lane 2</option>
                        </select>
                    </label>
                </fieldset>
            {/each}
        </div>

        <div class="control-row">
            <button
                type="button"
                disabled={mappings.length >= MAX_COLUMNS}
                on:click={addVirtualLane}
            >
                Add virtual lane
            </button>
            <button
                type="button"
                disabled={mappings.length <= MIN_COLUMNS}
                on:click={removeVirtualLane}
            >
                Remove virtual lane
            </button>
            <label class="duration-control">
                History duration
                <input bind:value={duration} placeholder="PT20M" />
            </label>
            <SpinnerButton on:click={refreshHistory} spinning={loadingHistory}>
                Load History
            </SpinnerButton>
        </div>

        {#if duplicateMapping}
            <div class="configuration-error">
                <strong>Duplicate physical timer lane:</strong>
                {#each mappingConflicts as conflict}
                    <div>
                        Virtual lanes {conflict.virtualLanes.join(" and ")}
                        both use client {conflict.timerId}, physical lane
                        {conflict.pinName}{#if conflict.timerNames.length > 1}
                            (configured as {conflict.timerNames.join(
                                " and "
                            )}){/if}. A physical timer lane can only be used
                        once.
                    </div>
                {/each}
            </div>
        {/if}
    </details>

    {#each selectedTimerIds as timerId (timerId)}
        <TimerSubscribeStub
            {timerId}
            verbose={false}
            on:timerDataList={(event) =>
                handleLiveTimerData(timerId, event.detail)}
        />
    {/each}

    {#if configuredMappings.length < MIN_COLUMNS}
        <p>Select at least two timer lanes to display timing data.</p>
    {:else if !races.length && !loadingHistory}
        <p>No timing data is available within {duration}.</p>
    {/if}

    {#each races as race (race.key)}
        <section class="race">
            <Annotate text={raceLabel(race)} />
            <div
                class="race-grid"
                style={`--timer-column-count: ${mappings.length}`}
            >
                {#each race.lanes as lane (lane.mapping.virtualLane)}
                    <article class:winner={lane.result?.deltaMicros === 0}>
                        <h4>Virtual Lane {lane.mapping.virtualLane}</h4>
                        {#if lane.result}
                            <strong class="placement">
                                {lane.result.placeLabel} place
                            </strong>
                            <div class="gps-time">
                                {formatGpsTime(lane.result.gpsMicros)}
                            </div>
                            {#if formatWinningMargin(lane.result)}
                                <div class="delta">
                                    {formatWinningMargin(lane.result)}
                                </div>
                            {/if}
                        {:else}
                            <div class="pending">Pending</div>
                        {/if}
                    </article>
                {/each}
            </div>
        </section>
    {/each}
{/if}

<style>
    * {
        box-sizing: border-box;
    }

    .controls {
        background: #eee;
        border-radius: 0.4rem;
        margin-bottom: 1rem;
        padding: 0.75rem;
    }

    .controls summary {
        cursor: pointer;
        font-weight: bold;
    }

    .controls[open] summary {
        margin-bottom: 0.75rem;
    }

    .mapping-grid,
    .race-grid {
        display: grid;
        gap: 0.75rem;
        grid-template-columns: repeat(
            var(--timer-column-count, 2),
            minmax(0, 1fr)
        );
    }

    .mapping-grid {
        grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }

    fieldset {
        border: 1px solid #888;
        border-radius: 0.3rem;
        min-width: 0;
    }

    label {
        display: block;
        margin-bottom: 0.5rem;
    }

    select,
    input {
        display: block;
        max-width: 100%;
        width: 100%;
    }

    .control-row {
        align-items: end;
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.75rem;
    }

    .duration-control {
        margin: 0;
        width: 10rem;
    }

    .timer-client-id {
        color: #555;
        font-size: 0.8rem;
        margin: -0.25rem 0 0.5rem;
        overflow-wrap: anywhere;
    }

    .configuration-error,
    .access-denied {
        background: #f8d7da;
        border: 1px solid #842029;
        color: #842029;
        margin-top: 0.75rem;
        padding: 0.75rem;
    }

    .race {
        margin-bottom: 1rem;
    }

    article {
        border: 2px solid #17a2b8;
        border-radius: 0.4rem;
        min-height: 10rem;
        padding: 0.75rem;
    }

    article.winner {
        background: #d4edda;
        border-color: #28a745;
    }

    article h4 {
        margin: 0 0 0.25rem;
    }

    .placement {
        display: block;
        font-size: 1.5rem;
        font-weight: bold;
        margin-top: 0.75rem;
    }

    .gps-time,
    .delta,
    .pending {
        margin-top: 0.4rem;
    }

    @media (max-width: 700px) {
        .race-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }
    }
</style>
