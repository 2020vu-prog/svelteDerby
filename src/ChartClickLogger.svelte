<script>
    import { chartClickLoggerId } from "./stores.js";

    const toggleEdit = async () => {
        console.log("toggle:", editMode);
    };
</script>

<!-- @format -->
{#if $chartClickLoggerId }
    <input
        id="cclInput"
        type="string"
        maxLength="3"
        size="3"
        style="position: absolute; z-index: 9; top:100px;left:0px;"
        bind:value={$chartClickLoggerId} />
{/if}
