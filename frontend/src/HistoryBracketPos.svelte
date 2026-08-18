<script>
    import log from "loglevel";
    import { onMount } from "svelte";
    import { hhmmssFmt } from "./utils.js";
    import ByLine from "./ByLine.svelte";
    import {
        Card,
        CardBody,
        CardHeader,
        CardTitle,
        CardFooter,
        Badge,
    } from "sveltestrap";
    import { db } from "./eventDb.js";
    export let bp;
    export let index;
    let bmdFromDexie = {};
    onMount(async () => {
        log.debug("history bp");
        log.debug(JSON.stringify(bp));
        if (index == 0) {
            bmdFromDexie = await db.BracketMetaData.get(getChartId());
        }
    });
    function getHeat() {
        return bp.SK.replace(/.*:/, "");
    }
    function getChartId() {
        return bp.SK.replace(/:.*/, "");
    }
    function xlateStatus(status) {
        if (status === "ptcp") {
            return "Racer";
        }
        return status;
    }
</script>

{#if bmdFromDexie.bracketName}
    <h4>
        {bmdFromDexie.bracketName}
    </h4>
{/if}
<Card class="mt-3 border border-info cjw-border-5">
    <CardHeader class="bg-info text-white">
        <CardTitle>
            <span>Heat: {getHeat()}</span>
            <span class="spanRight">
                {hhmmssFmt(bp.at)}
            </span>
        </CardTitle>
    </CardHeader>
    <CardBody>
        <ByLine entity={bp} />
        <ul class="list-group">
            {#each Object.keys(bp.pos) as pos}
                <li class="list-group-item">
                    {pos}:
                    {xlateStatus(bp.pos[pos].status)}:
                    {bp.pos[pos].ptcp}
                </li>
            {/each}
        </ul>
    </CardBody>
</Card>
