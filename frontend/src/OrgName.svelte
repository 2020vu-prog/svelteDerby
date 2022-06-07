<script>
    import log from "loglevel";
    import { getOrgName, refreshOrgMap, orgMap } from "./stores.js";
    export let orgIz;

    import { onMount } from "svelte";
    var mounted = false;
    var orgName = orgIz;
    onMount(async () => {
        mounted = true;
        log.debug(`OrgMap keys0: ${Object.keys($orgMap)}`);
        // TODO: consider moving conditional refresh to getOrgName()
        if (Object.keys($orgMap) == 0) {
            await refreshOrgMap();
        }
        orgName = getOrgName(orgIz);
        log.debug(`OrgName: ${orgName}`);
        log.debug(`OrgMap keys0: ${Object.keys($orgMap)}`);
    });
    $: {
        //reload orgName if orgMap changes.
        if ($orgMap) {
            orgName = getOrgName(orgIz);
        }
    }
</script>

<span>{orgName}</span>
