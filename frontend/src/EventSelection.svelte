<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";

    import {
        nextOnBlockKey,
        racePhaseMap,
        doRefreshBlocks,
        raceConfig,
        getCacheKey,
        clearOldStatusMessages,
        getOrgName,
    } from "./stores.js";

    import SpinnerButton from "./SpinnerButton.svelte";

    import MaterialAdd from "./MaterialAdd.svelte";
    import { onMount } from "svelte";
    import { Auth } from "aws-amplify";
    import axios from "axios";
    import { push, pop, replace } from "svelte-spa-router";
    import { dbReset } from "./eventDb.js";

    import { refreshOrgRoles } from "./utils.js";

    export let params = {};

    var currentViewMode = "Unknown";

    var eventMap = {};
    var selectedEventMap = {};
    $: {
        log.debug("bound eventMap: ", eventMap);
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
        log.debug("refreshOrgMap:");
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
                log.debug("refreshOrgMap length:" + response.data.length);
                log.debug("refreshOrgMap:", response.data);
                eventMap = response.data;
                currentViewMode = "Active";
            })
            .catch((err) => {
                log.debug(err);
            });
    };

    onMount(async () => {
        await refreshOrgMap();
        await refreshOrgRoles(params.orgIz);
    });
    const requestClearStore = () => {
        $doRefreshBlocks = -1;
    };
    const doSelect = async (config) => {
        log.debug("selected:", config);
        await dbReset();
        log.debug("db reset complete.");

        requestClearStore();
        log.debug("requestClearStore  complete.");

        log.debug("selecting config:", config);
        config.baseUrl = "/app";
        config.title = getRaceName(config);

        $raceConfig = config;
        $clearOldStatusMessages = true;

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

        log.debug("eventMap: ", eventMap);

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

        log.debug("filteredEventMap: ", filtered);
        selectedEventMap = filtered;
    }
</script>

<div>
    <MaterialAdd
        overrideOrgIz={params.orgIz}
        clickHandleRoute="/eventAdd/{params.orgIz}/Add" />

    <h4>EventSelection for {getOrgName(decodeURIComponent(params.orgIz))}</h4>

    <p />

    {#if currentViewMode != 'Unknown'}
        <div>

            {#each getOrgEventsAsList(currentViewMode) as eventConfig}
                <Card class="mt-3 border border-info">
                    <CardBody>
                        <div on:click={() => doSelect(eventConfig)}>
                            <a href="javascript:void(0);">
                                {getRaceName(eventConfig)}
                            </a>
                        </div>
                    </CardBody>
                </Card>
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
