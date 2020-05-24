<script>
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { parseHeatPos } from "./utils.js";
    import { doRefreshBlocks } from "./stores.js";
    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let left;
    export let top;
    export let scale;
    export let pos;
    export let chartId;
    export let isSeed;

    let scaledTop;
    let scaledLeft;
    let scaledWidth;
    let scaledHeight;
    var bracketClass = "unknown";
    $: {
        console.log("hotspot:", left, top, scale, pos, chartId);
        recalc();
    }
    $: {
        refreshDataFromDb($doRefreshBlocks);
    }
    const recalc = () => {
        scaledTop = top * scale;
        scaledLeft = left * scale;
        scaledWidth = 175 * scale;
        scaledHeight = 30 * scale;
    };
    const gotoChartPos = () => {
        push(`/ChartPosition/${chartId}/${heatPos}?clickedOn=${pos}`);
    };
    var heatPos, heatLetter;
    onMount(async () => {
        [heatPos, heatLetter] = parseHeatPos(pos);
        refreshDataFromDb();
    });
    var bpFromDexie = {};
    var rsFromDexie = {};
    var posHtml = "";
    const refreshDataFromDb = async (trigger) => {
        const bracketPosKey = `${chartId}:${heatPos}`;
        console.log("bracketPosKey: ", bracketPosKey);
        bpFromDexie = await db.BracketPos.get(bracketPosKey);
        console.log("refreshDataFromDb gave:", bpFromDexie);
        if (isSeed) {
            bracketClass = "pendingSeed";
        }

        if (bpFromDexie && bpFromDexie.pos && bpFromDexie.pos[heatLetter]) {
            if (bpFromDexie.pos[heatLetter].status == "ptcp") {
                posHtml = ` - ${bpFromDexie.pos[heatLetter].ptcp}`;
                if (bpFromDexie.pos[heatLetter].ptcp) {
                    bracketClass = "havePtcp";
                }
            } else if (bpFromDexie.pos[heatLetter].status == "bye") {
                posHtml = ` - Bye`;
                bracketClass = "haveBye";
            } else if (bpFromDexie.pos[heatLetter].status == "forfeit") {
                posHtml = ` - ${bpFromDexie.pos[heatLetter].ptcp}(F)`;
                bracketClass = "haveForfeit";
            }
        }

        rsFromDexie = await db.RaceStanding.get(bracketPosKey);
        console.log("isSeed: ", isSeed);
        if (rsFromDexie) {
            if (rsFromDexie.del) {
                rsFromDexie=null;
            }}
            if (rsFromDexie) {
            const entityFactory = new EntityFactory({});
            const rs = entityFactory.build(rsFromDexie);

            //we have 2 car numbers
            if (!rs.ph1 && !rs.ph2) {
                bracketClass = "ready";
            } else if (rs.ph1 && !rs.ph2) {
                bracketClass = "phaseOneComplete";
            } else if (rs.isComplete()) {
                bracketClass = "complete";
            }
        }

        //await getChartImage(bmdFromDexie.imgPath);
        //await getChartImage(bmdFromDexie.jsonPath);
    };
</script>

<style>
    div.overlay {
        /* applied to all */
        border: 1px solid black;
    }

    div.ready {
        background: green;
    }

    div.pendingSeed {
        background: red;
    }

    div.complete {
        background: gray;
    }

    div.phaseOneComplete {
        background: yellow;
    }
</style>

<div
    class="overlay {bracketClass}"
    id="myDIV"
    on:click={() => gotoChartPos()}
    style="position: absolute;width: {scaledWidth}px;height: {scaledHeight}px;z-index:
    2;left: {scaledLeft}px;top: {scaledTop}px;">
    {pos} {posHtml}
</div>
