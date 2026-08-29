<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";
    import Icon from "fa-svelte";
    import { faTimes } from "@fortawesome/free-solid-svg-icons/faTimes";
    import {
        isValidSpotifyTrack,
        spotifyTrackId,
    } from "./utils/spotifyLink.js";

    export let saveValue = "";

    let showPlayer = false;
    let valid = true;

    function normalize() {
        if (valid) saveValue = spotifyTrackId(saveValue);
    }

    function clear() {
        saveValue = "";
        showPlayer = false;
    }

    $: valid = isValidSpotifyTrack(saveValue);
    $: if (!saveValue || !valid) showPlayer = false;
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
                on:click={clear}><Icon icon={faTimes} /></button
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
    <slot {valid} />
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
