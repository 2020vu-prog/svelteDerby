<script>
    import log from "loglevel";

    import QRCode from 'qrcode'

    import {
        theme,
        showBottomNav,
        autoAnnounceResults,
        pendingSortAlgorithm,
        mediaFileType,
        uiPageSize,
        mqttEnabled,
        raceConfig,
        mqttPsUrlMap,
        developerMode,
        timeFormat,
    } from "./stores.js";

    $: {
        document.documentElement.style.setProperty(
            `--themeFromJS`,
            `${$theme}`
        );
    }

    import { formatWinTime } from "./utils.js";
    import { Badge } from "sveltestrap";

    import { onMount } from "svelte";
    import { getCacheKey, setCacheKey } from "./stores.js";
    import { db, localConfigDb } from "./eventDb.js";
    import BottomNav from "./BottomNav.svelte";
    import { push } from "svelte-spa-router";

    let disableCache = false;
    let mounted = false;
    var lclCacheKey = 0;
    let themeSelected;
    let timeFormatSelected;
    var selectedPageSize = undefined;

    var qrCodeUrl=''
    var qrsvg=''
    function getHostname() {
        const url = new URL(window.location.href);
        return url.hostname
    }
    async function getQrSvg() {
        const myUrl=getUrl()
        try {
            qrsvg=await QRCode.toString(myUrl,{type:'svg'})
            log.debug(qrsvg.length,':',qrsvg)
//            console.log(await QRCode.toDataURL(myUrl,{type:'svg'}))
            qrCodeUrl=await QRCode.toDataURL(myUrl)
            log.debug(qrCodeUrl.length,':',qrCodeUrl)
            return qrCodeUrl;
        } catch (err) {
            console.error(err)
        }
        return ''

    }
    function getUrl(encode) {
        const url = new URL(window.location.href);
        const orgIz = $raceConfig.orgIz;
        const orgId = $raceConfig.orgId;

        let pport=''
        if(url.port){
            pport=`:${url.port}`
        }
        const link = `${url.protocol}//${url.hostname}${pport}/#/as/${orgIz}/${orgId}`;
        if(encode){
            return encodeURIComponent(link);
        }else{
            return link
        }
    }
    onMount(async () => {
        log.debug(`qr: ${getUrl()}`);
        getQrSvg()
        if (getCacheKey()) {
            disableCache = true;
        } else {
            disableCache = false;
        }
        log.debug("mounting :", disableCache);

        mounted = true;
        updateColorSelector();
        timeFormatSelected = $timeFormat;
        if ($uiPageSize) {
            selectedPageSize = $uiPageSize.toString();
        } else {
            selectedPageSize = "All";
        }
    });
    function mapSelectedUiPageSize() {
        if (selectedPageSize === "All") {
            $uiPageSize = undefined;
        } else {
            $uiPageSize = parseInt(selectedPageSize, 10);
        }
    }
    async function clickDisableCache() {
        log.debug("check do");
        $mqttPsUrlMap.expires=2
        $mqttPsUrlMap.requested=2
        $mqttPsUrlMap.issued=2
        $mqttPsUrlMap=$mqttPsUrlMap

        if (!disableCache) {
            // negated test, b/c clickhandler called before bind value :-(
            //$.disableCache = new Date().getTime();
            lclCacheKey = new Date().getTime();
        } else {
            //$prefStore.disableCache = 0;
            lclCacheKey = 0;
        }
        // log.debug("Disable cache now:", $prefStore.disableCache)
        log.debug("mounted&bound Disable cache now:", lclCacheKey);
        setCacheKey(lclCacheKey);
    }
    const updateTheme = async () => {
        $theme = themeSelected;
    };

    const updateColorSelector = () => {
        var colorOptions = [];
        colorOptions = document.getElementsByClassName("colorOption");
        log.debug("ucsBegin: " + $theme);
        Array.from(colorOptions).forEach(function (element, index, array) {
            log.debug("A " + String(element.value) + " B " + String($theme));
            if (String(element.value) == String($theme)) {
                log.debug("MATCH");
                themeSelected = document.querySelectorAll("option")[index]
                    .value;
                log.debug(
                    "label of option: " +
                        document.querySelectorAll("option")[index].value
                );
                log.debug("theme selector value: " + themeSelected);
                log.debug(
                    "element to select: " +
                        document.querySelectorAll("option")[index]
                );
                return;
            }
        });
    };

    const updateTimeFormat = async () => {
        $timeFormat = timeFormatSelected;
    };

    async function nativeShare() {
        try {
            await navigator.share({text: "Soap Box Derby race results! Click the link to watch live.", url: getUrl()})
        } catch (err) {
            log.debug("sharing err/abort:", err);
        }
    }
</script>

<style>
    :root {
        --themeFromJS: "black";
    }

    div.singularSettingDiv {
        display: inline;
    }

    h4 {
        display: inline;
    }

    input[type="checkbox"],
    select {
        float: right;
        margin-right: 10px;
    }

    hr {
        border: 1px solid var(--themeFromJS);
    }

    input[type="checkbox"] {
        transform: scale(2);
    }
</style>

<div class="settings">
    <h1>Preferences</h1>
    <br />
    <h2>Sharing</h2>
    <hr />
    <div style="text-align: center;">
    <div style="max-width: 400px; margin-left: auto; margin-right: auto;">
    {@html qrsvg}
    </div>
    <!-- 

    <img
        src={qrCodeUrl}
        alt="{getUrl()}"
        title=""
    />
    -->
    <h3>{getHostname()}</h3>
    {#if $developerMode}
        <h6>{getUrl()}</h6>
    {/if}
    <button on:click={()=> nativeShare()}>Share <img style="width: 20px" src="share-solid.svg"></button>
    </div>
    <hr />

    <br />
    <h2>Functionality</h2>
    <hr />

    <div class="singularSettingDiv">
        <h4>Auto Announce</h4>
        <input type="checkbox" bind:checked={$autoAnnounceResults} />
        <h6>
            This toggles whether or not your device will automatically announce
            race results and cars on the blocks.
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4 class="">Auto Refresh</h4>
        <input type="checkbox" bind:checked={$mqttEnabled} />
    </div>
    <h6>
        This toggles whether or not your device will automatically receive new
        data. Turning this off will improve device battery lifebut will require pressing the refresh button in order to receive
        updates.
    </h6>
    <hr />

    <br />
    <h2>Appearance</h2>
    <hr />

    <div class="singularSettingDiv">
        <h4>Toolbar Visibility</h4>
        <input type="checkbox" bind:checked={$showBottomNav} />
        <h6>
            This toggles whether the bottom toolbar is shown or hidden on
            <strong>all screens</strong>.
        </h6>
    </div>
    <hr />

    <div
        class="singularSettingDiv"
        on:click={() => push("/routeSelection/nav")}
    >
        <h4>Toolbar Options</h4>
        <button style="float: right; margin-right: 10px;">
            Customize
        </button>
        <h6>
            This allows you to customize the buttons that appear in the bottom toolbar.
        </h6>
    </div>
    <hr />
    <div
        class="singularSettingDiv"
        on:click={() => push("/routeSelection/carousel")}
    >
        <h4>Carousel</h4>
        <button style="float: right; margin-right: 10px;">
            Set Up
        </button>
        <h6>
            This feature allows you to have the app automatically cycle through pages of your choosing with customizable timing.
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4>Theme Color</h4>
        <select
            id="themeSelector"
            bind:value={themeSelected}
            on:change={() => updateTheme()}
        >
            <option class="colorOption" value="#4CAF50">Default (Green)</option>
            <option class="colorOption">Pink</option>
            <option class="colorOption">Fuchsia</option>
            <option class="colorOption">Purple</option>
            <option class="colorOption">Blue</option>
            <option class="colorOption" value="dodgerblue">Light Blue</option>
            <option class="colorOption" value="gold">Yellow</option>
            <option class="colorOption" value="#ffb366">Light Orange</option>
            <option class="colorOption">Orange</option>
            <option class="colorOption" value="saddlebrown">Brown</option>
            <option class="colorOption">Gray</option>
        </select>
        <h6>This controls the color of your user interface.</h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <div
            style="display: inline-flex; align-items: center; gap: 1rem; width: fit-content;"
        >
            <h4 style="margin: 0;">Time Format</h4>

            <Badge pill class="bigText">
                A: {formatWinTime(15, $timeFormat)}
            </Badge>
        </div>

        <select
            id="timeFormatSelector"
            bind:value={timeFormatSelected}
            on:change={() => updateTimeFormat()}
        >
            <option value="ms-padded-nounit">015</option>
            <option value="ms-padded-unit">015 ms</option>
            <option value="ms-unpadded-nounit">15</option>
            <option value="ms-unpadded-unit">15 ms</option>
            <option value="s-nounit">0.015</option>
            <option value="s-unit">0.015 s</option>
        </select>

        <h6>
            This controls the way that time differentials are displayed. The
            badge above demonstates your selected format with a win time of 15
            milliseconds.
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4 class="">Pending Race Sort Order</h4>
        <select bind:value={$pendingSortAlgorithm}>
            <option class="sortOption">Age</option>
            <option class="sortOption">Heat</option>
        </select>
        <h6>
            This controls how your pending races screen is sorted. It defaults to
            <strong>age</strong>
            (newest to oldest) but it can also be set to
            <strong>heat</strong>,
            which will group like-numbered heats of different charts together.
        </h6>
    </div>
    <hr />

    <br />
    <h2>Other Settings</h2>
    <hr />

    <div class="singularSettingDiv">
        <h4 class="">UI Page Limit</h4>
        <select bind:value={selectedPageSize} on:change={mapSelectedUiPageSize}>
            <option>All</option>
            <option>200</option>
            <option>100</option>
            <option>50</option>
            <option>25</option>
            <option>5</option>
        </select>
        <h6>
            This limits the number of elements (phases, heats, or drivers) that
            are displayed on your screen and should only be necessary when
            dealing with an extremely large race.
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4 class="">Media File Format</h4>
        <select bind:value={$mediaFileType}>
            <option>Webm</option>
            <option>Mp4</option>
            <option value="">*</option>
        </select>
        <h6>
            This adjusts which file format appears when you view a race phase's media.
            It should automatically be set to whatever is most compatible for
            your device.
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4>Disable Cache</h4>
        <input
            type="checkbox"
            bind:checked={disableCache}
            on:click={() => clickDisableCache()}
        />
        <h6>
            This is used when selecting a race created within the last 5
            minutes.
        </h6>
    </div>
    <div on:click={() => push("/about")}>
        <hr />

        <div class="singularSettingDiv">
            <h4 class="">About</h4>
            <button style="float: right; margin-right: 10px;">
                About Page
            </button>
            <h6>
                Visit the about page where to find
                event and version information.
            </h6>
        </div>
        <hr />
    </div>

    <BottomNav />
</div>
