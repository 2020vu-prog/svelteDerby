<script>
    import log from "loglevel";

    import { theme } from "#src/stores.js";
    import { onMount } from "svelte";
    import { longpress } from "#src/utilActions.js";

    import CirclesSvg from "#src/CirclesSvg.svelte";
    export let disabled = false;
    export let spinning = false;
    export let focused = false;
    export let btnClass = "";
    // Called with the click event. Optional: an undefined callback is ignored,
    // as an `on:click` with no handler was.
    export let onClick = () => {};
    // Called when the button is held down (a long press).
    export let onPress = () => {};
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

    function doPress() {
        log.debug("SpinnerButton: longpress.");
        onPress?.();
    }
    function doClick(event) {
        onClick?.(event);
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
