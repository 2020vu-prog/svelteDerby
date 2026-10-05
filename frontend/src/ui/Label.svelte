<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let check = false;
    export let fore = undefined;
    export { fore as for };
</script>

<label
    {...$$restProps}
    class={cx(className, check && "form-check-label")}
    for={fore}
>
    <slot />
</label>
