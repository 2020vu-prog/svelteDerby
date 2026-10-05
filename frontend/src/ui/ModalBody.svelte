<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
</script>

<div {...$$restProps} class={cx(className, "modal-body")}>
    <slot />
</div>
