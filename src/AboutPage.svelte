<script>
    import { doRefreshBlocks } from './stores.js';

    import { buildVersion, buildDate } from "./utils.js";
    import { onMount } from 'svelte';
    import { getCacheKey, setCacheKey } from "./stores.js";
    import { db } from './eventDb.js';

    //import { prefStore } from './stores.js';

    let disableCache = false;
    let mounted = false;
    var lclCacheKey = 0;
    var ecFromDexie;



    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger)

        ecFromDexie = await db.EventConfig.toArray();

    }
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
        }
        else {
            disableCache = false;
        }
        console.log("mounting :", disableCache)

        mounted = true;
        refreshDataFromDb();


    });
    async function handleSubmit() {
        console.log("check do")
        if (!disableCache) {  // negated test, b/c clickhandler called before bind value :-(
            //$prefStore.disableCache = new Date().getTime();
            lclCacheKey = new Date().getTime();
        }
        else {
            //$prefStore.disableCache = 0;
            lclCacheKey = 0;

        }
        // console.log("Disable cache now:", $prefStore.disableCache)
        console.log("mounted&bound Disable cache now:", lclCacheKey)
        setCacheKey(lclCacheKey)
    }

</script>
{#if ecFromDexie && ecFromDexie[0]}
    Event: {ecFromDexie[0].name}<p/>
    Archive Pending: {new Date(ecFromDexie[0].TTL * 1000).toString()}<p/>
{/if}
Build Version: {buildVersion()}
<p />
Build Date: {buildDate()}
<p />
<form on:submit|preventDefault={handleSubmit}>
    <label>
        <input type=checkbox bind:checked={disableCache} on:click={() => handleSubmit() }>
        Temporary Cache Disable
    </label>
</form>