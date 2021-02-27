<script>
    import log from "loglevel";

    import { push, pop, replace } from "svelte-spa-router";
    import { theme, userEmail } from "./stores.js";
    import { isEmailAllowedRoutePath } from "./utils.js";
    import { onMount } from "svelte";

    export let clickHandleRoute;

    var userHasPermission = false;

    const chFunction = () => {
        push(clickHandleRoute);
    };
    onMount(async () => {
        userHasPermission = await isEmailAllowedRoutePath(
            $userEmail,
            clickHandleRoute
        );
    });
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
    }

    .fab:hover {
        box-shadow: 0 6px 14px 0 #666;
        transform: scale(1.05);
    }
</style>

{#if userHasPermission}
    <div class="fab" style="background-color: {$theme};" on:click={chFunction}>
        +
    </div>
{/if}
