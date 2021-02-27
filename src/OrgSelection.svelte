<script>
    import log from "loglevel";

    import { doRefreshBlocks } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { raceConfig } from "./stores.js";
    import { onMount } from "svelte";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { push, pop, replace } from "svelte-spa-router";
    import {
        getCacheKey,
        beginAnonymousLogin,
        developerMode,
        userEmail,
    } from "./stores.js";

    //Populate org list if user is logged in automatically as anonymous
    $: refreshOrgMap($userEmail);

    var orgMap = {};
    $: {
        log.debug("bound orgMap: ", orgMap);
    }

    const getOrgsAsList = (orgList) => {
        if ($developerMode) {
            return Object.keys(orgList);
        } else {
            return Object.keys(orgList).filter(
                (orgName) => !orgName.startsWith("Test")
            );
        }
    };
    const refreshOrgMap = async () => {
        log.debug("refreshOrgMap:");
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        axios.defaults.headers.common["Authorization"] = bearer;
        const cacheKey = getCacheKey();

        axios
            .get($raceConfig.baseUrl + `/listOrgConfig?cacheKey=${cacheKey}`)
            .then((response) => {
                log.debug("refreshOrgMap length:" + response.data.length);
                log.debug("refreshOrgMap:", response.data);
                orgMap = response.data;
            })
            .catch((err) => {
                log.debug(err);
            });
    };

    onMount(async () => {
        refreshOrgMap();
    });

    function getOrgName(orgIz) {
        if (orgMap[orgIz].orgName) {
            return orgMap[orgIz].orgName;
        } else return orgIz;
    }
</script>

<div>
    <MaterialAdd clickHandleRoute="/orgAdd" />

    <h4>Organization List</h4>
    <p />

    {#each getOrgsAsList(orgMap) as orgIz}
        <div
            class="panel panel-info"
            on:click={() => replace('/eventSelection/' + orgIz)}>
            <a href="javascript:void(0);">{getOrgName(orgIz)}</a>
        </div>
    {/each}

</div>
