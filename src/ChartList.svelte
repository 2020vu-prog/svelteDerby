<script>
    import log from "loglevel";

    import { driverMap, doRefreshBlocks } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { safeGetAt } from "./utils.js";
    import { db } from "./eventDb.js";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";

    $: {
        refreshDataFromDb($doRefreshBlocks);
    }
    var bmdFromDexie = [{ brackName: "Initializing..." }];

    onMount(async () => {
        refreshDataFromDb();
    });
    const refreshDataFromDb = async (trigger) => {
        log.debug("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.toArray();
    };
    const getBmdAsList = (driverMap) => {
        const rc = [];
        db.BracketMetaData.each((bmd) => {
            log.debug("bmd from dexie: ", bmd), rc.push(bmd);
        });

        log.debug("bmd rc:", rc);
        return rc;
        //const bmdArray= db.BracketMetaData.toArray();
        //log.debug("bmdArray:",bmdArray)
        //return bmdArray;
    };
    const navToChartDetail = (bmd) => {
        log.debug("navToChartDetail:", bmd);
        push("/ChartDetail/" + bmd.SK);
    };
    function getSortedBmd(bmdFromDexie) {
        bmdFromDexie.sort((a, b) => {
            return a.bracketName
                .toLowerCase()
                .localeCompare(b.bracketName.toLowerCase());
        });
        return bmdFromDexie;
    }
</script>

<div>
    <h4>Chart List</h4>
    <p />
    <MaterialAdd clickHandleRoute="/chartAdd" />

    {#each getSortedBmd(bmdFromDexie) as bmd (bmd.at)}
        <div class="panel panel-info" on:click={() => navToChartDetail(bmd)}>
            {bmd.bracketName}
        </div>
    {/each}
</div>
