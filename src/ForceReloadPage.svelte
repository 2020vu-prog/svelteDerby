<script>
    import log from "roarr";

    import { push, replace, pop } from "svelte-spa-router";
    import { onMount } from "svelte";
    onMount(async () => {
        log("params force reload : popping ");
        pop();
    });
</script>

<div>Refreshing</div>
