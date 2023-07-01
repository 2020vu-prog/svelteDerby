<script>
    import log from "loglevel";

    import { signIn, loginFormState } from "./stores/auth.js";
    import { createEventDispatcher } from "svelte";
    import { beginAnonymousLogin } from "./stores.js";
    import { logout } from "./utils.js";

    export let display;

    const dispatch = createEventDispatcher();

    async function performAnonymousLogin() {
        console.log("AAlogin Begin");
        logout();
        $loginFormState.username = "Anonymous";
        $loginFormState.password = "DERBYderby12345!";
        $beginAnonymousLogin = false;
        try {
            await signIn();
            log.debug("AAlogin complete");
            console.log("AAlogin complete");
            dispatch("loginComplete");
        } catch (e) {
            console.log("AAlogin failed:", e);
        }
    }

    $: {
        if ($beginAnonymousLogin) {
            performAnonymousLogin();
        }
    }
</script>

{#if display != "false"}
    <button on:click={() => performAnonymousLogin()}>Login Anonymously</button>
{/if}
