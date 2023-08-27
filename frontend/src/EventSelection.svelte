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
        statusMessage,
        axios,
        userEmail,
    } from "./stores.js";

    import SpinnerButton from "./SpinnerButton.svelte";

    import MaterialAdd from "./MaterialAdd.svelte";
    import OrgName from "./OrgName.svelte";
    import { onMount } from "svelte";
    import { location, replace, querystring } from "svelte-spa-router";
    import { dbReset } from "./eventDb.js";

    import { refreshOrgRoles } from "./utils.js";
    import { setJwt } from "./utils.js";

    export let params = {};

    var currentViewMode = "Unknown";

    var eventMap = {};
    var selectedEventMap = {};
    $: {
        log.debug("EventSelection: bound eventMap: ", eventMap);
    }
    $: {
        //recheck auto select after login/eventmap populated!
        if (mounted) potentialAutoSelect($userEmail);
    }
    let activating = false;
    function activateNewest() {
        if (!$userEmail) {
            //auto select requires auth :-(
            $statusMessage = {
                text: `AS: No Eligible user.`,
            };
            return;
        }
        const orgEvents = Object.values(eventMap);
        if (orgEvents.length == 0) {
            $statusMessage = {
                text: `AS: No Eligible map.`,
            };
            return;
        }

        //only one activation allowed!
        if (activating) {
            $statusMessage = {
                text: `AS: Skipping, previous runner: ${userEmail} ${activating}`,
            };
            return;
        }
        activating = $userEmail

        let selectedConfig = {
            at: 0,
        };
        for (const cfg of orgEvents) {
            if (cfg.at > selectedConfig.at) {
                selectedConfig = cfg;
            }
        }

        if (!selectedConfig.SK) {
            $statusMessage = {
                text: `AS: No Eligible event.`,
            };
            return;
        }

        doSelect(selectedConfig);
    }
    const getOrgEventsAsList = (viewMode) => {
        populateSelectedEventMap(currentViewMode);

        const orgEvents = Object.values(selectedEventMap);
        /*
        orgEvents.sort((a, b) => {
            return getRaceName(a).localeCompare(getRaceName(b));
        });
        */
        orgEvents.sort((a, b) => {
            return getRaceDate(b) - getRaceDate(a);
        });
        return orgEvents;
    };
    const refreshOrgEvents = async () => {
        log.debug("refreshOrgEvents:");

        const cacheKey = getCacheKey();
        try {
            const endPoint = "/listOrgEvents";
            const req = {
                orgIz: params.orgIz,
                cache: cacheKey,
            };
            const response = await $axios.get($raceConfig.baseUrl + endPoint, {
                params: req,
            });
            log.debug("refreshOrgEvents length:" + response.data.length);
            log.debug("refreshOrgEvents:", response.data);
            eventMap = response.data;
            currentViewMode = "Active";
        } catch (err) {
            log.debug(err);
        }
    };

    let mounted = false;
    onMount(async () => {
        log.debug("EventSelection: current page is ", $location);
        await refreshOrgEvents();
        await refreshOrgRoles(params.orgIz);

        mounted = true;
    });
    function potentialAutoSelect() {
        if (isAutoSelectRequested()) {
            // qr code 'autoSelect'!
            log.debug("autoSelect after refreshOrgEvents from:", eventMap);
            activateNewest();
        }
    }
    function isAutoSelectRequested() {
        if (new URLSearchParams($querystring).get("as")) {
            // qr code 'autoSelect'!
            return true;
        }
        if ($location.startsWith("/as/")) {
            return true;
        }
    }

    const requestClearStore = () => {
        $doRefreshBlocks = -1;
    };
    const doSelect = async (config) => {
        log.debug("selected:", config);
        await dbReset();
        log.debug("db reset complete.");

        requestClearStore();
        log.debug("requestClearStore  complete.");

        config.baseUrl = "/app";
        config.title = getRaceName(config);
        log.debug("selecting config:", config);

        $raceConfig = config;
        $clearOldStatusMessages = true;

        await setJwt(); // need mqtt perms if initial login didn't have selected org.
        replace("/RpList");
    };
    const getRaceName = (config) => {
        return config.name ? config.name : config.orgId;
    };
    const getRaceDate = (config) => {
        return config.at;
    };
    const fmtRaceDate = (config) => {
        return new Date(config.at).toLocaleDateString();
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
        clickHandleRoute="/eventAdd/{params.orgIz}/Add"
    />

    <h4>
        EventSelection for
        <OrgName orgIz={decodeURIComponent(params.orgIz)} />
    </h4>

    <p />

    {#if currentViewMode != "Unknown"}
        <div>
            {#each getOrgEventsAsList(currentViewMode) as eventConfig}
                <Card class="mt-3 border border-info">
                    <CardBody>
                        <div on:click={() => doSelect(eventConfig)}>
                            <a href="javascript:void(0);">
                                [{fmtRaceDate(eventConfig)}]
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
