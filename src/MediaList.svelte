<script>
    import { doRefreshBlocks } from "./stores.js";
    import { isEmailAllowedRoutePath, getUserEmail } from "./utils.js";
    import { onMount } from "svelte";
    import { raceConfig, statusMessage } from "./stores.js";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { tick } from "svelte";
    import { db } from "./eventDb.js";

    export let params = {};

    var rpFromDexie;
    var mediaList = [];
    var selectedVideo;
    const SKIP_PREFIX = "_SKIP_";
    const ALL_PREFIX = "_ALL_";
    onMount(async () => {
        if (params.dbName === "RacePhase") {
            rpFromDexie = await db.RacePhase.get(params.dbKey);
            console.log("rpFromDexie:", rpFromDexie);

            mediaList = await listMedia(getMediaPrefix(rpFromDexie));
            return;
        }
        if (params.dbName === "*") {
            mediaList = await listMedia(ALL_PREFIX); // get all!
            return;
        }
    });
    function getMediaPrefix(racePhase) {
        if (racePhase && racePhase.phr && racePhase.phr.length) {
            const prefixSeed = Math.min(...racePhase.phr);
            if (prefixSeed > 0) {
                return "MQTT-" + prefixSeed.toString();
            }
        }
        return SKIP_PREFIX;
    }
    async function listMedia(prefixSeed) {
        if (!prefixSeed) {
            return [];
        }
        if (prefixSeed === SKIP_PREFIX) {
            return [];
        }
        if (prefixSeed === ALL_PREFIX) {
            prefixSeed = "";
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
        if (key.toString().endsWith(".mp3"))
            new Audio(getMediaHref(key)).play();
        else {
            //document.location = getMediaHref(key);
            selectedVideo = null;
            await tick();

            selectedVideo = getMediaHref(key);
        }
    }
    function getMediaHref(key) {
        return `/${key}`;
    }
</script>

<div>
    <h4>Media List</h4>

    {#if selectedVideo}
        <video width="320" height="240" autoplay controls>
            <source src={selectedVideo} type="video/mp4" />
            Your browser does not support the video tag.
        </video>
    {/if}
    {#if mediaList}
        <p />
        {#if mediaList.length == 0}
            <b>No Matches yet</b>
        {:else}
            {#each mediaList as mediaItem}
                <div
                    class="panel panel-info"
                    on:click={() => playMedia(mediaItem)}>
                    {mediaItem}
                </div>
            {/each}
        {/if}
    {:else}
        <b>No Media found</b>
    {/if}

</div>
