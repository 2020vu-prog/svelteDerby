<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let color = "muted";
</script>

<small
    {...$$restProps}
    class={cx(className, "form-text", color && `text-${color}`)}
>
    <slot />
</small>
