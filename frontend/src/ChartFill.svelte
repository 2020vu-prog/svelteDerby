<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { raceConfig, statusMessage, selectedDriverMap, selectedDriverList } from "./stores.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { getChartJson } from "./utils.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";

    import axios from "axios";
    export let params = {};
    var chartId = undefined;
    var mounted = false;
    var submitSpinning = false;
    var seeds = [];
    onMount(async () => {
        log.debug("mounted focus: ", params);
        log.debug("mounted drivers: ", $selectedDriverMap);

        chartId = params.chartId;
        mounted = true;
        await refreshDataFromDb();
    });
    async function refreshDataFromDb(trigger) {
        if (!params.chartId) return;

        log.debug("chartFill: refreshDataFromDb data:", trigger);

        const bmdFromDexie = await db.BracketMetaData.get(params.chartId);

        log.debug("chartFill: refreshDataFromDb gave:", bmdFromDexie);
        const chartjson = await getChartJson(bmdFromDexie.jsonPath);
        if (chartjson) {
            log.debug("chartFill: seeds:", chartjson.seeds);
            seeds = chartjson.seeds;
        }

        updateBoundVars(bmdFromDexie);
    }
    const updateBoundVars = async (bmdFromDexie) => {
        //Object.assign(chartForm, bmdFromDexie);
        log.debug("chartFill: updateBoundVars gave:", chartForm);
        chartForm.name = bmdFromDexie.bracketName;
        chartForm.id = bmdFromDexie.SK;
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
                text: "chartFill failed: " + error,
                type: "error",
            };
            //log.debug("driverAdd failed: " + err)
        }
    }

    const chartForm = { name: undefined };
</script>

<h3>Fill Chart [Initial Seeds]</h3>

<form>

    <label>
        Bracket Name:
        <input bind:value={chartForm.name} disabled="true" />
    </label>

    <SpinnerButton on:click={(event)=> {
        push(`/drivers/selectable=true`);
        event.stopPropagation();
        }}>
        Select Drivers
    </SpinnerButton>
    {#if $selectedDriverList.length}
        <SpinnerButton spinning={submitSpinning}>Randomize</SpinnerButton>
        <p/>
        Selected: {$selectedDriverList}
    {/if}
    {#each seeds as seed}
        <Card class="mt-3 border border-info">
            <CardBody>{seed}</CardBody>
        </Card>
    {/each}
</form>
