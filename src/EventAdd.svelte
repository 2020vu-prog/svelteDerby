<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { raceConfig, setCacheKey } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    const { v4: uuidv4 } = require("uuid");
    import axios from "axios";

    export let params = {};

    var mounted = false;

    var submitDisabled = true;
    var submitSpinning = false;

    async function handleSubmit() {
        syncAddButton();

        log.debug("Adding:" + JSON.stringify(orgForm), " to: ", $raceConfig);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        const orgU = uuidv4().substring(0, 5);
        const orgIz = params.orgIz;
        if (!orgIz) {
            log.debug("Cannot add w/o org");
            return;
        }
        const req = {
            orgId: orgIz + "." + orgU,
            orgIz: orgIz,
            lcl1: String(orgForm.lcl1),
            pendingRule: orgForm.pending1Race ? "1Race" : "1Pair",
            name: orgForm.name,
        };

        submitSpinning = true;

        log.debug("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        axios
            .post($raceConfig.baseUrl + "/addEventConfig", req)
            .then((response) => {
                log.debug("addEventConfig axios success");
                setCacheKey(new Date().getTime()); // force disable cache to expose new event on local browser.
                pop();
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
        mounted = true;
    });

    const syncAddButton = () => {
        if (!mounted) {
            return;
        }
        if (orgForm.name != "" && orgForm.name != undefined) {
            log.debug("name: " + orgForm.name);
            submitDisabled = false;
        } else {
            submitDisabled = true;
        }
    };
</script>

<h3>Add Event</h3>

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
        Add
    </SpinnerButton>
</form>
