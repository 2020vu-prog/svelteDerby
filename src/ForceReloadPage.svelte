<script>
    import log from "loglevel";

    import { push, replace, pop } from "svelte-spa-router";
    import { onMount } from "svelte";
    onMount(async () => {
        log.debug("params force reload : popping ");
        pop();
    });
</script>

<div>Refreshing</div>
