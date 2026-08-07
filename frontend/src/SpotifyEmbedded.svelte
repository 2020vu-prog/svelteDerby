<script>
    import { onMount } from "svelte";
    import { onDestroy } from "svelte";
    import log from "loglevel";
    import { spotifyApiReady} from "./stores.js";
    let isMounted=false
    let gController=""
    let iframeElement
    export let href;
    export let autoPlay=false;

    function spotifyEmbedUri(value) {
        value = value?.trim();
        if (!value || value.startsWith("spotify:")) return value;
        if (/^[A-Za-z0-9]{22}$/.test(value)) return `spotify:track:${value}`;
        try {
            const url = new URL(value);
            const [, type, id] = url.pathname.split("/");
            if (type && id) return `spotify:${type}:${id}`;
        } catch (error) {
            log.warn("Invalid Spotify embed URL", value);
        }
        return value;
    }

    function spotifyEmbedUrl(value) {
        value = value?.trim();
        if (/^[A-Za-z0-9]{22}$/.test(value)) {
            return `https://open.spotify.com/track/${value}`;
        }
        if (value?.startsWith("spotify:track:")) {
            return `https://open.spotify.com/track/${value.slice("spotify:track:".length)}`;
        }
        return value;
    }
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
    $: if (gController && href) {
        gController.loadUri(spotifyEmbedUri(href));
    }


    function doSpotifyInit(){
            if (gController || !iframeElement) return;
            log.info("mounting",iframeElement);
            let options = {
                uri: spotifyEmbedUri(href)
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
                log.info("called",href);
            };
            $spotifyApiReady.createController(iframeElement, options, callback);


    }
</script>
<svelte:head>
    <script 
        src="https://open.spotify.com/embed/iframe-api/v1" 
    ></script>
</svelte:head>

<iframe bind:this={iframeElement} style="border-radius:12px" src={spotifyEmbedUrl(href)} width="100%" height="352" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
