<script>
    import log from "loglevel";

    import SpinnerButton from "#src/SpinnerButton.svelte";
    import {
        axios,
        raceConfig,
        setCacheKey,
        pushMessage,
    } from "#src/stores.js";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    const { v4: uuidv4 } = require("uuid");
    import { db } from "#src/eventDb.js";

    export let params = {};

    var mounted = false;
    let loadedEvent = null;

    function matchesSelectedEvent(
        event,
        routeParams = params,
        config = $raceConfig
    ) {
        return Boolean(
            event?.orgId &&
            routeParams.orgIz === event.orgIz &&
            event.orgIz === config.orgIz &&
            event.orgId === config.orgId
        );
    }
    $: updateTargetValid = matchesSelectedEvent(
        loadedEvent,
        params,
        $raceConfig
    );

    $: updateBlocked = params.mode === "Update" && !updateTargetValid;

    var submitDisabled = true;
    var submitSpinning = false;

    function isUpdateMode() {
        return params.mode === "Update";
    }
    function stringIsTrue(stringValue) {
        return stringValue.toLowerCase() == "true" ? true : false;
    }
    async function handleSubmit() {
        syncAddButton();
        if (
            submitDisabled ||
            (isUpdateMode() && !matchesSelectedEvent(loadedEvent))
        )
            return;

        log.debug("Adding:" + JSON.stringify(orgForm), " to: ", $raceConfig);
        const orgU = uuidv4().substring(0, 5);
        const orgIz = params.orgIz;
        if (!orgIz) {
            log.debug("Cannot add w/o org");
            return;
        }
        var orgId = "";
        var postPath = "";
        if (isUpdateMode()) {
            orgId = loadedEvent.orgId;
            postPath = "/updateEventConfig";
        } else {
            orgId = orgIz + "." + orgU;
            postPath = "/addEventConfig";
        }
        const req = {
            orgId: orgId,
            orgIz: orgIz,
            mode: params.mode,
            lcl1: String(orgForm.lcl1),
            pendingRule: orgForm.pending1Race ? "1Race" : "1Pair",
            name: orgForm.name,
            paUri: orgForm.paUri,
        };

        submitSpinning = true;

        $axios
            .post($raceConfig.baseUrl + postPath, req)
            .then((response) => {
                log.debug("addEventConfig axios success");
                pushMessage({
                    text: `Event [${params.mode}] Complete.`,
                    type: "success",
                });
                if (params.mode === "Add") {
                    setCacheKey(new Date().getTime()); // force disable cache to expose new event on local browser.
                    pop();
                } else {
                    replace("/");
                }
            })
            .catch((err) => {
                submitSpinning = false;
                log.debug("addEventConfig failed: " + err);
            });
        orgForm = getDefaultOrgForm();
    }
    var orgForm = {};
    const getDefaultOrgForm = () => {
        return {
            name: "",
            lcl1: true,
            pending1Race: true,
        };
    };
    orgForm = getDefaultOrgForm();
    onMount(async () => {
        log.debug(`EventAdd mode: ${params.mode}`);
        log.debug(`EventAdd orgIz: ${params.orgIz}`);
        await refreshDataFromDb();
        mounted = true;
    });
    async function refreshDataFromDb(trigger) {
        if (params.mode !== "Update") return;

        const target = { orgIz: params.orgIz, orgId: $raceConfig.orgId };
        if (!matchesSelectedEvent(target)) return;
        const eventKey = target.orgIz + ":" + target.orgId;
        log.debug("eventAdd: refreshDataFromDb key:", eventKey);

        const eventFromDexie = await db.EventConfig.get(eventKey);

        log.debug("eventAdd: refreshDataFromDb gave:", eventFromDexie);

        if (!eventFromDexie || !matchesSelectedEvent(target)) return;
        updateBoundVars(eventFromDexie);
        loadedEvent = target;
    }

    const updateBoundVars = async (eventFromDexie) => {
        Object.assign(orgForm, eventFromDexie);
        log.debug("EventAdd: updateBoundVars gave:", orgForm);
        orgForm.name = eventFromDexie.name;
        orgForm.lcl1 = stringIsTrue(eventFromDexie.lcl1);
        orgForm.pending1Race =
            eventFromDexie.pendingRule === "1Race" ? true : false;
        orgForm.paUri = eventFromDexie.paUri;
    };
    function syncAddButton() {
        if (isUpdateMode()) {
            submitDisabled = !matchesSelectedEvent(loadedEvent);
            return;
        }
        if (!mounted) {
            return;
        }
        if (orgForm.name != "" && orgForm.name != undefined) {
            log.debug("name: " + orgForm.name);
            submitDisabled = false;
        } else {
            submitDisabled = true;
        }
    }
</script>

<h3>{params.mode} Event</h3>

{#if updateBlocked}
    <p>Select the event and reopen its edit page to load its settings.</p>
{/if}

<form hidden={updateBlocked}>
    <label>
        Name:
        <input
            id="name"
            type="text"
            bind:value={orgForm.name}
            placeholder="Event Name"
            on:keyup={() => {
                syncAddButton();
            }}
        />
    </label>
    <label>
        PA Channel:
        <input
            type="text"
            bind:value={orgForm.paUri}
            placeholder="Zello Channel"
            on:keyup={() => {
                syncAddButton();
            }}
        />
    </label>
    <label>
        LowCarLane1:
        <input
            type="checkbox"
            class="big"
            id="lcl1"
            on:change={syncAddButton()}
            bind:checked={orgForm.lcl1}
        />
    </label>
    <label>
        Limit Pending 1 Race At a Time:
        <input
            type="checkbox"
            class="big"
            id="pending1Race"
            bind:checked={orgForm.pending1Race}
        />
    </label>
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}
    >
        {params.mode}
    </SpinnerButton>
</form>
