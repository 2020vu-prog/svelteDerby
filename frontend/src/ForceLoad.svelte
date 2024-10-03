<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import log from "loglevel";
    import {
        carouselList,
        carouselRun,
        customToolbarList,
        getDefaultToolbarList,
        pushMessage,
    } from "./stores.js";
    import { safeGetAt, sleep } from "./utils.js";
    import { onMount } from "svelte";
    import { replace, push, pop, location } from "svelte-spa-router";
    export let params = {};
    import { db } from "./eventDb.js";
    import { tick } from "svelte";

    var wip = [];
    var start;
    var end;
    onMount(async () => {
        const b64route = params.b64route;
        log.debug("ForceLoad mounted : ", $location, params);
        if (b64route) {
            log.debug("ForceLoad b64route: ", $location, b64route);
            //await sleep(100);
            await tick();
            replace(atob(b64route)); //ChartDetail repaint won't detect
        }
    });
</script>

<h1>LOADING!</h1>
