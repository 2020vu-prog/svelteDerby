<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { doRefreshBlocks } from "./stores.js";
    import { hhmmssFmt, isEmailAllowedRoutePath } from "./utils.js";
    import { onMount } from "svelte";
    import { raceConfig, statusMessage, mediaFileType } from "./stores.js";
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
    var linkFrom = "";
    const SKIP_PREFIX = "_SKIP_";
    const ALL_PREFIX = "_ALL_";
    onMount(async () => {
        if (params.dbName === "RacePhase") {
            rpFromDexie = await db.RacePhase.get(params.dbKey);
            log.debug("rpFromDexie:", rpFromDexie);

            mediaList = await listAndSortMedia(getMediaPrefix(rpFromDexie));
            loadingMedia = false;
            return;
        }
        if (params.dbName === "*") {
            linkFrom = ALL_PREFIX;
            mediaList = await listAndSortMedia([ALL_PREFIX]); // get all!
            loadingMedia = false;
            return;
        }
    });
    function getMediaPrefix(racePhase) {
        const rc = [];
        if (racePhase && racePhase.phr && racePhase.phr.length) {
            //const prefixSeed = Math.min(...racePhase.phr);
            const psList = [...racePhase.phr];
            psList.sort(function (a, b) {
                return a - b;
            });
            psList
                .filter((ps) => ps > 0)
                .forEach((prefixSeed) => {
                    rc.push(
                        `${$raceConfig.orgId}/MQTT-${prefixSeed.toString()}`
                    );
                });
        }
        if (rc.length == 0) {
            rc.push(SKIP_PREFIX);
        }
        return rc;
    }
    async function listAndSortMedia(prefixSeedList) {
        const listM = [];
        for (var i = 0; i < prefixSeedList.length; i++) {
            listM.push(...(await listMedia(prefixSeedList[i], i)));
        }

        listM.sort(function (a, b) {
            return b.LastModified.localeCompare(a.LastModified);
        });
        return listM;
    }
    async function listMedia(prefixSeed, i) {
        if (!prefixSeed) {
            return [];
        }
        if (prefixSeed === SKIP_PREFIX) {
            return [];
        }
        if (prefixSeed === ALL_PREFIX) {
            prefixSeed = $raceConfig.orgId;
        }
        //log.debug(`listMedia: ${dbName} ${dbKey}`);
        log.debug(`listMedia: `);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            prefix: prefixSeed,
            iSrc: i,
        };

        axios.defaults.headers.common["Authorization"] = bearer;

        try {
            log.debug("listmedia about to", req);
            const endpoint = "/listMediaPrefix";
            const response = await axios.get($raceConfig.baseUrl + endpoint, {
                params: req,
            });
            log.debug("media:", response);
            log.debug("media:", response.data.length);
            return response.data;
        } catch (err) {
            log.debug("listmedia failed", err);
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
    function getMediaHHMMSS(mediaItem) {
        log.debug("LMOD:", mediaItem.LastModified);
        log.debug("LMOD parsed:", Date.parse(mediaItem.LastModified));
        return hhmmssFmt(Date.parse(mediaItem.LastModified));
    }
    function getDisplayName(key) {
        if (linkFrom == ALL_PREFIX) {
            return key;
        } else {
            return key.replace(/.*\//, "");
        }
    }
    function getMediaItems(mediaList) {
        return mediaList.filter((item) => shouldDisplayMediaItem(item));
    }
    function shouldDisplayMediaItem(item) {
        //return true;
        if (!$mediaFileType) return true;

        const lcType = $mediaFileType.toString().toLowerCase();

        const lcKey = item.Key.toLowerCase();
        return lcKey.endsWith(lcType) || lcKey.endsWith("mp3");
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
            {#each getMediaItems(mediaList) as mediaItem (mediaItem.Key)}
                <div
                    class="panel panel-info"
                    on:click={() => playMedia(mediaItem.Key)}>
                    {getDisplayName(mediaItem.Key)}
                    <p />
                    {getMediaHHMMSS(mediaItem)}
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
