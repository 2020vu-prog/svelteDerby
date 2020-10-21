<script>
    import Dexie from "dexie";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import RacePhase from "./RacePhase.svelte";
    import RaceStanding from "./RaceStanding.svelte";

    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let params = {};
    let history = [];
    onMount(async () => {
        const historyFromDb = await db.EventHistory.where("[PK+SK+at]")
            .between(
                [params.PK, params.SK, Dexie.minKey],
                [params.PK, params.SK, Dexie.maxKey]
            )
            .toArray();
        const entityFactory = new EntityFactory({});
        historyFromDb.forEach((element) => {
            history.push(entityFactory.build(element));
        });
        history.sort(sortByAt);
        history = history;
        console.log("history:", history);

        const where = { PK: params.PK, SK: params.SK };
        console.log("where:", where);
        const got = db.EventHistory.where(where);
        console.log("got:", got);
    });
    function sortByAt(a, b) {
        return b.at - a.at;
    }
</script>

<div>
    <h4>History</h4>
    {#each history as entity (entity.at)}
        {#if entity.PK.endsWith(':RP')}
            <RacePhase
                source="EventHistory"
                historyPK={params.PK}
                refreshTime="1"
                phaseKey={entity.classKey}
                at={entity.at} />
        {/if}
        {#if entity.PK.endsWith(':RS')}
            <RaceStanding standing={entity} source="EventHistory" />
        {/if}
    {/each}
</div>
