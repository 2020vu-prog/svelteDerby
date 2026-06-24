<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import MaterialAdd from "./MaterialAdd.svelte";
    import OrgName from "./OrgName.svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { raceConfig } from "./stores.js";
    import { push, pop, replace } from "svelte-spa-router";
    import {
        getCacheKey,
        developerMode,
        userEmail,
        getOrgName,
        orgMap,
        refreshOrgMap,
    } from "./stores.js";

    let loadingOrgs = true;
    let orgLoadRequest = 0;
    let loadedForEmail;

    // Populate org list if user is logged in automatically as anonymous.
    $: if ($userEmail !== loadedForEmail) {
        loadedForEmail = $userEmail;
        loadOrgMap();
    }

    $: {
        log.debug("bound orgMap: ", orgMap);
    }

    const getOrgsAsList = (orgList) => {
        if ($developerMode) {
            return Object.keys(orgList).sort(sortByOrgName);
        } else {
            return Object.keys(orgList)
                .filter((orgName) => !orgName.startsWith("Test"))
                .sort(sortByOrgName);
        }
    };

    async function loadOrgMap() {
        const requestId = ++orgLoadRequest;
        loadingOrgs = true;
        try {
            await refreshOrgMap();
        } finally {
            if (requestId === orgLoadRequest) {
                loadingOrgs = false;
            }
        }
    }

    function sortByOrgName(a, b) {
        const nameA = getOrgName(a).toUpperCase(); // ignore upper and lowercase
        const nameB = getOrgName(b).toUpperCase(); // ignore upper and lowercase
        if (nameA < nameB) {
            return -1;
        }
        if (nameA > nameB) {
            return 1;
        }

        // names must be equal
        return 0;
    }
</script>

<div>
    <MaterialAdd clickHandleRoute="/orgAdd" />

    <h4>Organization List</h4>
    <p />

    {#if loadingOrgs}
        <SpinnerButton disabled={true} spinning={true}>
            Loading Organizations
        </SpinnerButton>
    {/if}

    {#each getOrgsAsList($orgMap) as orgIz}
        <Card class="mt-3 border border-info">
            <CardBody>
                <div on:click={() => push("/eventSelection/" + orgIz)}>
                    <a href="javascript:void(0);">
                        <OrgName {orgIz} />
                    </a>
                </div>
            </CardBody>
        </Card>
    {/each}
</div>
