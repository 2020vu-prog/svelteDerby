<script>
    import { buildVersion, buildDate } from "./utils.js";
    import { onMount } from 'svelte';
    import { getCacheKey , setCacheKey} from "./stores.js";
    //import { prefStore } from './stores.js';

    let disableCache = false;
    let mounted = false;
    var lclCacheKey=0;

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

    });
    async function handleSubmit() { 
        console.log("check do")
        if (!disableCache) {  // negated test, b/c clickhandler called before bind value :-(
                //$prefStore.disableCache = new Date().getTime();
                lclCacheKey= new Date().getTime();
            }
            else {
                //$prefStore.disableCache = 0;
                 lclCacheKey=0;

            }
           // console.log("Disable cache now:", $prefStore.disableCache)
           console.log("mounted&bound Disable cache now:", lclCacheKey)
           setCacheKey(lclCacheKey)
    }

</script>
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