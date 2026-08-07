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
    let testTrackHref = "";
    let potentialPlayRequest = 0;
    const testTracks = [
        { label: "Back In Black", href: "https://open.spotify.com/track/08mG3Y1vljYA6bvDt4Wqkj?si=a2f3f0d6d08b4a35" },
        { label: "You're So Vain", href: "https://open.spotify.com/track/2DnJjbjNTV9Nd5NOa1KGba?si=07ae100fdc0e4f49" },
        { label: "Piano Man", href: "https://open.spotify.com/track/70C4NyhjD5OZUMzvWZ3njJ?si=cf36bf7d9f48402c" },
        { label: "John Deere Green", href: "https://open.spotify.com/track/2ZXsvL9DO2MPv43Ay1IxgR?si=f3142885f0294713" },
        { label: "The Chain - 2004 Remaster", href: "https://open.spotify.com/track/7Dm3dV3WPNdTgxoNY7YFnc?si=2f9231fdf0c54aa3" },
        { label: "Tom Sawyer", href: "https://open.spotify.com/track/3QZ7uX97s82HFYSmQUAN1D?si=5924eb6266154ba6" },
        { label: "(Don't Fear) The Reaper", href: "https://open.spotify.com/track/5QTxFnGygVM4jFQiBovmRo?si=dd490c9d287a428c" },
        { label: "Happytown (All Right With Me)", href: "https://open.spotify.com/track/5gXcmlzh6XGn5YNcabrs5x?si=d3ecbcbc0dc548a0" },
        { label: "How Do You Like Me Now?!", href: "https://open.spotify.com/track/7rDcULv8vV16vetBjPJhuE?si=6c3c0882ae1a401d" },
        { label: "Carlene", href: "https://open.spotify.com/track/339hc1FygD8oJl4kg24IjG?si=91ea35a5553f4cd6" },
    ];
    $: raceDriverTracks = Object.values($driverMap || {})
        .filter((driver) => driver.wLink)
        .sort((left, right) =>
            String(left.number).localeCompare(String(right.number), undefined, { numeric: true })
        );
    let playWalkup=persistable("pref:playWalkup", false)
    $:{
        potentialPlay($nextOnBlockKey, $playWalkup, testTrackHref)
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
    <select bind:value={testTrackHref}>
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
                <option value={track.href}>{track.label}</option>
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
