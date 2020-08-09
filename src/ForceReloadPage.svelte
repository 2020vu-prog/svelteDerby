<script>
    import { push, replace, pop } from "svelte-spa-router";
    import { onMount } from "svelte";
    onMount(async () => {
        console.log("params force reload : popping ");
        pop();
    });
</script>

<div>popping</div>
