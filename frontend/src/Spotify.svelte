<script>
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import log from "loglevel";
    import { spotifyApiReady} from "./stores.js";
    import { createEventDispatcher } from 'svelte'
  const dispatch = createEventDispatcher()
    let spotifyLoaded=true
    let isMounted=false
    let gController=""
    export let href;
    export let autoPlay=false;
    export const ppause = () => {
        if(gController){
                gController.pause()
        }
        console.log("spotify pause child");
    }

    export const pplay = () => {
        if(gController){
                gController.play()
        }
        console.log("spotify play child");
    }

    onMount(async () => {
        log.info("mounting");
        isMounted=true


                log.info("onMount spotifyApiReady",$spotifyApiReady);
        if(! $spotifyApiReady){
            
            window.onSpotifyIframeApiReady = (IFrameAPI) => {
                $spotifyApiReady=IFrameAPI 
            }
        }
    
    });
    onDestroy(() => {
            log.debug("onDestroy ");
            if(gController){
                gController.destroy()
            }
    });
    $:{
        if(isMounted&& $spotifyApiReady){
            doSpotifyInit()
        }
    }


    function doSpotifyInit(){

            let element = document.getElementById('embed-iframe');
            log.info("mounting",element);
            let options = {
                uri: 'spotify:episode:7makk4oTQel546B0PZlDM5'
            };
            let callback = (EmbedController) => {
                gController=EmbedController
                log.info("EmbedController",EmbedController);
                EmbedController.addListener('playback_update', e => {
            //log.info("listener:",e);
                });

                if(autoPlay){
                    EmbedController.play();
                }
                //EmbedController.loadUri('spotify:episode:7makk4oTQel546B0PZlDM5');
                const bib='https://open.spotify.com/track/08mG3Y1vljYA6bvDt4Wqkj?si=a2f3f0d6d08b4a35'
                const vain="https://open.spotify.com/track/2DnJjbjNTV9Nd5NOa1KGba?si=07ae100fdc0e4f49"
                const piano='https://open.spotify.com/track/70C4NyhjD5OZUMzvWZ3njJ?si=cf36bf7d9f48402c'
                const jdg='https://open.spotify.com/track/2ZXsvL9DO2MPv43Ay1IxgR?si=f3142885f0294713'
                const chain='https://open.spotify.com/track/7Dm3dV3WPNdTgxoNY7YFnc?si=2f9231fdf0c54aa3'
                const rush='https://open.spotify.com/track/3QZ7uX97s82HFYSmQUAN1D?si=5924eb6266154ba6'
                const reaper='https://open.spotify.com/track/5QTxFnGygVM4jFQiBovmRo?si=dd490c9d287a428c'
                const happy='https://open.spotify.com/track/5gXcmlzh6XGn5YNcabrs5x?si=d3ecbcbc0dc548a0'
                const lmn='https://open.spotify.com/track/7rDcULv8vV16vetBjPJhuE?si=6c3c0882ae1a401d'
                const carlene='https://open.spotify.com/track/339hc1FygD8oJl4kg24IjG?si=91ea35a5553f4cd6'
                let go=''
                go=vain
                go=piano
                go=chain
                go=rush
                go=reaper
                go=bib
                go=jdg
                go=happy
                go=lmn
                go=carlene
                go=href
                EmbedController.loadUri(go);





                log.info("called",go);
            };
            //IFrameAPI.createController(element, options, callback);
            $spotifyApiReady.createController(element, options, callback);


    }
</script>
<svelte:head>
    <script 
        src="https://open.spotify.com/embed/iframe-api/v1" 
    ></script>
</svelte:head>

<iframe id="embed-iframe" style="border-radius:12px" src={href} width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>

