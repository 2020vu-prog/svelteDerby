<script>
    import log from "loglevel";

    import { signIn, loginFormState } from "./stores/auth.js";
    import { createEventDispatcher } from "svelte";
    import { beginAnonymousLogin } from "./stores.js";
    import { logout } from "./utils.js";

    export let display;

    const dispatch = createEventDispatcher();

    const performAnonymousLogin = () => {
        logout();
        $loginFormState.username = "Anonymous";
        $loginFormState.password = "DERBYderby12345!";
        $beginAnonymousLogin = false;
        let promise = signIn().then(() => {
            log.debug("login complete");
            dispatch("loginComplete");
        });
    };
    $: {
        if ($beginAnonymousLogin) {
            performAnonymousLogin();
        }
    }
</script>

{#if display != 'false'}
    <button on:click={() => performAnonymousLogin()}>Login Anonymously</button>
{/if}
