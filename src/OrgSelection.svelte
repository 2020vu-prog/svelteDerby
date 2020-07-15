<script>
    import { doRefreshBlocks } from "./stores.js";
    import MaterialAdd from "./MaterialAdd.svelte";
    import { raceConfig } from "./stores.js";
    import { onMount } from "svelte";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { push, pop, replace } from "svelte-spa-router";
    import { getCacheKey, beginAnonymousLogin } from "./stores.js";

    import { store } from "./stores/auth.js";
    import AutoAnonymousLogin from "./AutoAnonymousLogin.svelte";


    var orgMap = {};
    $: {
        console.log("bound orgMap: ", orgMap);
    }

    const getOrgsAsList = (orgList) => {
        return Object.keys(orgList);
    };
    const refreshOrgMap = async () => {
        console.log("refreshOrgMap:");
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        axios.defaults.headers.common["Authorization"] = bearer;
        const cacheKey = getCacheKey();

        axios
            .get($raceConfig.baseUrl + `/listOrgConfig?cacheKey=${cacheKey}`)
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
        await logUserInIfNecessary();
        refreshOrgMap();
    });

    async function logUserInIfNecessary() {
        if (!$store) {
            console.log(
                "User is not logged in, so we will sign them in anonymously."
            );
            $beginAnonymousLogin = true;
        }
    }
</script>

<div>
    <MaterialAdd clickHandleRoute="/orgAdd" />

    <h4>Organization List</h4>
    <AutoAnonymousLogin display="false" on:loginComplete={refreshOrgMap} />
    <p />

    {#each getOrgsAsList(orgMap) as orgIz}
        <div
            class="panel panel-info"
            on:click={() => replace('/eventSelection/' + orgIz)}>
            <a href="javascript:void(0);">{orgIz}</a>
        </div>
    {/each}

</div>
