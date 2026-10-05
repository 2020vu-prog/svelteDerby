<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let toggle = undefined;
</script>

<div {...$$restProps} class={cx(className, "modal-header")}>
    <h5 class="modal-title">
        <slot />
    </h5>
    {#if typeof toggle === "function"}
        <button
            type="button"
            on:click={toggle}
            class="close"
            aria-label="Close"
        >
            <span aria-hidden="true">&times;</span>
        </button>
    {/if}
</div>
