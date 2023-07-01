<script>
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { showChart1 } from "./stores.js";
    onMount(async () => {
        //const x = new Date().getTime();
        //if (x % 2 == 0) {
        if ($showChart1) {
            replace("/chartList1");
        } else {
            replace("/chartList2");
        }
    });
</script>
Routing to preferred chart list.
