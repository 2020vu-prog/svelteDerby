<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { raceConfig, statusMessage } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    import axios from "axios";
    export let params = {};
    var chartId = undefined;
    var mounted = false;
    var submitSpinning = false;
    onMount(async () => {
        log.debug("mounted focus: ", params);

        chartId = params.chartId;
        mounted = true;
        await refreshDataFromDb();
    });
    async function refreshDataFromDb(trigger) {
        if (!params.chartId) return;

        log.debug("chartEdit: refreshDataFromDb data:", trigger);

        const bmdFromDexie = await db.BracketMetaData.get(params.chartId);

        log.debug("chartEdit: refreshDataFromDb gave:", bmdFromDexie);

        updateBoundVars(bmdFromDexie);
    }
    const updateBoundVars = async (bmdFromDexie) => {
        //Object.assign(chartForm, bmdFromDexie);
        log.debug("chartEdit: updateBoundVars gave:", chartForm);
        chartForm.name = bmdFromDexie.bracketName;
        chartForm.id = bmdFromDexie.SK;
        chartForm.hidden = bmdFromDexie.del ? true : false;
    };
    async function handleSubmit() {
        log.debug(`handleSubmit: ` + JSON.stringify(chartForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            SK: chartId,
            bracketName: chartForm.name,
            del: chartForm.hidden,
        };

        log.debug("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        const url = $raceConfig.baseUrl + "/addChart";
        submitSpinning = true;
        try {
            const response = await axios.post(url, req);
            $statusMessage = {
                text: `Chart [${chartForm.name}] Updated.`,
                type: "success",
            };
            pop();
        } catch (error) {
            submitSpinning = false;
            $statusMessage = {
                text: "chartEdit failed: " + error,
                type: "error",
            };
            //log.debug("driverAdd failed: " + err)
        }
    }

    const chartForm = { name: undefined, hidden: undefined };
</script>

<h3>Edit Chart</h3>

<form>

    <label>
        Bracket Name:
        <input bind:value={chartForm.name} placeholder="Bracket Name" />
    </label>

    <label>
        Hidden:
        <input type="checkbox" bind:checked={chartForm.hidden} />
    </label>

    <SpinnerButton on:click={handleSubmit} spinning={submitSpinning}>
        Update
    </SpinnerButton>
</form>
