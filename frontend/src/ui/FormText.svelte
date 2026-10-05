<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let color = "muted";
</script>

<small
    {...$$restProps}
    class={cx(
        className,
        "form-text",
        color && (color === "muted" ? "text-body-secondary" : `text-${color}`)
    )}
>
    <slot />
</small>
