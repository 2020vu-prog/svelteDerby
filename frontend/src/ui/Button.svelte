<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let color = "secondary";
    export let size = null;
    export let disabled = false;
</script>

<button
    {...$$restProps}
    class={cx(className, "btn", `btn-${color}`, size && `btn-${size}`)}
    disabled={disabled}
    on:click
>
    <slot />
</button>
