<script>
    import log from "loglevel";

    import { tick } from "svelte";

    import {
        driverMap,
        pushMessage,
        racePhaseMap,
        nextOnBlockKey,
        mp3Playing,
        spotifyLoggedIn,
    } from "./stores.js";
    import { persistable } from "./storedb.js";
    import { onMount, onDestroy } from "svelte";
    import { db } from "./eventDb.js";
    import { sleep } from "./utils.js";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";
    import SpotifyApi from "./SpotifyApi.svelte";
    import SpotifyDeviceSelection from "./SpotifyDeviceSelection.svelte";
    import {
        sanitizeTrack,
        spotifyGetPlaybackState,
        spotifyRestorePlaybackState,
    } from "./utils/spotify.js";
    //let href='https://open.spotify.com/track/2DnJjbjNTV9Nd5NOa1KGba?si=07ae100fdc0e4f49'
    let requestedHref = "";
    let playingHref = "";
    let playSpotify;
    let pauseSpotify;
    let testTrackValue = "";
    let potentialPlayRequest = 0;
    const testTracks = [
        { label: "Back In Black", trackId: "08mG3Y1vljYA6bvDt4Wqkj" },
        { label: "You're So Vain", trackId: "2DnJjbjNTV9Nd5NOa1KGba" },
        { label: "Piano Man", trackId: "70C4NyhjD5OZUMzvWZ3njJ" },
        { label: "John Deere Green", trackId: "2ZXsvL9DO2MPv43Ay1IxgR" },
        {
            label: "The Chain - 2004 Remaster",
            trackId: "7Dm3dV3WPNdTgxoNY7YFnc",
        },
        { label: "Tom Sawyer", trackId: "3QZ7uX97s82HFYSmQUAN1D" },
        { label: "(Don't Fear) The Reaper", trackId: "5QTxFnGygVM4jFQiBovmRo" },
        {
            label: "Happytown (All Right With Me)",
            trackId: "5gXcmlzh6XGn5YNcabrs5x",
        },
        {
            label: "How Do You Like Me Now?!",
            trackId: "7rDcULv8vV16vetBjPJhuE",
        },
        { label: "Carlene", trackId: "339hc1FygD8oJl4kg24IjG" },
        {
            label: "Bitch, Don’t Kill My Vibe - International Remix / Explicit Version",
            trackId: "6WfA83OCEsiZ2IOTbUF4UQ",
        },
        { label: "Lake Shore Drive", trackId: "46MX86XQqYCZRvwPpeq4Gi" },
    ];
    $: raceDriverTracks = Object.values($driverMap || {})
        .filter((driver) => driver.wLink)
        .sort((left, right) =>
            String(left.number).localeCompare(String(right.number), undefined, {
                numeric: true,
            })
        );
    let playWalkup = persistable("pref:playWalkup", false);
    $: {
        potentialPlay($nextOnBlockKey, $playWalkup, testTrackValue);
    }
    $: {
        mayToggleSpotify($mp3Playing, requestedHref);
    }

    // Tracks the listener's pre-walkup Spotify state so it can be restored
    // once the whole walkup sequence ends. Save/restore only fire on the
    // rising/falling edge of "a walkup is playing" -- a walkup that starts
    // before the previous one's slot ends must not clobber this with the
    // interrupted walkup's own state, so walkup-to-walkup transitions leave
    // it untouched.
    let savedPlaybackState = null;

    // Serializes edge handling against playingHref changes: the state-save
    // GET must fully resolve before playingHref is set (that assignment is
    // what triggers the walkup's own play request), so the two never race.
    // requestedHref/$mp3Playing can move again while we're awaiting the
    // save -- applyDirty makes the loop re-read the live values instead of
    // committing playingHref to a now-stale target.
    let applyingHref = false;
    let applyDirty = false;

    // The Spotify track ID of the last walk-up we actually started playing.
    // Guards the rising-edge save against capturing our own leftover walk-up
    // playback as "the listener's prior state" (e.g. if a pause request was
    // slow, dropped, or raced) -- without this, that leftover walk-up track
    // gets replayed later as a "restore", which looks like an unrequested
    // walk-up starting on its own.
    let lastWalkupTrackId = "";

    const walkupLogLimit = 50;
    let walkupLog = [];

    function logWalkupEvent(text, type = "info") {
        walkupLog = [{ time: new Date(), text, type }, ...walkupLog].slice(
            0,
            walkupLogLimit
        );
    }

    // Nothing else in the app ever learns that a walk-up track finished
    // playing on its own -- the falling edge is otherwise driven purely by
    // requestedHref changing, which only happens when the race phase
    // advances. Without this poll, a walk-up that plays to completion while
    // the operator hasn't yet moved to the next block never restores the
    // listener's prior playback. Only meaningful on the device-API path;
    // there's nothing to poll for the embedded iframe player.
    const walkupPollIntervalMs = 3000;
    let walkupPollTimer = null;

    function stopWalkupCompletionPoll() {
        if (walkupPollTimer) {
            clearTimeout(walkupPollTimer);
            walkupPollTimer = null;
        }
    }

    function scheduleWalkupCompletionPoll() {
        stopWalkupCompletionPoll();
        walkupPollTimer = setTimeout(
            pollWalkupCompletion,
            walkupPollIntervalMs
        );
    }

    async function pollWalkupCompletion() {
        walkupPollTimer = null;
        if (
            !$spotifyLoggedIn ||
            !playingHref ||
            playingHref !== requestedHref
        ) {
            return;
        }

        let state = null;
        try {
            state = await spotifyGetPlaybackState();
        } catch (error) {
            log.debug(`walkup: completion poll failed: ${error.message}`);
            scheduleWalkupCompletionPoll();
            return;
        }

        const finished =
            !state ||
            !state.isPlaying ||
            sanitizeTrack(state.trackUri) !== lastWalkupTrackId;
        if (finished) {
            logWalkupEvent("Walk-up finished playing.");
            requestedHref = "";
            return;
        }
        scheduleWalkupCompletionPoll();
    }

    onDestroy(stopWalkupCompletionPoll);

    async function togglePlayPause(mp3Playing) {
        if (playSpotify) {
            log.debug(`walkup: mayToggleSpotify 3p: ${mp3Playing}`);
            if (mp3Playing || playingHref.length == 0) {
                log.debug(`walkup: mayToggleSpotify pause`);
                await pauseSpotify();
            } else {
                log.debug(`walkup: mayToggleSpotify play`);
                await playSpotify();
            }
        } else {
            log.debug(`walkup: mayToggleSpotify NOT playing s`);
        }
    }

    async function reconcileWalkupStep() {
        log.debug(
            `walkup: mayToggleSpotify hrefs [${requestedHref}] [${playingHref}]`
        );
        if (requestedHref === playingHref || $mp3Playing) {
            await togglePlayPause($mp3Playing);
            return;
        }

        const previousHref = playingHref;
        const nextHref = requestedHref;
        const wasWalkup = previousHref.length > 0;
        const isWalkup = nextHref.length > 0;

        if ($spotifyLoggedIn && !wasWalkup && isWalkup) {
            let state = null;
            try {
                state = await spotifyGetPlaybackState();
            } catch (error) {
                log.debug(
                    `walkup: save playback state failed: ${error.message}`
                );
            }
            if (requestedHref !== nextHref || $mp3Playing) {
                // The desired target moved on while the GET was in flight;
                // discard this result and let the loop re-evaluate from
                // scratch instead of committing playingHref for a stale
                // target (and instead of re-firing the same GET forever).
                applyDirty = true;
                return;
            }
            if (
                state &&
                lastWalkupTrackId &&
                sanitizeTrack(state.trackUri) === lastWalkupTrackId
            ) {
                // What's "currently playing" is actually our own leftover
                // walk-up track (the pause after it never landed / hasn't
                // landed yet) -- not something to restore later.
                state = null;
            }
            savedPlaybackState = state;
            logWalkupEvent(
                state
                    ? `Saved playback to restore later: ${sanitizeTrack(state.trackUri)}`
                    : "No active playback to save before walk-up."
            );
        }

        playingHref = nextHref;
        if (isWalkup) {
            lastWalkupTrackId = sanitizeTrack(nextHref);
            logWalkupEvent(`Walk-up playing: ${lastWalkupTrackId}`);
            if ($spotifyLoggedIn) {
                scheduleWalkupCompletionPoll();
            }
        } else {
            stopWalkupCompletionPoll();
        }
        log.debug(
            `walkup: mayToggleSpotify hreff [${requestedHref}] [${playingHref}]`
        );
        await togglePlayPause($mp3Playing);

        if (wasWalkup && !isWalkup) {
            logWalkupEvent("Walk-up ended.");
        }

        if ($spotifyLoggedIn && wasWalkup && !isWalkup) {
            const state = savedPlaybackState;
            savedPlaybackState = null;
            if (state) {
                const result = await spotifyRestorePlaybackState(state);
                if (result?.skipped) {
                    logWalkupEvent("No previous playback to restore.");
                } else if (result?.ok) {
                    logWalkupEvent(
                        `Restored previous playback: ${sanitizeTrack(state.trackUri)}`
                    );
                } else {
                    logWalkupEvent(
                        `Failed to restore previous playback: ${result?.reason || "unknown error"}`,
                        "error"
                    );
                }
            } else {
                logWalkupEvent("No previous playback to restore.");
            }
        }
    }

    function mayToggleSpotify() {
        if (applyingHref) {
            applyDirty = true;
            return;
        }
        applyingHref = true;
        (async () => {
            do {
                applyDirty = false;
                await reconcileWalkupStep();
            } while (applyDirty);
        })().finally(() => {
            applyingHref = false;
        });
    }
    function setWalkupStatus(text, type = "error") {
        logWalkupEvent(text, type);
        if ($playWalkup) {
            pushMessage({ key: "walkup-playback-status", text, type });
        }
    }

    async function potentialPlay(unused, playEnabled, selectedTestTrack) {
        const request = ++potentialPlayRequest;
        log.debug(`walkup: potentialPlay`);
        if (selectedTestTrack) {
            requestedHref = selectedTestTrack;
            return;
        }
        if (!$nextOnBlockKey.length > 0) {
            log.debug(`walkup: empty blocks`);
            requestedHref = "";
            if (playEnabled)
                setWalkupStatus(
                    "No walk-up track requested: there is no next participant."
                );
            return;
        }
        const nob = $racePhaseMap[$nextOnBlockKey];
        if (nob && nob.carNumbers) {
        } else {
            log.debug(`walkup: empty numbers`);
            requestedHref = "";
            if (playEnabled)
                setWalkupStatus(
                    "No walk-up track requested: the next participant has no car number."
                );
            return;
        }

        await sleep(500);
        if (request !== potentialPlayRequest) return;

        const lane1Car = String(nob.carNumbers[0]);
        const ptcpFromDexie = await db.Participant.get(lane1Car);
        if (ptcpFromDexie && ptcpFromDexie.wLink) {
            requestedHref = ptcpFromDexie.wLink;
            log.debug(`walkup: hitme: ${requestedHref}`);
            logWalkupEvent(
                `Walk-up requested for car ${lane1Car}: ${sanitizeTrack(requestedHref)}`
            );
        } else {
            log.debug(`walkup: no link ${lane1Car}`);
            requestedHref = "";
            if (playEnabled)
                setWalkupStatus(
                    `No walk-up track requested for car ${lane1Car}.`
                );
        }
    }
</script>
<br />

<label>
    Play Walkup:
    <input class="big" type="checkbox" bind:checked={$playWalkup} />
</label>
<label>
    Test track:
    <select bind:value={testTrackValue}>
        <option value="">Next participant’s track</option>
        <optgroup label="Current race drivers">
            {#each raceDriverTracks as driver}
                <option value={driver.wLink}>
                    Car {driver.number}: {driver.name || "Unnamed driver"}
                </option>
            {/each}
        </optgroup>
        <optgroup label="Test tracks">
            {#each testTracks as track}
                <option value={track.trackId}>{track.label}</option>
            {/each}
        </optgroup>
    </select>
</label>
{#if $playWalkup && $spotifyLoggedIn}
    <SpotifyDeviceSelection readOnly={true} />
{/if}
{#if playSpotify}
    <button on:click={playSpotify}>Play</button>
    <button on:click={pauseSpotify}>Pause</button>
{/if}

{#if playingHref && $playWalkup}
    {#key playingHref}
        {#if $spotifyLoggedIn}
            <SpotifyApi
                href={playingHref}
                bind:pplay={playSpotify}
                bind:ppause={pauseSpotify}
            />
        {:else}
            <SpotifyEmbedded
                autoPlay="false"
                href={playingHref}
                bind:pplay={playSpotify}
                bind:ppause={pauseSpotify}
            />
        {/if}
    {/key}
{/if}

<details class="walkup-log">
    <summary>Walk-up log ({walkupLog.length})</summary>
    {#if walkupLog.length === 0}
        <p class="walkup-log-empty">No walk-up events yet.</p>
    {:else}
        <ul class="walkup-log-list">
            {#each walkupLog as entry}
                <li
                    class="walkup-log-entry"
                    class:walkup-log-error={entry.type === "error"}
                >
                    <span class="walkup-log-time"
                        >{entry.time.toLocaleTimeString()}</span
                    >
                    {entry.text}
                </li>
            {/each}
        </ul>
    {/if}
</details>

<style>
    .walkup-log {
        margin-top: 0.75rem;
    }

    .walkup-log-empty {
        color: #666;
        font-style: italic;
    }

    .walkup-log-list {
        list-style: none;
        margin: 0.5rem 0 0;
        max-height: 16rem;
        overflow-y: auto;
        padding: 0;
    }

    .walkup-log-entry {
        border-bottom: 1px solid #ddd;
        font-size: 0.9rem;
        padding: 0.25rem 0;
    }

    .walkup-log-error {
        color: #b00020;
    }

    .walkup-log-time {
        color: #666;
        font-variant-numeric: tabular-nums;
        margin-right: 0.5rem;
    }
</style>
