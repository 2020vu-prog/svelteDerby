<script>
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { showChart2 } from "./stores.js";
    onMount(async () => {
        //const x = new Date().getTime();
        //if (x % 2 == 0) {
        if ($showChart2) {
            replace("/chartList2");
        } else {
            replace("/chartList1");
        }
    });
</script>
