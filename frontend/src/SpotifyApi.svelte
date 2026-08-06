
<script lang="ts">
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import log from "loglevel";
    import {spotifyActiveDeviceId, spotifyPlay} from './utils/spotify.js'
    export let href;
    let deviceId;
    let deviceLookup;

    const getWalkupDevice = async () => {
        if (deviceId) return deviceId;
        if (!deviceLookup) deviceLookup = spotifyActiveDeviceId();
        deviceId = await deviceLookup;
        return deviceId;
    };

    //export let autoPlay=false;
    export const ppause = async () => {
        const targetDeviceId = await getWalkupDevice();
        if (targetDeviceId) await spotifyPlay(href,false,false,targetDeviceId)
        console.log("SpotifyAPI pause child");
    }

    export const pplay = async () => {
        const targetDeviceId = await getWalkupDevice();
        if (targetDeviceId) await spotifyPlay(href,true,false,targetDeviceId)
        console.log("SpotifyAPI play child");
    }
    $:{
        console.log(`SpotifyAPI ${href}`)
    }

	onMount(() => {
        			console.log('SpotifyAPI mount');
		let interval;
		let destroyed = false;

		(async () => {
			const targetDeviceId = await getWalkupDevice();
			if (!targetDeviceId || destroyed) return;
			await spotifyPlay(href,true,false,targetDeviceId);
			interval = setTimeout(async () => {
                await spotifyPlay(href,false,false,targetDeviceId)
				console.log('SpotifyAPI beep');
			}, 10000);
		})();

		return () => {
			destroyed = true;
			if (interval) clearTimeout(interval);
		};
	});
</script>
SPOTIFY API
