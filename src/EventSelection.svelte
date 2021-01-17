<script>
    import {
        nextOnBlockKey,
        racePhaseMap,
        doRefreshBlocks,
        raceConfig,
        getCacheKey,
    } from "./stores.js";

    import SpinnerButton from "./SpinnerButton.svelte";

    import MaterialAdd from "./MaterialAdd.svelte";
    import { onMount } from "svelte";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { push, pop, replace } from "svelte-spa-router";
    import { db, dbReset } from "./eventDb.js";

    export let params = {};

    var currentViewMode = "Unknown";

    var eventMap = {};
    var selectedEventMap = {};
    $: {
        console.log("bound eventMap: ", eventMap);
    }

    const getOrgEventsAsList = (viewMode) => {
        populateSelectedEventMap(currentViewMode);

        const orgEvents = Object.values(selectedEventMap);
        orgEvents.sort((a, b) => {
            return getRaceName(a).localeCompare(getRaceName(b));
        });
        return orgEvents;
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
                eventMap = response.data;
                currentViewMode = "Active";
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

    function getInactiveMode(ignoredParamater) {
        return currentViewMode === "Active" ? "Archived" : "Active";
    }

    function populateSelectedEventMap(viewMode) {
        //Stack Overflow https://stackoverflow.com/questions/5072136/javascript-filter-for-objects/37616104
        Object.filter = (obj, predicate) =>
            Object.fromEntries(Object.entries(obj).filter(predicate));

        console.log("eventMap: ", eventMap);

        var filtered = {};
        if (viewMode === "Active") {
            filtered = Object.filter(
                eventMap,
                ([eventKey, eventValue]) => !eventValue.archived
            );
        }
        if (viewMode === "Archived") {
            filtered = Object.filter(
                eventMap,
                ([eventKey, eventValue]) => eventValue.archived
            );
        }

        console.log("filteredEventMap: ", filtered);
        selectedEventMap = filtered;
    }
</script>

<div>
    <MaterialAdd clickHandleRoute="/eventAdd/{params.orgIz}" />

    <h4>EventSelection for {decodeURIComponent(params.orgIz)}</h4>

    <p />

    {#if currentViewMode != 'Unknown'}
        <div>

            {#each getOrgEventsAsList(currentViewMode) as eventConfig}
                <div
                    class="panel panel-info"
                    on:click={() => doSelect(eventConfig)}>
                    <a href="javascript:void(0);">{getRaceName(eventConfig)}</a>
                </div>
            {/each}
        </div>

        <hr />
        <SpinnerButton on:click={() => (currentViewMode = getInactiveMode())}>
            View {getInactiveMode(currentViewMode)} Races
        </SpinnerButton>
    {:else}
        <p>Loading Events...</p>
    {/if}
</div>
