<script lang="ts">
	import aws_exports from "./aws-exports";
    import { onMount } from 'svelte';
    import SpinnerButton from "./SpinnerButton.svelte";
    import {logout, sleep} from './utils.js'
    import {
        spotifyMe,
        getSpotifyPKCE,
        logoutSpotify,
        spotifyPremiumRequiredMessage,
    } from './utils/spotify.js'
    import { spotifyLoggedIn, spotifyPremiumRequired } from './stores.js'
    export let spinning = false;
    async function loginPKCE() {
        spinning=true
        await sleep(300)
        await getSpotifyPKCE();

    }
    async function whoami() {
        const response=await spotifyMe();

        if(response&&response.display_name){
            return response.display_name
        }
    }
</script>
<style>
    .premiumRequired {
        background: #fff0f0;
        border: 4px solid #d00000;
        color: #9b0000;
        font-size: 1.25rem;
        font-weight: bold;
        padding: 1.25rem;
    }
</style>
<br/>
<h4>Spotify</h4>
{#if $spotifyLoggedIn}
{#if $spotifyPremiumRequired}
<p class="premiumRequired">
    {spotifyPremiumRequiredMessage}
</p>
{/if}
<SpinnerButton on:click={logoutSpotify} >
Logout spotify 
    
    {#await whoami()}
        spinner
    {:then value}
        [{value}]
    {/await}

</SpinnerButton>

{:else}
<SpinnerButton on:click={loginPKCE} >
    Login Spotify
</SpinnerButton>
{/if}
