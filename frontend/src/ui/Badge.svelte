<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let color = "secondary";
    export let pill = false;
</script>

<span
    {...$$restProps}
    class={cx(className, "badge", `badge-${color}`, pill && "badge-pill")}
>
    <slot />
</span>
