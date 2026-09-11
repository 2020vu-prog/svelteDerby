<script>
    const { decodeRouteParams } = require("./routeRegistry.js");

    export let component;
    export let params = {};

    $: decodedParams = decodeRouteParams(params);
</script>

<svelte:component this={component} params={decodedParams} on:routeEvent />
