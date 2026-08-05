<script lang="ts">
	import aws_exports from "./aws-exports";
    import { onMount } from 'svelte';
    import SpinnerButton from "./SpinnerButton.svelte";
    import {logout, sleep} from './utils.js'
    import {spotifyMe, getSpotifyPKCE, spotifyPlay,logoutSpotify} from './utils/spotify.js'
    import { spotifyLoggedIn } from './stores.js'
    export let spinning = false;
    async function loginPKCE() {
        spinning=true
        await sleep(300)
        await getSpotifyPKCE();

    }
    async function clickedPlay() {
        await spotifyPlay('',true,false);
    }
    async function clickedPause() {
        await spotifyPlay('',false,false);
    }
    async function whoami() {
        const response=await spotifyMe();

        if(response&&response.display_name){
            return response.display_name
        }
    }
</script>
<br/>
<h4>Spotify</h4>
{#if $spotifyLoggedIn}
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
