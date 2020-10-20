<script>
    import Dexie from "dexie";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import RacePhase from "./RacePhase.svelte";

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
    {#each history as racePhase (racePhase.at)}
        <RacePhase
            source="EventHistory"
            historyPK={params.PK}
            refreshTime="1"
            phaseKey={racePhase.classKey}
            at={racePhase.at} />
    {/each}
</div>
