
<script lang="ts">
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import log from "loglevel";
    import {spotifyPlay} from './utils/spotify.js'
        export let href;
    //export let autoPlay=false;
    export const ppause = () => {
        spotifyPlay(href,false,false)
        console.log("SpotifyAPI pause child");
    }

    export const pplay = () => {
        spotifyPlay(href,true,false)
        console.log("SpotifyAPI play child");
    }
    $:{
        console.log(`SpotifyAPI ${href}`)
    }

	onMount(() => {
        			console.log('SpotifyAPI mount');
        spotifyPlay(href,true,false)
		const interval = setTimeout(() => {
            spotifyPlay(href,false,false)
			console.log('SpotifyAPI beep');
		}, 10000);

		return () => clearTimeout(interval);
	});
</script>
SPOTIFY API
