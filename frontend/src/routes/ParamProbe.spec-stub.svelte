<script>
    // Stand-in for a routed screen in routeRuntime.spec.js: shows the params
    // it was handed and can call the onRouteEvent callback the router gives
    // every screen (svelte-spa-router 5.x; 4.x used a `routeEvent` DOM event).
    export let params;
    export let onRouteEvent = () => {};
</script>

<div data-testid="probe" data-params={JSON.stringify(params)}>
    <button on:click={() => onRouteEvent({ from: "probe" })}> raise </button>
</div>
