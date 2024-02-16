<script lang="ts">
    import Dexie from 'dexie';
	import aws_exports from "./aws-exports";
    import { onMount } from 'svelte';
    import {
        backendHost,
        axios,
        dbChangeTime,
        statusMessage,
        userExpCountDownSecs,
	userEmail
    } from './stores.js'
    let loginUrl = "http://www.google.com"
    onMount(async () => {
        hostedLogin()
    }
    );
    function hostedLogin() {
        const u = new URL(document.URL)
        console.log(`Twiddle qul:`, u)
        const clientId = `client_id=${aws_exports.aws_user_pools_hosted_client_id}`
        const encodedRedir = encodeURIComponent(`${u.origin}/`);
        const redir = `redirect_uri=${encodedRedir}`
        //loginUrl = `https://cf-test-rr1-us.auth.us-east-2.amazoncognito.com/oauth2/authorize?${clientId}&response_type=token&scope=email+openid+phone&${redir}`
        loginUrl = `${aws_exports.hosted_url}/oauth2/authorize?${clientId}&response_type=token&scope=email+openid+phone&${redir}`
const regex = /\/+/gi;

        console.log("login1:", loginUrl)
	// loginUrl =loginUrl.replaceAll(regex,"/");
        console.log("login2:", loginUrl)
        console.log("login debug:", document.URL)

    }
    function m60(x) {
        const modx = x % 60;
        const remx = Math.floor(x / 60);
        return [remx, modx];
    }

    function hhmmss(secs) {
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
</script>
Login
{#if $userEmail }
<br />
User: [{$userEmail}]
{hhmmss($userExpCountDownSecs)}
{/if}
<br />
Click <a href={loginUrl}>here</a> to proceed to external login page.
<br />
