<script>
    import log from "loglevel";

    import { tick } from 'svelte';

    import { racePhaseMap, nextOnBlockKey, mp3Playing, spotifyLoggedIn } from "./stores.js";
    import { persistable } from "./storedb.js";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { sleep } from "./utils.js";
    import SpotifyEmbedded from "./SpotifyEmbedded.svelte";
    import SpotifyApi from "./SpotifyApi.svelte";
    //let href='https://open.spotify.com/track/2DnJjbjNTV9Nd5NOa1KGba?si=07ae100fdc0e4f49'
    let requestedHref=''
    let playingHref=''
    let playSpotify
    let pauseSpotify
    let playWalkup=persistable("pref:playWalkup", false)
    $:{
        potentialPlay($nextOnBlockKey)
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
    async function potentialPlay(unused){
        log.debug(`walkup: potentialPlay`)
        if( ! $nextOnBlockKey.length>0){
            log.debug(`walkup: empty blocks`)
            requestedHref=''
            return
        }
        const nob=$racePhaseMap[$nextOnBlockKey]
        if(nob && nob.carNumbers){}
        else{
            log.debug(`walkup: empty numbers`)
            return
        }

        await sleep(500)

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
        }
        

    }
</script>
<br />

<label>
    Play Walkup:
    <input class="big" type="checkbox" bind:checked={$playWalkup} />
</label>
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
