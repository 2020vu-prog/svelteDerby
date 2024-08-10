<script>
    import log from "loglevel";

    import { tick } from 'svelte';

    import { racePhaseMap, nextOnBlockKey, raceConfig, statusMessage } from "./stores.js";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { sleep } from "./utils.js";
    import Spotify from "./Spotify.svelte";
    let href=''
    let playSpotify
    let pauseSpotify
    $:{
        potentialPlay($nextOnBlockKey)
    }
    $:{
        if(playSpotify){
            playSpotify()
        }
    }
    async function potentialPlay(unused){
        log.debug(`potentialPlay`)
        if( ! $nextOnBlockKey.length>0){
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
            href=ptcpFromDexie.wLink
        }
        

    }
</script>
{#if href}
    {#key href}
        <Spotify 
            autoPlay=false 
            href={href}
            bind:pplay={playSpotify}
            bind:ppause={pauseSpotify}
        />
    {/key}
{/if}
