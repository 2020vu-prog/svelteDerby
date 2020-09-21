<script>
    import { createEventDispatcher } from "svelte";
    import { theme } from "./stores.js";
    import { onMount } from "svelte";
    export let disabled = false;
    export let spinning = false;
    export let focused = false;
    export let btnClass = "";
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
    function getThemeCss(theme, btnClass) {
        if (btnClass) {
            return ""; // no theme if using btnClass
        } else {
            return `background-color: ${theme}`;
        }
    }
</script>

<button
    style=" border: 1px solid black; {getThemeCss($theme, btnClass)}; color:
    white"
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
