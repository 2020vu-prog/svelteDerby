<script>
    import { push, pop, replace } from 'svelte-spa-router'
    import { theme } from './stores.js'
    //export let permission;
    export let clickHandleRoute;

    const chFunction = () => { push(clickHandleRoute) };
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
        right: 50px;
        bottom: 50px;

        z-index: 99;
    }

    .fab:hover {
        box-shadow: 0 6px 14px 0 #666;
        transform: scale(1.05);
    }
</style>

<div class="fab" style="background-color: {$theme};" on:click={chFunction}> + </div>