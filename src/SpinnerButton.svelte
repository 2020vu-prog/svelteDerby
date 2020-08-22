<script>
    import { createEventDispatcher } from "svelte";
    import { theme } from "./stores.js";
    export let disabled = false;
    export let spinning = false;
    const btnClass = "";

    const dispatch = createEventDispatcher();
    function doClick() {
        dispatch("click");
    }
</script>

<button
    style="background-color: {$theme}; color: white"
    disabled={disabled || spinning}
    class="btn {btnClass}"
    type="button"
    on:click={doClick}>
    <slot />
    {#if spinning}
        <img alt="spinner" src="data/circles.svg" width="25px" />
    {/if}
</button>
