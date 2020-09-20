<script>
    import { nextOnBlockKey, racePhaseMap, doRefreshBlocks } from "./stores.js";

    import MaterialAdd from "./MaterialAdd.svelte";
    import { raceConfig } from "./stores.js";
    import { onMount } from "svelte";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { push, pop, replace } from "svelte-spa-router";
    import { db, dbReset } from "./eventDb.js";
    import { getCacheKey } from "./stores.js";

    export let params = {};

    var orgMap = {};
    $: {
        console.log("bound orgMap: ", orgMap);
    }

    const getOrgsAsList = (orgList) => {
        const orgs = Object.values(orgList);
        orgs.sort((a, b) => {
            return getRaceName(a).localeCompare(getRaceName(b));
        });
        return orgs;
    };
    const refreshOrgMap = async () => {
        console.log("refreshOrgMap:");
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        axios.defaults.headers.common["Authorization"] = bearer;
        const cacheKey = getCacheKey();
        axios
            .get(
                $raceConfig.baseUrl +
                    `/listOrgEvents?orgIz=${params.orgIz}&cache=${cacheKey}`
            )
            .then((response) => {
                console.log("refreshOrgMap length:" + response.data.length);
                console.log("refreshOrgMap:", response.data);
                orgMap = response.data;
            })
            .catch((err) => {
                console.log(err);
            });
    };

    onMount(async () => {
        refreshOrgMap();
    });
    const requestClearStore = () => {
        $doRefreshBlocks = -1;
    };
    const doSelect = async (config) => {
        console.log("selected:", config);
        await dbReset();
        console.log("db reset complete.");

        requestClearStore();
        console.log("requestClearStore  complete.");

        console.log("selecting config:", config);
        config.baseUrl = "/app";
        config.title = getRaceName(config);

        $raceConfig = config;

        replace("/RpList");
    };
    const getRaceName = (config) => {
        return config.name ? config.name : config.orgId;
    };
</script>

<div>
    <MaterialAdd clickHandleRoute="/eventAdd/{params.orgIz}" />

    <h4>EventSelection for {decodeURIComponent(params.orgIz)}</h4>

    <p />

    {#each getOrgsAsList(orgMap) as orgConfig}
        <div class="panel panel-info" on:click={() => doSelect(orgConfig)}>
            <a href="javascript:void(0);">{getRaceName(orgConfig)}</a>
        </div>
    {/each}
</div>
