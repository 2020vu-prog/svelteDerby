<script>
    import log from "loglevel";

    import { tick } from 'svelte';

    import { driverMap, pushMessage, racePhaseMap, nextOnBlockKey, mp3Playing, spotifyLoggedIn } from "./stores.js";
    import { persistable } from "./storedb.js";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { sleep } from "./utils.js";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";
    import SpotifyApi from "./SpotifyApi.svelte";
    import SpotifyDeviceSelection from "./SpotifyDeviceSelection.svelte";
    //let href='https://open.spotify.com/track/2DnJjbjNTV9Nd5NOa1KGba?si=07ae100fdc0e4f49'
    let requestedHref=''
    let playingHref=''
    let playSpotify
    let pauseSpotify
    let testTrackValue = "";
    let potentialPlayRequest = 0;
    const testTracks = [
        { label: "Back In Black", trackId: "08mG3Y1vljYA6bvDt4Wqkj" },
        { label: "You're So Vain", trackId: "2DnJjbjNTV9Nd5NOa1KGba" },
        { label: "Piano Man", trackId: "70C4NyhjD5OZUMzvWZ3njJ" },
        { label: "John Deere Green", trackId: "2ZXsvL9DO2MPv43Ay1IxgR" },
        { label: "The Chain - 2004 Remaster", trackId: "7Dm3dV3WPNdTgxoNY7YFnc" },
        { label: "Tom Sawyer", trackId: "3QZ7uX97s82HFYSmQUAN1D" },
        { label: "(Don't Fear) The Reaper", trackId: "5QTxFnGygVM4jFQiBovmRo" },
        { label: "Happytown (All Right With Me)", trackId: "5gXcmlzh6XGn5YNcabrs5x" },
        { label: "How Do You Like Me Now?!", trackId: "7rDcULv8vV16vetBjPJhuE" },
        { label: "Carlene", trackId: "339hc1FygD8oJl4kg24IjG" },
        { label: "Bitch, Don’t Kill My Vibe - International Remix / Explicit Version", trackId: "6WfA83OCEsiZ2IOTbUF4UQ" },
        { label: "Lake Shore Drive", trackId: "46MX86XQqYCZRvwPpeq4Gi" },
    ];
    $: raceDriverTracks = Object.values($driverMap || {})
        .filter((driver) => driver.wLink)
        .sort((left, right) =>
            String(left.number).localeCompare(String(right.number), undefined, { numeric: true })
        );
    let playWalkup=persistable("pref:playWalkup", false)
    $:{
        potentialPlay($nextOnBlockKey, $playWalkup, testTrackValue)
    }
    $:{
        mayToggleSpotify($mp3Playing,requestedHref)
    }

   function mayToggleSpotify(mp3Playing,requestedHref) {
            log.debug(`walkup: mayToggleSpotify hrefs [${requestedHref}] [${playingHref}]`)
        if(requestedHref!==playingHref && !mp3Playing){
            playingHref=requestedHref
        }
            log.debug(`walkup: mayToggleSpotify hreff [${requestedHref}] [${playingHref}]`)
        if(playSpotify){

            log.debug(`walkup: mayToggleSpotify 3p: ${mp3Playing}`)
            if(mp3Playing || playingHref.length==0) {
                log.debug(`walkup: mayToggleSpotify pause`)
                pauseSpotify()
            }else{
                log.debug(`walkup: mayToggleSpotify play`)
                playSpotify()
            }
        }
        else{
            log.debug(`walkup: mayToggleSpotify NOT playing s`)
        }
        /*
        setTimeout(()=>{
                    EmbedController.pause();
                }, 30000) 
                */
   }
    function setWalkupStatus(text, type = "error") {
        if ($playWalkup) {
            pushMessage({ key: "walkup-playback-status", text, type });
        }
    }

    async function potentialPlay(unused, playEnabled, selectedTestTrack){
        const request = ++potentialPlayRequest;
        log.debug(`walkup: potentialPlay`)
        if (selectedTestTrack) {
            requestedHref = selectedTestTrack;
            return;
        }
        if( ! $nextOnBlockKey.length>0){
            log.debug(`walkup: empty blocks`)
            requestedHref=''
            if (playEnabled) setWalkupStatus("No walk-up track requested: there is no next participant.");
            return
        }
        const nob=$racePhaseMap[$nextOnBlockKey]
        if(nob && nob.carNumbers){}
        else{
            log.debug(`walkup: empty numbers`)
            requestedHref=''
            if (playEnabled) setWalkupStatus("No walk-up track requested: the next participant has no car number.");
            return
        }

        await sleep(500)
        if (request !== potentialPlayRequest) return;

        const lane1Car=String(nob.carNumbers[0])
        const ptcpFromDexie = await db.Participant.get(
            lane1Car 
        );
        if(ptcpFromDexie && ptcpFromDexie.wLink){
            requestedHref=ptcpFromDexie.wLink
            log.debug(`walkup: hitme: ${requestedHref}`)
        }
        else{
            log.debug(`walkup: no link ${lane1Car}`)
            requestedHref=''
            if (playEnabled) setWalkupStatus(`No walk-up track requested for car ${lane1Car}.`);
        }
        

    }
</script>
<br />

<label>
    Play Walkup:
    <input class="big" type="checkbox" bind:checked={$playWalkup} />
</label>
<label>
    Test track:
    <select bind:value={testTrackValue}>
        <option value="">Next participant’s track</option>
        <optgroup label="Current race drivers">
            {#each raceDriverTracks as driver}
                <option value={driver.wLink}>
                    Car {driver.number}: {driver.name || "Unnamed driver"}
                </option>
            {/each}
        </optgroup>
        <optgroup label="Test tracks">
            {#each testTracks as track}
                <option value={track.trackId}>{track.label}</option>
            {/each}
        </optgroup>
    </select>
</label>
{#if $playWalkup && $spotifyLoggedIn}
    <SpotifyDeviceSelection readOnly={true} />
{/if}
{#if playSpotify}
<button on:click={playSpotify}>Play</button>
<button on:click={pauseSpotify}>Pause</button>
{/if}

{#if playingHref && $playWalkup}
    {#key playingHref}
    {#if $spotifyLoggedIn}
        <SpotifyApi 
            href={playingHref}
            bind:pplay={playSpotify}
            bind:ppause={pauseSpotify}
        />
    {:else}
        <SpotifyEmbedded
            autoPlay=false 
            href={playingHref}
            bind:pplay={playSpotify}
            bind:ppause={pauseSpotify}
        />
    {/if}
    {/key}
{/if}
