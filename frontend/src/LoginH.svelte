<script lang="ts">
    import aws_exports from "./aws-config";
    import SpinnerButton from "./SpinnerButton.svelte";
    import LoginSpotify from "./LoginSpotify.svelte";
    import { logout, sleep } from "./utils.js";
    import {
        beginCognitoLogin,
        developerMode,
        pushMessage,
        userExpCountDownSecs,
        userEmail,
        userId,
    } from "./stores.js";

    interface CognitoHostedConfig {
        aws_user_pools_hosted_client_id: string;
        hosted_url: string;
    }

    const cognitoConfig = aws_exports as CognitoHostedConfig;
    let redirecting: boolean = false;

    function hostedLogin(): { logoutUrl: string } {
        const u = new URL(document.URL);
        const clientId = `client_id=${cognitoConfig.aws_user_pools_hosted_client_id}`;
        const encodedRedir = encodeURIComponent(`${u.origin}/`);
        const logoutUrl = `${cognitoConfig.hosted_url}/logout?${clientId}&logout_uri=${encodedRedir}`;
        return { logoutUrl };
    }
    const { logoutUrl } = hostedLogin();
    function m60(x: number): [number, number] {
        const modx = x % 60;
        const remx = Math.floor(x / 60);
        return [remx, modx];
    }

    function hhmmss(secs: number): string {
        const [fatMM, ss] = m60(secs);
        const [hh, mm] = m60(fatMM);
        //return `[${secs}] ` + hh + ":" + mm + ":" + ss + "__" +
        return (
            "" +
            ("0" + hh).slice(-2) +
            ":" +
            ("0" + mm).slice(-2) +
            ":" +
            ("0" + ss).slice(-2)
        );
    }
    async function clickedLogout(): Promise<void> {
        redirecting = true;
        await logout();
        await sleep(300);
        window.location.href = logoutUrl;
    }
    async function clickedLogin(): Promise<void> {
        redirecting = true;
        await beginCognitoLogin();
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
    Token expiration: {hhmmss($userExpCountDownSecs)}
    <br />
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
