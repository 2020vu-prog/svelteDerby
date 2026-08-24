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
        pushMessage,
        axios,
        recentRefreshMs,
    } from "./stores.js";

    import SpinnerButton from "./SpinnerButton.svelte";

    import OrgName from "./OrgName.svelte";
    import { onMount, tick } from "svelte";
    import {
        location as ssrLocation,
        replace,
        querystring,
    } from "svelte-spa-router";
    import { dbReset } from "./eventDb.js";

    import { refreshOrgRoles } from "./utils.js";

    export let params = {};

    let waitingForReloadBeginMs = 0;
    var currentViewMode = "Unknown";

    var eventMap = {};
    var selectedEventMap = {};
    $: {
        log.debug("EventSelection: bound eventMap: ", eventMap);
    }
    let previousActivate = false;
    async function activateNewest() {
        const tag = "activateNewest";
        if (previousActivate) {
            log.debug(`${tag} skipping concurrent request`);
            return;
        }
        previousActivate = true;
        try {
            // Retry a failed/empty lookup once, while retaining normal cache behavior.
            for (let attempt = 0; attempt < 2; attempt++) {
                if (attempt || Object.keys(eventMap).length === 0) {
                    await refreshOrgEvents();
                }
                const orgEvents = Object.values(eventMap);
                let selectedConfig = { at: 0 };
                if (params.orgId) {
                    selectedConfig = orgEvents.find(
                        (cfg) => cfg.orgId === params.orgId
                    );
                } else {
                    for (const cfg of orgEvents) {
                        if (cfg.at > selectedConfig.at) selectedConfig = cfg;
                    }
                }
                if (selectedConfig && selectedConfig.SK) {
                    await doSelect(selectedConfig);
                    return;
                }
            }
            pushMessage({
                text: `AS: No Eligible event.`,
            });
        } catch (err) {
            log.error(`${tag} failed`, err);
            pushMessage({
                text: `Unable to select shared event.`,
                type: "error",
            });
        } finally {
            previousActivate = false;
        }
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
        return eventMap;
    };

    let mounted = false;
    onMount(async () => {
        log.debug("EventSelection: current page is ", $ssrLocation);
        try {
            await refreshOrgEvents();
            await refreshOrgRoles(params.orgIz);
        } catch (err) {
            log.error("EventSelection: mount error;", err);
        }

        mounted = true;
        if (isAutoSelectRequested()) {
            await activateNewest();
        }
    });
    function isAutoSelectRequested() {
        if (new URLSearchParams($querystring).get("as")) {
            // qr code 'autoSelect'!
            return true;
        }
        if ($ssrLocation.startsWith("/as/")) {
            return true;
        }
    }

    const requestClearStore = () => {
        $doRefreshBlocks = -1;
    };
    const doSelect = async (config) => {
        log.debug("selected:", config);
        if (
            $raceConfig.orgIz === config.orgIz &&
            $raceConfig.orgId === config.orgId
        ) {
            pushMessage({
                text: `Event already active.`,
            });
            replace("/RpList");
            return;
        }

        await dbReset();
        log.debug("db reset complete.");

        requestClearStore();
        log.debug("requestClearStore  complete.");

        config.baseUrl = "/app";
        config.title = getRaceName(config);
        log.debug("selecting config:", config);

        waitingForReloadBeginMs = new Date().getTime();
        $raceConfig = config;
    };

    $: {
        if ($recentRefreshMs) reloadWaitComplete();
    }

    function reloadWaitComplete(requestMS) {
        if (!waitingForReloadBeginMs) return;
        if (waitingForReloadBeginMs > $recentRefreshMs) return;

        $clearOldStatusMessages = true;

        replace("/RpList");
    }
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
    <h4>
        EventSelection for
        <OrgName orgIz={decodeURIComponent(params.orgIz)} />
    </h4>

    <p />
    {#if waitingForReloadBeginMs}
        <h4>
            Loading Event... Please Wait
            <br />
            <SpinnerButton spinning="true">Loading</SpinnerButton>
        </h4>
    {:else if currentViewMode != "Unknown"}
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
        <SpinnerButton disabled={true} spinning={true}>
            Loading Events
        </SpinnerButton>
    {/if}
</div>
