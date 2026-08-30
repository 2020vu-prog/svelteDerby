<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";
    import { createEventDispatcher } from "svelte";
    import Icon from "fa-svelte";
    import { faBackspace } from "@fortawesome/free-solid-svg-icons/faBackspace";
    import {
        isValidSpotifyTrack,
        spotifyTrackId,
    } from "./utils/spotifyLink.js";

    export let saveValue = "";

    let showPlayer = false;
    let valid = true;
    let focused = false;
    const dispatch = createEventDispatcher();

    function clear() {
        saveValue = "";
        showPlayer = false;
    }

    $: valid = isValidSpotifyTrack(saveValue);
    $: dispatch("validitychange", { valid });
    $: if (!saveValue || !valid) showPlayer = false;
    // Collapse a full URL/URI down to the bare track ID whenever the field
    // isn't actively being typed into. Reactive (not onMount-only) because
    // saveValue can arrive well after this component mounts -- e.g.
    // DriverAdd.svelte loads the existing driver from IndexedDB inside an
    // async onMount, so this component first mounts with an empty
    // saveValue and only gets the real stored URL once that load resolves.
    // Guarding on !focused keeps it from rewriting the field mid-edit.
    $: if (!focused && saveValue && isValidSpotifyTrack(saveValue)) {
        const normalized = spotifyTrackId(saveValue);
        if (normalized !== saveValue) saveValue = normalized;
    }
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
            on:focus={() => (focused = true)}
            on:blur={() => (focused = false)}
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
