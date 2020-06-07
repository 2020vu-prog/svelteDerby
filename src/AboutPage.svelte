<script>
    import { doRefreshBlocks, theme, showBottomNav } from "./stores.js";

    import { buildVersion, buildDate } from "./utils.js";
    import { onMount } from "svelte";
    import { getCacheKey, setCacheKey } from "./stores.js";
    import { db, localConfigDb } from "./eventDb.js";
    import BottomNav from "./BottomNav.svelte";
    //import { prefStore } from './stores.js';

    let disableCache = false;
    let mounted = false;
    var lclCacheKey = 0;
    var ecFromDexie;
    let themeSelected;

    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger);

        ecFromDexie = await db.EventConfig.toArray();
    };
    $: {
        refreshDataFromDb($doRefreshBlocks);
    }
    $: {
        if (mounted) {
        }
    }
    onMount(async () => {
        //console.log("prefs:", $prefStore)
        if (getCacheKey()) {
            disableCache = true;
        } else {
            disableCache = false;
        }
        console.log("mounting :", disableCache);

        mounted = true;
        refreshDataFromDb();
        updateColorSelector();
    });
    async function clickDisableCache() {
        console.log("check do");
        if (!disableCache) {
            // negated test, b/c clickhandler called before bind value :-(
            //$prefStore.disableCache = new Date().getTime();
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
</style>

<div class="settings">

    {#if ecFromDexie && ecFromDexie[0]}
        <label>Event</label>
        <span>{ecFromDexie[0].name}</span>

        <label>Archive Pending</label>
        <span>{new Date(ecFromDexie[0].TTL * 1000).toLocaleString()}</span>
    {/if}

    <label>Disable Cache</label>
    <input
        type="checkbox"
        bind:checked={disableCache}
        on:click={() => clickDisableCache()} />
    <label>Bottom NavBar</label>
    <input type="checkbox" bind:checked={$showBottomNav} />

    <label>Theme Color</label>
    <select
        id="themeSelector"
        bind:value={themeSelected}
        on:blur={() => updateTheme()}>
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

    <b />
    <b />
    <b />
    <b />
    <b />
    <b />
    <label>Build Version</label>
    <span>{buildVersion()}</span>

    <label>Build Date</label>
    <span>{buildDate()}</span>
    <BottomNav />
</div>
