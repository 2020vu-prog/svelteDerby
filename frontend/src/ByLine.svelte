<script>
    import { db } from "./eventDb.js";

    export let entity = {};

    let resolvedDisplayName = "";
    let lastHash = "";

    $: byHash = entity ? entity.byH || "" : "";
    $: fallbackByLine = entity ? entity.byH || entity.by || "" : "";
    $: byLine = resolvedDisplayName || fallbackByLine;
    $: label = resolvedDisplayName ? "UserName" : !byHash ? "User" : "By Hash";
    $: resolveByHash(byHash);

    async function resolveByHash(hash) {
        if (hash === lastHash) {
            return;
        }
        lastHash = hash;
        resolvedDisplayName = "";
        if (!hash || !db.UserDisplayName) {
            return;
        }
        const userDisplayName = await db.UserDisplayName.get(hash);
        if (lastHash === hash) {
            resolvedDisplayName = userDisplayName?.displayName || "";
        }
    }
</script>

{#if byLine}
    <span class="by-line">{label}: {byLine}</span>
{/if}

<style>
    .by-line {
        overflow-wrap: anywhere;
    }
</style>
