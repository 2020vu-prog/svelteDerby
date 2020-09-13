<script>
    import {
        doRefreshBlocks,
        theme,
        showBottomNav,
        autoAnnounceResults,
        developerMode,
        pendingSortAlgorithm,
        mediaFileType,
        statusMessage,
        uiPageSize,
    } from "./stores.js";

    import { buildVersion, buildDate } from "./utils.js";
    import { onMount } from "svelte";
    import { getCacheKey, setCacheKey } from "./stores.js";
    import { db, localConfigDb } from "./eventDb.js";
    import BottomNav from "./BottomNav.svelte";

    let disableCache = false;
    let mounted = false;
    var lclCacheKey = 0;
    var ecFromDexie;
    var histCountFromDexie = "";
    let themeSelected;
    var selectedPageSize = undefined;

    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger);

        ecFromDexie = await db.EventConfig.toArray();
        histCountFromDexie = (await db.EventHistory.count()).toString();
    };
    $: {
        refreshDataFromDb($doRefreshBlocks);
    }

    $: {
        const prefs = {
            KEY: "userPrefs",
            uiPageSize: $uiPageSize,
            autoAnnounceResults: $autoAnnounceResults,
            developerMode: $developerMode,
            pendingSortAlgorithm: $pendingSortAlgorithm,
            mediaFileType: $mediaFileType,
            changed: new Date().getTime(),
            changedFmt: new Date().toLocaleTimeString(),
        };
        updatePrefsWhenMounted(prefs);
    }
    function updatePrefsWhenMounted(prefs) {
        if (mounted) {
            console.log("About updating userPrefs:", mounted, prefs);
            localConfigDb["LocalConfig"].put(prefs);
        }
    }
    onMount(async () => {
        if (getCacheKey()) {
            disableCache = true;
        } else {
            disableCache = false;
        }
        console.log("mounting :", disableCache);

        mounted = true;
        refreshDataFromDb();
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
        console.log("check do");
        if (!disableCache) {
            // negated test, b/c clickhandler called before bind value :-(
            //$.disableCache = new Date().getTime();
            lclCacheKey = new Date().getTime();
        } else {
            //$prefStore.disableCache = 0;
            lclCacheKey = 0;
        }
        // console.log("Disable cache now:", $prefStore.disableCache)
        console.log("mounted&bound Disable cache now:", lclCacheKey);
        setCacheKey(lclCacheKey);
    }
    const updateTheme = async () => {
        $theme = themeSelected;
        console.log("Updated theme to: " + $theme);
        let id = await localConfigDb["LocalConfig"].put({
            KEY: "theme",
            bgColor: $theme,
        });
    };

    const updateColorSelector = () => {
        var colorOptions = [];
        colorOptions = document.getElementsByClassName("colorOption");
        console.log("ucsBegin: " + $theme);
        Array.from(colorOptions).forEach(function (element, index, array) {
            console.log("A " + String(element.value) + " B " + String($theme));
            if (String(element.value) == String($theme)) {
                console.log("MATCH");
                themeSelected = document.querySelectorAll("option")[index]
                    .value;
                console.log(
                    "label of option: " +
                        document.querySelectorAll("option")[index].value
                );
                console.log("theme selector value: " + themeSelected);
                console.log(
                    "element to select: " +
                        document.querySelectorAll("option")[index]
                );
                return;
            }
        });
    };
    var devClickCount = 0;
    function devClick() {
        if (devClickCount++ > 8) {
            console.log("devmodeA");
            $developerMode = true;
            $statusMessage = {
                text: `Developer Mode Enabled.`,
                type: "success",
            };
        }
    }
</script>

<style>
    /*
    using css grid layout from this example: https://stackoverflow.com/questions/9686538/align-labels-in-form-next-to-input
    */
    div.settings {
        display: grid;
        grid-template-columns: max-content max-content;
        grid-gap: 5px;
    }

    div.settings label {
        text-align: right;
    }

    div.settings label:after {
        content: ":";
    }

    div.settings select {
        width: min-content;
    }

    /* https://stackoverflow.com/questions/3779534/how-do-i-disable-text-selection-with-css-or-javascript */
    .noselect {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
    }
</style>

<div class="settings">

    {#if ecFromDexie && ecFromDexie[0]}
        <label>Event</label>
        <span>{ecFromDexie[0].name}</span>

        <label>Archive Pending</label>
        <span>{new Date(ecFromDexie[0].TTL * 1000).toLocaleString()}</span>
    {/if}
    {#if histCountFromDexie}
        <label>Db Count</label>
        <span>{histCountFromDexie}</span>
    {/if}

    <label>Disable Cache</label>
    <input
        type="checkbox"
        bind:checked={disableCache}
        on:click={() => clickDisableCache()} />
    <label>Bottom NavBar</label>
    <input type="checkbox" bind:checked={$showBottomNav} />
    <label>Auto Announce</label>
    <input type="checkbox" bind:checked={$autoAnnounceResults} />

    <label>Theme Color</label>
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
    <label style="max-width: 110px; word-wrap: break-word">
        Sort Pending Races By
    </label>
    <select bind:value={$pendingSortAlgorithm}>
        <option class="sortOption">Age</option>
        <option class="sortOption">Heat</option>
    </select>
    <label style="max-width: 110px; word-wrap: break-word">
        Media file format
    </label>
    <select bind:value={$mediaFileType}>
        <option>Webm</option>
        <option>Mp4</option>
        <option value="">*</option>
    </select>
    <label style="max-width: 110px; word-wrap: break-word">UI Page Limit</label>
    <select bind:value={selectedPageSize} on:change={mapSelectedUiPageSize}>
        <option>All</option>
        <option>200</option>
        <option>100</option>
        <option>50</option>
        <option>25</option>
        <option>5</option>
    </select>
    <b />
    <b />
    <b />
    <b />
    <b />
    <b />
    <label>Build Version</label>
    <span class="noselect" on:click={devClick}>{buildVersion()}</span>

    <label>Build Date</label>
    <span>{buildDate()}</span>
    <BottomNav />
</div>
