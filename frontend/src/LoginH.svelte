<script lang="ts">
    import aws_exports from "./aws-config";
    import SpinnerButton from "./SpinnerButton.svelte";
    import LoginSpotify from "./LoginSpotify.svelte";
    import { logout, sleep } from "./utils.js";
    import { beginCognitoLogin, cognitoLogout } from "./utilHosted.js";
    import {
        developerMode,
        nowDate,
        pushMessage,
        userAuthTime,
        userEmail,
        userId,
    } from "./stores.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    interface CognitoHostedConfig {
        aws_user_pools_hosted_client_id: string;
        hosted_url: string;
    }

    const cognitoConfig = aws_exports as CognitoHostedConfig;
    const entityFactory = new EntityFactory({});
    let redirecting: boolean = false;
    $: emailHash = $userEmail ? entityFactory.getHashFromEmail($userEmail) : "";

    function hostedLogoutUrl(): string {
        const u = new URL(document.URL);
        const clientId = `client_id=${cognitoConfig.aws_user_pools_hosted_client_id}`;
        const encodedRedir = encodeURIComponent(`${u.origin}/`);
        return `${cognitoConfig.hosted_url}/logout?${clientId}&logout_uri=${encodedRedir}`;
    }
    const logoutUrl = hostedLogoutUrl();
    function loginAge(authTime: number, now: Date): string {
        const elapsedDays = Math.max(
            0,
            Math.floor((now.getTime() / 1000 - authTime) / 86400)
        );
        if (elapsedDays === 0) return "today";
        if (elapsedDays === 1) return "1 day ago";
        return `${elapsedDays} days ago`;
    }
    async function clickedLogout(): Promise<void> {
        redirecting = true;
        logout();
        cognitoLogout();
        await sleep(300);
        window.location.href = logoutUrl;
    }
    async function clickedLogin(): Promise<void> {
        redirecting = true;
        try {
            await beginCognitoLogin();
        } catch (error) {
            redirecting = false;
            pushMessage({
                text: "Unable to start login. Please try again.",
                type: "error",
            });
        }
    }
</script>
{#if redirecting}
    <SpinnerButton spinning>Loading</SpinnerButton>
{:else if $userEmail}
    <br />
    User: [{$userId}]
    <br />
    Email: [{$userEmail}]
    <br />
    {#if $developerMode}
        Email hash: [{emailHash}]
        <br />
    {/if}
    {#if $userAuthTime}
        Logged in: {loginAge($userAuthTime, $nowDate)}
        <br />
    {/if}
    <SpinnerButton on:click={clickedLogout}>Logout</SpinnerButton>
{:else}
    <br />
    Click below to proceed to external (Amazon/AWS) login page.
    <br />
    <SpinnerButton on:click={clickedLogin}>Login</SpinnerButton>
{/if}

{#if $developerMode}
    <br />
    <LoginSpotify />
{/if}
