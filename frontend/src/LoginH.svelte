<script lang="ts">
    import aws_exports from "./aws-config";
    import SpinnerButton from "./SpinnerButton.svelte";
    import LoginSpotify from "./LoginSpotify.svelte";
    import { logout, sleep } from "./utils.js";
    import {
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

    function hostedLogin(): { loginUrl: string; logoutUrl: string } {
        const u = new URL(document.URL);
        console.log(`Twiddle qul:`, u);
        const clientId = `client_id=${cognitoConfig.aws_user_pools_hosted_client_id}`;
        const encodedRedir = encodeURIComponent(`${u.origin}/`);
        const redir = `redirect_uri=${encodedRedir}`;
        //loginUrl = `https://cf-test-rr1-us.auth.us-east-2.amazoncognito.com/oauth2/authorize?${clientId}&response_type=token&scope=email+openid+phone&${redir}`
        const loginUrl = `${cognitoConfig.hosted_url}/oauth2/authorize?${clientId}&response_type=token&scope=email+openid+phone&${redir}`;
        const logoutUrl = `${cognitoConfig.hosted_url}/logout?${clientId}&logout_uri=${encodedRedir}`;
        const regex = /\/+/gi;

        console.log("login1:", loginUrl);
        // loginUrl =loginUrl.replaceAll(regex,"/");
        console.log("login2:", loginUrl);
        console.log("login debug:", document.URL);

        return { loginUrl, logoutUrl };
    }
    const { loginUrl, logoutUrl } = hostedLogin();
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
        logout();
        await sleep(300);
        window.location.href = logoutUrl;
    }
    async function clickedLogin(): Promise<void> {
        redirecting = true;
        await sleep(300);
        window.location.href = loginUrl;
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
    <br />
    User information was reset (deleted) for all userids on this site on
    <strong> June 21, 2024 </strong>
    <br />
    If you had a user/password that was created before then, you will need to SIGN
    UP again using the SAME email address.
{/if}

{#if $developerMode}
    <br />
    <LoginSpotify />
{/if}
