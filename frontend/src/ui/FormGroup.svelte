<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let check = false;
</script>

<div
    {...$$restProps}
    class={cx(className, check ? "form-check" : "form-group")}
>
    <slot />
</div>
