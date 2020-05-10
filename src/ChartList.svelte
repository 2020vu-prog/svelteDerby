<script>
    import { driverMap, doRefreshBlocks } from "./stores.js";
    import CarAndDriver from "./CarAndDriver.svelte";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { safeGetAt } from "./utils.js";
    import { prefStore } from "./stores.js";
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
        console.log("refreshDataFromDb data:", trigger);

        bmdFromDexie = await db.BracketMetaData.toArray();
    };
    const getBmdAsList = (driverMap) => {
        const rc = [];
        db.BracketMetaData.each((bmd) => {
            console.log("bmd from dexie: ", bmd), rc.push(bmd);
        });

        console.log("bmd rc:", rc);
        return rc;
        //const bmdArray= db.BracketMetaData.toArray();
        //console.log("bmdArray:",bmdArray)
        //return bmdArray;
    };
    const navToChartDetail = (bmd) => {
        console.log("navToChartDetail:", bmd);
        push("/ChartDetail/" + bmd.SK);
    };
</script>

<div>
    <h4>Chart List</h4>
    <p />
    <MaterialAdd clickHandleRoute="/chartAdd" />

    {#each bmdFromDexie as bmd}
        <div class="panel panel-info" on:click={() => navToChartDetail(bmd)}>
            {bmd.bracketName}
        </div>
    {/each}
</div>
