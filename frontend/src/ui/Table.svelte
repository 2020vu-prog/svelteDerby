<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let size = "";
    export let bordered = false;
    export let striped = false;
</script>

<table
    {...$$restProps}
    class={cx(
        className,
        "table",
        size && `table-${size}`,
        bordered && "table-bordered",
        striped && "table-striped"
    )}
>
    <slot />
</table>
