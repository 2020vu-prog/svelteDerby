<script>
    import log from "loglevel";

    import { carFilter } from "./stores.js";
    import Icon from "fa-svelte";
    import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";
    import { faBackspace } from "@fortawesome/free-solid-svg-icons/faBackspace";
    import { faFont } from "@fortawesome/free-solid-svg-icons/faFont";
    import { faHashtag } from "@fortawesome/free-solid-svg-icons/faHashtag";
    import { tick } from "svelte";

    export let filterStore = carFilter;
    export let alphanumeric = false;
    export let maxLength = null;

    let icon = faFilter;
    let editMode = false;
    let filterInput;
    let alphaMode = alphanumeric;
    $: effectiveMaxLength = maxLength ?? (alphaMode ? 40 : 3);
    const toggleEdit = async () => {
        log.debug("toggle:", editMode);
        $filterStore = "";
        editMode = !editMode;
        alphaMode = alphanumeric;
        if (editMode) {
            await tick();
            filterInput?.focus();
        }
    };
    const toggleAlphaMode = async () => {
        alphaMode = !alphaMode;
        // Mobile keyboards (notably iOS Safari) don't reliably re-read
        // inputmode on an already-focused field -- blur/refocus forces
        // the keyboard to redraw with the new layout.
        filterInput?.blur();
        await tick();
        filterInput?.focus();
        const len = $filterStore.length;
        filterInput?.setSelectionRange(len, len);
    };
</script>

<!-- @format -->
{#if $filterStore || editMode}
    <span on:click={toggleEdit}>
        <Icon icon={faBackspace} />
    </span>
    <span
        on:click={toggleAlphaMode}
        title={alphaMode ? "Switch to numeric" : "Switch to alphanumeric"}
    >
        <Icon icon={alphaMode ? faHashtag : faFont} />
    </span>
    <input
        bind:this={filterInput}
        type="text"
        pattern={alphaMode ? "[A-Za-z0-9]*" : "\\d*"}
        inputmode={alphaMode ? "text" : "numeric"}
        maxLength={effectiveMaxLength}
        size={alphaMode ? 12 : 3}
        bind:value={$filterStore}
    />
{:else}
    <span on:click={toggleEdit}>
        <Icon icon={faFilter} />
    </span>
{/if}
