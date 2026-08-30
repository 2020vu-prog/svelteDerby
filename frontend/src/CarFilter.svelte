<script>
    import log from "loglevel";

    import { carFilter } from "./stores.js";
    import Icon from "fa-svelte";
    import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";
    import { faBackspace } from "@fortawesome/free-solid-svg-icons/faBackspace";
    import { tick } from "svelte";

    export let filterStore = carFilter;
    export let alphanumeric = false;
    export let maxLength = null;

    let icon = faFilter;
    let editMode = false;
    let filterInput;
    $: effectiveMaxLength = maxLength ?? (alphanumeric ? 40 : 3);
    const toggleEdit = async () => {
        log.debug("toggle:", editMode);
        $filterStore = "";
        editMode = !editMode;
        if (editMode) {
            await tick();
            filterInput?.focus();
        }
    };
</script>

<!-- @format -->
{#if $filterStore || editMode}
    <span on:click={toggleEdit}>
        <Icon icon={faBackspace} />
    </span>
    <input
        bind:this={filterInput}
        type="text"
        pattern={alphanumeric ? "[A-Za-z0-9]*" : "\\d*"}
        inputmode={alphanumeric ? "text" : "numeric"}
        maxLength={effectiveMaxLength}
        size={alphanumeric ? 12 : 3}
        bind:value={$filterStore}
    />
{:else}
    <span on:click={toggleEdit}>
        <Icon icon={faFilter} />
    </span>
{/if}
