<script>
    // Stand-in for a routed screen in routeRuntime.spec.js: shows the params
    // it was handed and can raise a routeEvent, as real screens may.
    import { createEventDispatcher } from "svelte";

    export let params;

    const dispatch = createEventDispatcher();
</script>

<div data-testid="probe" data-params={JSON.stringify(params)}>
    <button on:click={() => dispatch("routeEvent", { from: "probe" })}>
        raise
    </button>
</div>
