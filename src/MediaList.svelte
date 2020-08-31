<script>
    import SpinnerButton from "./SpinnerButton.svelte";
    import { doRefreshBlocks } from "./stores.js";
    import { isEmailAllowedRoutePath } from "./utils.js";
    import { onMount } from "svelte";
    import { raceConfig, statusMessage } from "./stores.js";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { tick } from "svelte";
    import { db } from "./eventDb.js";

    export let params = {};

    var loadingMedia = true;
    var rpFromDexie;
    var mediaList = [];
    var selectedVideo;
    var selectedAudio;
    const SKIP_PREFIX = "_SKIP_";
    const ALL_PREFIX = "_ALL_";
    onMount(async () => {
        if (params.dbName === "RacePhase") {
            rpFromDexie = await db.RacePhase.get(params.dbKey);
            console.log("rpFromDexie:", rpFromDexie);

            mediaList = await listAndSortMedia(getMediaPrefix(rpFromDexie));
            loadingMedia = false;
            return;
        }
        if (params.dbName === "*") {
            mediaList = await listAndSortMedia(ALL_PREFIX); // get all!
            loadingMedia = false;
            return;
        }
    });
    function getMediaPrefix(racePhase) {
        if (racePhase && racePhase.phr && racePhase.phr.length) {
            const prefixSeed = Math.min(...racePhase.phr);
            if (prefixSeed > 0) {
                return `${$raceConfig.orgId}/MQTT-${prefixSeed.toString()}`;
            }
        }
        return SKIP_PREFIX;
    }
    async function listAndSortMedia(prefixSeed) {
        const listM = await listMedia(prefixSeed);
        listM.sort(function (a, b) {
            return b.LastModified.localeCompare(a.LastModified);
        });
        return listM;
    }
    async function listMedia(prefixSeed) {
        if (!prefixSeed) {
            return [];
        }
        if (prefixSeed === SKIP_PREFIX) {
            return [];
        }
        if (prefixSeed === ALL_PREFIX) {
            //prefixSeed = "";
            prefixSeed = $raceConfig.orgId;
        }
        //console.log(`listMedia: ${dbName} ${dbKey}`);
        console.log(`listMedia: `);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            prefix: prefixSeed,
        };

        axios.defaults.headers.common["Authorization"] = bearer;

        try {
            console.log("listmedia about to", req);
            const endpoint = "/listMediaPrefix";
            const response = await axios.get($raceConfig.baseUrl + endpoint, {
                params: req,
            });
            console.log("media:", response);
            console.log("media:", response.data.length);
            return response.data;
        } catch (err) {
            console.log("listmedia failed", err);
        }
        return [];
    }
    async function playMedia(key) {
        selectedVideo = null;
        selectedAudio = null;
        await tick();
        if (key.toString().endsWith(".mp3"))
            //new Audio(getMediaHref(key)).play();
            selectedAudio = key;
        else {
            //document.location = getMediaHref(key);

            selectedVideo = key;
        }
    }
    function getMediaHref(key) {
        return `/${key}`;
    }
</script>

<div>
    <h4>Media List</h4>
    {#if loadingMedia}
        <SpinnerButton spinning={loadingMedia}>Loading</SpinnerButton>
    {/if}

    {#if mediaList}
        <p />
        {#if mediaList.length == 0}
            <b>No Matches yet</b>
        {:else}
            {#each mediaList as mediaItem}
                <div
                    class="panel panel-info"
                    on:click={() => playMedia(mediaItem.Key)}>
                    {mediaItem.Key}
                    <p />
                    {mediaItem.LastModified}
                    {#if selectedVideo === mediaItem.Key}
                        <video width="320" height="240" autoplay controls>
                            <source
                                src={getMediaHref(selectedVideo)}
                                type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    {/if}
                    {#if selectedAudio === mediaItem.Key}
                        <audio controls>
                            <source
                                src={getMediaHref(selectedAudio)}
                                type="audio/mpeg" />
                            Your browser does not support the audio element.
                        </audio>
                    {/if}

                </div>
            {/each}
        {/if}
    {:else}
        <b>No Media found</b>
    {/if}

</div>
