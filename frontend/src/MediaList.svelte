<script>
    import log from "loglevel";

    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";

    import { faVideo } from "@fortawesome/free-solid-svg-icons/faVideo";
    import { faVolumeUp } from "@fortawesome/free-solid-svg-icons/faVolumeUp";
    import Icon from "fa-svelte";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { doRefreshBlocks } from "./stores.js";
    import { hhmmssFmt, isEmailAllowedRoutePath } from "./utils.js";
    import { onMount } from "svelte";
    import {
        axios,
        raceConfig,
        statusMessage,
        mediaFileType,
    } from "./stores.js";
    import { tick } from "svelte";
    import { db } from "./eventDb.js";
    import MediaViewer from "./MediaViewer.svelte";

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
            rc.push(
                        `${$raceConfig.orgId}/RP-${racePhase.SK.toString()}`
                )
            //const prefixSeed = Math.min(...racePhase.phr);
            const psList = [...racePhase.phr];
            psList.sort(function (a, b) {
                return a - b;
            });
            psList
                .filter((ps) => ps > 0)
                .filter((ps) => ps > 10000000)
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

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            prefix: prefixSeed,
            iSrc: i,
        };

        try {
            log.debug("listmedia about to", req);
            const endpoint = "/listMediaPrefix";
            const response = await $axios.get($raceConfig.baseUrl + endpoint, {
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
    function getMediaMMDDYYHHMMSS(mediaItem) {
        log.debug("LMOD:", mediaItem.LastModified);
        log.debug("LMOD parsed:", Date.parse(mediaItem.LastModified));
        return (
            mmddyyFmt(Date.parse(mediaItem.LastModified)) +
            " " +
            hhmmssFmt(Date.parse(mediaItem.LastModified))
        );
    }
    function mmddyyFmt(at) {
        var time = new Date(at);
        return (
            ("0" + time.getMonth()).slice(-2) +
            "/" +
            ("0" + time.getDate()).slice(-2) +
            "/" +
            ("0" + time.getFullYear()).slice(-2)
        );
    }

    function getDisplayName(key) {
        if (linkFrom == ALL_PREFIX) {
            //This is the list all media screen. Show a slightly more detailed path.
            return key.replace("media/" + $raceConfig.orgId + "/", "");
        } else {
            return key.replace(/.*-/, "");
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

<style>
    .filter-black {
        filter: saturate(100%) brightness(0%);
    }

    div :global(.xLargeIcon) {
        font-size: 28px;
    }
</style>

<div style="height: fill-parent">
    <h3>Media List</h3>
    {#if loadingMedia}
        <div
            style="margin: 0; position: absolute; top: 50%; left: 50%;
            -ms-transform: translate(-50%, -50%); transform: translate(-50%,
            -50%); text-align:center;"
        >
            <img
                width="85"
                height="85"
                src="data/circles.svg"
                alt="Loading..."
                class="filter-black"
            />
            <h5>Loading Media</h5>
        </div>
    {/if}

    {#if mediaList}
        <p />
        {#if mediaList.length == 0}
            <h5>No media found.</h5>
        {:else}
            {#each getMediaItems(mediaList) as mediaItem (mediaItem.Key)}
                <Card
                    class="mt-3 border border-info"
                    on:click={() => playMedia(mediaItem.Key)}
                >
                    <CardTitle
                        color="info"
                        class="bg-info text-white"
                        style="text-align: center;"
                    >
                        {getMediaMMDDYYHHMMSS(mediaItem)}
                    </CardTitle>
                    <CardBody>
                        <span style="display: inline; height:fill-parent">
                            <Icon
                                class="xLargeIcon"
                                icon={mediaItem.Key.endsWith(".mp3")
                                    ? faVolumeUp
                                    : faVideo}
                            />
                        </span>
                        &nbsp;&nbsp;
                        <div style="display: inline; height: fill-parent">
                            {getDisplayName(mediaItem.Key)}
                        </div>

                        {#if selectedVideo === mediaItem.Key}
                            <br />
                            <video width="320" height="240" autoplay controls>
                                <source
                                    src={getMediaHref(selectedVideo)}
                                    type="video/mp4"
                                />
                                Your browser does not support the video tag.
                            </video>
                            <!-- 
                            <MediaViewer/>
                        -->
                        {/if}
                        {#if selectedAudio === mediaItem.Key}
                            <audio controls>
                                <source
                                    src={getMediaHref(selectedAudio)}
                                    type="audio/mpeg"
                                />
                                Your browser does not support the audio element.
                            </audio>
                        {/if}
                    </CardBody>
                </Card>
            {/each}
        {/if}
    {:else}
        <b>No Media found</b>
    {/if}
</div>
