<script>
    import { push } from "svelte-spa-router";
    import { theme } from "./stores.js";

    export let clickHandleRoute;

    const chFunction = () => {
        push(clickHandleRoute);
    };
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

<div class="fab" style="background-color: {$theme}" on:click={chFunction}>
    <img src="plus-solid.svg" />
</div>
