<script lang="ts">
	import aws_exports from "./aws-exports";
    import { onMount } from 'svelte';
    import SpinnerButton from "./SpinnerButton.svelte";
    import {logout, sleep} from './utils.js'
    import {getSpotifyPKCE, spotifyPlay,logoutSpotify,isLoggedInSpotify} from './utils/spotify.js'
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
</script>
{#if isLoggedInSpotify()}
<SpinnerButton on:click={logoutSpotify} >
Logout spotify
</SpinnerButton>

{:else}
<SpinnerButton on:click={loginPKCE} >
    Login Spotify
</SpinnerButton>
{/if}
