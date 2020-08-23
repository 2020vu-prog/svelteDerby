<script>
    import { createEventDispatcher } from "svelte";
    import { theme } from "./stores.js";
    import { onMount } from "svelte";
    export let disabled = false;
    export let spinning = false;
    export let focused = false;
    const btnClass = "";
    var thisButton;
    var mounted = false;
    onMount(async () => {
        console.log("SpinnerButton:", focused);
        mounted = true;
    });
    $: {
        console.log("SpinnerButton: potential focus.", focused);
        if (focused && mounted) {
            console.log(
                "SpinnerButton: requesting focus.",
                focused,
                thisButton
            );
            thisButton.focus();
        }
    }

    const dispatch = createEventDispatcher();
    function doClick() {
        dispatch("click");
    }
</script>

<button
    style="background-color: {$theme}; color: white"
    disabled={disabled || spinning}
    class="btn {btnClass}"
    bind:this={thisButton}
    type="button"
    on:click={doClick}>
    <slot />
    {#if spinning}
        <img alt="spinner" src="data/circles.svg" width="25px" />
    {/if}
</button>
