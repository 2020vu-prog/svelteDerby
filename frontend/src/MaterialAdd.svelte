<script>
    import log from "loglevel";

    import { push, pop, replace } from "svelte-spa-router";
    import { raceConfig, roleMap, theme, userEmail } from "./stores.js";
    import { isAllowedRoutePath } from "./utils.js";

    export let clickHandleRoute;
    export let overrideOrgIz; //allow null.  this is an override

    var userHasPermission = false;
    let permissionRequest = 0;

    const chFunction = () => {
        push(clickHandleRoute);
    };

    $: refreshPermission(
        clickHandleRoute,
        overrideOrgIz,
        $userEmail,
        $roleMap,
        $raceConfig.orgIz
    );

    async function refreshPermission() {
        const requestId = ++permissionRequest;
        const allowed = await isAllowedRoutePath(clickHandleRoute, overrideOrgIz);
        if (requestId === permissionRequest) {
            userHasPermission = allowed;
        }
    }
</script>

<style>
    .fab {
        width: 1.5em;
        height: 1.5em;
        border-radius: 50%;
        box-shadow: 0 6px 10px 0 #666;
        transition: all 0.1s ease-in-out;

        font-size: 6vh;
        color: white;
        text-align: center;
        line-height: 1.5em;

        position: fixed;
        right: 25px;
        bottom: 80px;

        z-index: 99;

        display: flex;
        align-items: center;
        justify-content: center;
    }

    .fab img {
        width: 0.9em;
        height: 0.9em;
        display: block;
    }

    .fab:hover {
        box-shadow: 0 6px 14px 0 #666;
        transform: scale(1.05);
    }
</style>

{#if userHasPermission}
    <div class="fab" style="background-color: {$theme}" on:click={chFunction}>
        <img src="plus-solid.svg">
    </div>
{/if}
