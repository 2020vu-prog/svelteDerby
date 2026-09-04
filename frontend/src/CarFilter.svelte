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
    export let defaultAlphanumeric = false;
    export let maxLength = null;
    export let allowKeyboardToggle = false;

    let icon = faFilter;
    let editMode = false;
    let filterInput;
    let isAlphanumeric = defaultAlphanumeric;
    $: effectiveMaxLength = maxLength ?? (isAlphanumeric ? 40 : 3);
    const toggleEdit = async () => {
        log.debug("toggle:", editMode);
        $filterStore = "";
        editMode = !editMode;
        isAlphanumeric = defaultAlphanumeric;
        if (editMode) {
            await tick();
            filterInput?.focus();
        }
    };
    const toggleKeyboardMode = async () => {
        isAlphanumeric = !isAlphanumeric;
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
    {#if allowKeyboardToggle}
        <span
            on:click={toggleKeyboardMode}
            title={isAlphanumeric
                ? "Switch to numeric"
                : "Switch to alphanumeric"}
        >
            <Icon icon={isAlphanumeric ? faHashtag : faFont} />
        </span>
    {/if}
    <input
        bind:this={filterInput}
        type="text"
        pattern={isAlphanumeric ? "[A-Za-z0-9]*" : "\\d*"}
        inputmode={isAlphanumeric ? "text" : "numeric"}
        maxLength={effectiveMaxLength}
        size={isAlphanumeric ? 12 : 3}
        bind:value={$filterStore}
    />
{:else}
    <span on:click={toggleEdit}>
        <Icon icon={faFilter} />
    </span>
{/if}
