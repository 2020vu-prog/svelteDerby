<script>
    import { cx } from "./cx.js";

    let className = "";
    export { className as class };
    export let color = "secondary";
    export let pill = false;
</script>

<span
    {...$$restProps}
    class={cx(className, "badge", `ui-badge-${color}`, pill && "rounded-pill")}
>
    <slot />
</span>

<style>
    /*
     * Bootstrap 5's `text-bg-*` classes set the background with `!important`,
     * which beats an inline `style="background: ..."`. The race badges pass one
     * (RacePhase colors them by lane status), and Bootstrap 4's `badge-*`
     * colors were plain declarations that an inline style overrode. These are
     * the same colors, as plain declarations, from Bootstrap's own variables.
     */
    :global(.ui-badge-primary) {
        color: #fff;
        background-color: var(--bs-primary);
    }
    :global(.ui-badge-secondary) {
        color: #fff;
        background-color: var(--bs-secondary);
    }
    :global(.ui-badge-success) {
        color: #fff;
        background-color: var(--bs-success);
    }
    :global(.ui-badge-danger) {
        color: #fff;
        background-color: var(--bs-danger);
    }
    :global(.ui-badge-warning) {
        color: #212529;
        background-color: var(--bs-warning);
    }
    :global(.ui-badge-info) {
        color: #fff;
        background-color: var(--bs-info);
    }
    :global(.ui-badge-light) {
        color: #212529;
        background-color: var(--bs-light);
    }
    :global(.ui-badge-dark) {
        color: #fff;
        background-color: var(--bs-dark);
    }
</style>
