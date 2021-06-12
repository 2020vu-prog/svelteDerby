<script>
    import log from "loglevel";

    import {
        theme,
        showBottomNav,
        autoAnnounceResults,
        pendingSortAlgorithm,
        mediaFileType,
        uiPageSize,
        mqttEnabled,
    } from "./stores.js";

    $: {
        document.documentElement.style.setProperty(
            `--themeFromJS`,
            `${$theme}`
        );
    }

    import { onMount } from "svelte";
    import { getCacheKey, setCacheKey } from "./stores.js";
    import { db, localConfigDb } from "./eventDb.js";
    import BottomNav from "./BottomNav.svelte";
    import { push } from "svelte-spa-router";

    let disableCache = false;
    let mounted = false;
    var lclCacheKey = 0;
    let themeSelected;
    var selectedPageSize = undefined;

    $: {
        const prefs = {
            KEY: "userPrefs",
            uiPageSize: $uiPageSize,
            autoAnnounceResults: $autoAnnounceResults,
            pendingSortAlgorithm: $pendingSortAlgorithm,
            mediaFileType: $mediaFileType,
            mqttEnabled: $mqttEnabled,
            changed: new Date().getTime(),
            changedFmt: new Date().toLocaleTimeString(),
        };
        updatePrefsWhenMounted(prefs);
    }
    function updatePrefsWhenMounted(prefs) {
        if (mounted) {
            log.debug("About updating userPrefs:", mounted, prefs);
            localConfigDb["LocalConfig"].put(prefs);
        }
    }
    onMount(async () => {
        if (getCacheKey()) {
            disableCache = true;
        } else {
            disableCache = false;
        }
        log.debug("mounting :", disableCache);

        mounted = true;
        updateColorSelector();
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
        log.debug("Updated theme to: " + $theme);
        let id = await localConfigDb["LocalConfig"].put({
            KEY: "theme",
            bgColor: $theme,
        });
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
        data. Turning this off will improve device battery life. If you do turn
        this off, you will have to press the refresh button in order to receive
        new data.
    </h6>
    <hr />

    <br />
    <h2>Appearance</h2>
    <hr />

    <div class="singularSettingDiv">
        <h4>Bottom NavBar</h4>
        <input type="checkbox" bind:checked={$showBottomNav} />
        <h6>
            This toggles whether the bottom nav is shown or hidden on
            <strong>all screens</strong>
            .
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4>Theme Color</h4>
        <select
            id="themeSelector"
            bind:value={themeSelected}
            on:change={() => updateTheme()}>
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
        <h4 class="">Sort Pending Races By</h4>
        <select bind:value={$pendingSortAlgorithm}>
            <option class="sortOption">Age</option>
            <option class="sortOption">Heat</option>
        </select>
        <h6>
            This controls how your pending race screen is sorted. It defaults to
            <strong>age</strong>
            (newest to oldest) but it can also be set to
            <strong>heat</strong>
            , which will group like-numbered heats of different brackets
            together.
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
            This limits the number of elements(phases, heats, or drivers) and
            should only be necessary when dealing with an extremely large race.
        </h6>
    </div>
    <hr />

    <div class="singularSettingDiv">
        <h4 class="">Media file format</h4>
        <select bind:value={$mediaFileType}>
            <option>Webm</option>
            <option>Mp4</option>
            <option value="">*</option>
        </select>
        <h6>
            This adjusts which files appear when you view a race phase's media.
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
            on:click={() => clickDisableCache()} />
        <h6>
            This is used when selecting a race created within the last 5
            minutes.
        </h6>
    </div>
    <div on:click={() => push('/about')}>
        <hr />

        <div class="singularSettingDiv">
            <h4 class="">About</h4>
            <button style="float: right; margin-right: 10px;">
                About Page
            </button>
            <h6>
                Click here to be redirected to the about page where you can find
                information about the race you are viewing and the version of
                this software that you are running.
            </h6>
        </div>
        <hr />
    </div>

    <BottomNav />
</div>
