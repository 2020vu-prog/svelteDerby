<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import { doRefreshBlocks } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { raceConfig } from "./stores.js";
    import { onMount } from "svelte";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { push, pop, replace } from "svelte-spa-router";
    import {
        getCacheKey,
        developerMode,
        userEmail,
        getOrgName,
        orgMap,
        refreshOrgMap,
    } from "./stores.js";

    //Populate org list if user is logged in automatically as anonymous
    $: refreshOrgMap($userEmail);

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

    onMount(async () => {
        refreshOrgMap();
    });

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

    {#each getOrgsAsList($orgMap) as orgIz}
        <Card class="mt-3 border border-info">
            <CardBody>
                <div on:click={() => replace('/eventSelection/' + orgIz)}>
                    <a href="javascript:void(0);">
                        {getOrgName(orgIz, $orgMap)}
                    </a>
                </div>
            </CardBody>
        </Card>
    {/each}

</div>
