<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";
    import { createEventDispatcher, onMount } from "svelte";
    import Icon from "fa-svelte";
    import { faBackspace } from "@fortawesome/free-solid-svg-icons/faBackspace";
    import {
        isValidSpotifyTrack,
        spotifyTrackId,
    } from "./utils/spotifyLink.js";

    export let saveValue = "";

    let showPlayer = false;
    let valid = true;
    const dispatch = createEventDispatcher();

    function normalize() {
        if (valid) saveValue = spotifyTrackId(saveValue);
    }

    function clear() {
        saveValue = "";
        showPlayer = false;
    }

    $: valid = isValidSpotifyTrack(saveValue);
    $: dispatch("validitychange", { valid });
    $: if (!saveValue || !valid) showPlayer = false;

    onMount(() => {
        // Show the bare track ID on load, not whatever form (full URL,
        // spotify: URI) happens to already be saved -- normalize() already
        // does this on every user edit, so run it once for the initial
        // value too instead of leaving it in raw/legacy form until the
        // user's next edit triggers a change event.
        normalize();
        dispatch("validitychange", { valid });
    });
</script>

<div class="field-row">
    <label for="walkUp">
        <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://open.spotify.com/"
        >
            Walk up Spotify link
        </a>
    </label>
    <span class="input-row">
        <input
            id="walkUp"
            type="text"
            bind:value={saveValue}
            on:input
            on:change={normalize}
            placeholder="https://open.spotify.com/track/..."
            aria-invalid={!valid}
        />
        {#if saveValue}
            <button
                class="clear-button"
                type="button"
                aria-label="Clear walk up Spotify link"
                title="Clear walk up Spotify link"
                on:click={clear}><Icon icon={faBackspace} /></button
            >
        {/if}
    </span>
</div>
{#if saveValue && !valid}
    <p class="validation-error">
        Enter a Spotify track link, track URI, or 22-character track ID.
    </p>
{/if}
<div class="actions">
    <SpinnerButton
        disabled={!saveValue || !valid}
        on:click={() => (showPlayer = !showPlayer)}
    >
        {showPlayer ? "Hide player" : "Play"}
    </SpinnerButton>
</div>
{#if showPlayer && saveValue && valid}
    {#key saveValue}
        <SpotifyEmbedded autoPlay={false} href={saveValue} />
    {/key}
{/if}

<style>
    .validation-error {
        color: #b00020;
    }

    .field-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .input-row {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
    }

    .clear-button {
        border: 0;
        background: transparent;
        cursor: pointer;
        line-height: 1;
        padding: 0.125rem 0.375rem;
    }

    .actions {
        display: block;
        margin-top: 0.5rem;
    }
</style>
