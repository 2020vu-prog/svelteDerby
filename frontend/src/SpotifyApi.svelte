<script lang="ts">
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import log from "loglevel";
    import {
        spotifyActiveDeviceId,
        spotifyLookupTrack,
        spotifyPlay,
    } from "./utils/spotify.js";
    import { pushMessage, spotifySelectedDeviceId } from "./stores.js";
    export let href;
    let deviceId = $spotifySelectedDeviceId || undefined;
    let deviceLookup;
    let destroyed = false;

    onDestroy(() => {
        destroyed = true;
    });

    const getWalkupDevice = async () => {
        if (deviceId) return deviceId;
        if (!deviceLookup) deviceLookup = spotifyActiveDeviceId();
        deviceId = await deviceLookup;
        return deviceId;
    };

    const setWalkupStatus = (text, type = "error") => {
        pushMessage({ key: "walkup-playback-status", text, type });
    };

    const requestPlay = async () => {
        let trackMetadata;
        try {
            trackMetadata = await spotifyLookupTrack(href);
        } catch (error) {
            if (!destroyed) {
                setWalkupStatus(
                    `Spotify walk-up failed: track lookup failed: ${error.message}`
                );
            }
            return false;
        }
        if (destroyed) return false;

        const trackName = trackMetadata.name || "Unknown track";
        setWalkupStatus(
            `Spotify walk-up play requested: “${trackName}”.`,
            "success"
        );
        const targetDeviceId = await getWalkupDevice();
        if (destroyed) return false;
        if (!targetDeviceId) {
            setWalkupStatus(
                `Spotify walk-up failed for “${trackName}”: no playback device is available.`
            );
            return false;
        }

        const result = await spotifyPlay(href, true, false, targetDeviceId);
        if (destroyed) return false;
        if (!result?.ok) {
            setWalkupStatus(
                `Spotify walk-up failed for “${trackName}”: ${result?.reason || "unknown playback error."}`
            );
            return false;
        }
        setWalkupStatus(
            `Spotify walk-up playback started: “${result.track?.name || trackName}”.`,
            "success"
        );
        return true;
    };

    //export let autoPlay=false;
    export const ppause = async () => {
        console.log("SpotifyAPI pause disabled");
    };

    export const pplay = async () => {
        await requestPlay();
        console.log("SpotifyAPI play child");
    };
    $: {
        console.log(`SpotifyAPI ${href}`);
    }

    onMount(() => {
        console.log("SpotifyAPI mount");
        let interval;

        (async () => {
            if (destroyed) return;
            const started = await requestPlay();
            if (!started || destroyed) return;
            interval = setTimeout(() => {
                console.log("SpotifyAPI timed pause disabled");
            }, 10000);
        })();

        return () => {
            if (interval) clearTimeout(interval);
        };
    });
</script>
SPOTIFY API
