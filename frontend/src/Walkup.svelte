<script>
    import log from "loglevel";

    import { tick } from 'svelte';

    import { racePhaseMap, nextOnBlockKey, mp3Playing } from "./stores.js";
    import { persistable } from "./storedb.js";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { sleep } from "./utils.js";
    import Spotify from "./Spotify.svelte";
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
            log.debug(`walkup: mayToggleSpotify [${requestedHref}] [${playingHref}]`)
        if(requestedHref!==playingHref && !mp3Playing){
            playingHref=requestedHref
        }
        if(playSpotify){

            log.debug(`walkup: mayToggleSpotify ${mp3Playing}`)
            if(mp3Playing) {
                pauseSpotify()
            }else{
                playSpotify()
            }
        }
        else{
            log.debug(`walkup: mayToggleSpotify NOT`)
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
            requestedHref=''
            return
        }
        const nob=$racePhaseMap[$nextOnBlockKey]
        if(nob && nob.carNumbers){}
        else{
            return
        }

        await sleep(500)

        const lane1Car=String(nob.carNumbers[0])
        const ptcpFromDexie = await db.Participant.get(
            lane1Car 
        );
        if(ptcpFromDexie && ptcpFromDexie.wLink){
            requestedHref=ptcpFromDexie.wLink
        }
        

    }
</script>
<br />

<label>
    Play Walkup:&nbsp;&nbsp;
    <input class="big" type="checkbox" bind:checked={$playWalkup} />
</label>
{#if playSpotify}
<button on:click={playSpotify}>Play</button>
<button on:click={pauseSpotify}>Pause</button>
{/if}
{#if playingHref && $playWalkup}
    {#key playingHref}
        <Spotify 
            autoPlay=false 
            href={playingHref}
            bind:pplay={playSpotify}
            bind:ppause={pauseSpotify}
        />
    {/key}
{/if}
