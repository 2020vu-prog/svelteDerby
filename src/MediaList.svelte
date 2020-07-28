<script>
    import { doRefreshBlocks } from "./stores.js";
    import { isEmailAllowedRoutePath, getUserEmail } from "./utils.js";
    import { onMount } from "svelte";
    import { raceConfig, statusMessage } from "./stores.js";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { tick } from "svelte";

    var mediaList = [];
    var selectedVideo;
    onMount(async () => {
        mediaList = await listMedia();
    });
    async function listMedia() {
        //console.log(`listMedia: ${dbName} ${dbKey}`);
        console.log(`listMedia: `);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
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
    <p />

    {#each mediaList as mediaItem}
        <div class="panel panel-info" on:click={() => playMedia(mediaItem)}>
            {mediaItem}
        </div>
    {/each}
</div>
