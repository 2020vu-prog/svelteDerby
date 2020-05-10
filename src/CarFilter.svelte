<script>
    import { carFilter } from "./stores.js";
    import Icon from "fa-svelte";
    import { faFilter } from "@fortawesome/free-solid-svg-icons/faFilter";
    import { faBackspace } from "@fortawesome/free-solid-svg-icons/faBackspace";
    import { tick } from "svelte";

    let icon = faFilter;
    let editMode = false;
    const toggleEdit = async () => {
        console.log("toggle:", editMode);
        $carFilter = "";
        editMode = !editMode;
        if (editMode) {
            await tick();
            document.getElementById("cfInput").focus();
        }
    };
</script>

<!-- @format -->
{#if $carFilter || editMode}
    <span on:click={toggleEdit}>
        <Icon icon={faBackspace} />
    </span>
    <input
        id="cfInput"
        type="number"
        maxLength="3"
        size="3"
        bind:value={$carFilter} />
{:else}
    <span on:click={toggleEdit}>
        <Icon icon={faFilter} />
    </span>
{/if}
