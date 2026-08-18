<script>
    import log from "loglevel";

    import { createEventDispatcher } from "svelte";
    import { theme } from "./stores.js";
    import { onMount } from "svelte";
    import { longpress } from "./utilActions.js";

    import CirclesSvg from "./CirclesSvg.svelte";
    export let disabled = false;
    export let spinning = false;
    export let focused = false;
    export let btnClass = "";
    var thisButton;
    var mounted = false;
    onMount(async () => {
        log.debug("SpinnerButton:", focused);
        mounted = true;
    });
    $: {
        log.debug("SpinnerButton: potential focus.", focused);
        if (focused && mounted) {
            log.debug("SpinnerButton: requesting focus.", focused, thisButton);
            thisButton.focus();
        }
    }

    const dispatch = createEventDispatcher();
    function doPress() {
        log.debug("SpinnerButton: longpress.");
        dispatch("press");
    }
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
    on:click={doClick}
    use:longpress={1500}
    on:longpress={doPress}
>
    <slot />
    {#if spinning}
        <!--

    <img alt="spinner" src={CirclesSvg} width="25px" />
    -->
        <CirclesSvg />
    {/if}
</button>
