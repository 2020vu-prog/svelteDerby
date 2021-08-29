<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { raceConfig, setCacheKey, statusMessage } from "./stores.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    const { v4: uuidv4 } = require("uuid");
    import { db } from "./eventDb.js";
    import axios from "axios";

    export let params = {};

    var mounted = false;

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

        log.debug("Adding:" + JSON.stringify(orgForm), " to: ", $raceConfig);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        const orgU = uuidv4().substring(0, 5);
        const orgIz = isUpdateMode() ? $raceConfig.orgIz : params.orgIz;
        if (!orgIz) {
            log.debug("Cannot add w/o org");
            return;
        }
        var orgId = "";
        var postPath = "";
        if (isUpdateMode()) {
            orgId = $raceConfig.orgId;
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

        log.debug("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        axios
            .post($raceConfig.baseUrl + postPath, req)
            .then((response) => {
                log.debug("addEventConfig axios success");
                $statusMessage = {
                    text: `Event [${params.mode}] Complete.`,
                    type: "success",
                };
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

        const eventKey = $raceConfig.orgIz + ":" + $raceConfig.orgId;
        log.debug("eventAdd: refreshDataFromDb key:", eventKey);

        const eventFromDexie = await db.EventConfig.get(eventKey);

        log.debug("eventAdd: refreshDataFromDb gave:", eventFromDexie);

        updateBoundVars(eventFromDexie);
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
            submitDisabled = false;
            return; //bypass update disabled logic.
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

<form>

    <label>
        Name:
        <input
            id="name"
            type="text"
            bind:value={orgForm.name}
            placeholder="Event Name"
            on:keyup={() => {
                syncAddButton();
            }} />
    </label>
    <label>
        PA Channel:
        <input
            type="text"
            bind:value={orgForm.paUri}
            placeholder="Zello Channel"
            on:keyup={() => {
                syncAddButton();
            }} />

    </label>
    <label>
        LowCarLane1:
        <input
            type="checkbox"
            id="lcl1"
            on:change={syncAddButton()}
            bind:checked={orgForm.lcl1} />
    </label>
    <label>
        Limit Pending 1 Race At a Time:
        <input
            type="checkbox"
            id="pending1Race"
            bind:checked={orgForm.pending1Race} />
    </label>
    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}>
        {params.mode}
    </SpinnerButton>
</form>
