<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        axios,
        raceConfig,
        statusMessage,
        selectedDriverList,
        selectedDriverMap,
    } from "./stores.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { getChartJson } from "./utils.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import { spring } from "svelte/motion";
    import Pie from "./Pie.svelte";
    const crypto = require("crypto");
    export let params = {};
    var chartId = undefined;
    var mounted = false;
    var pieShowing = false;
    var seeds = [];
    onMount(async () => {
        log.debug("ChartFill mounted focus: ", params);

        chartId = params.chartId;
        mounted = true;
        await refreshDataFromDb();
        fillRandom();
    });
    function getShaCars(seed, carList) {
        var rc = [];
        var shaMap = {};
        log.debug("getShaCars: Begin:", seed);

        carList.forEach((carNumber) => {
            const seededCar = "" + carNumber + ":" + seed;
            const sha = crypto
                .createHash("sha256")
                .update(seededCar)
                .digest("hex");
            shaMap[sha] = carNumber;
        });
        var shaKeys = Object.keys(shaMap);
        shaKeys.sort();

        shaKeys.forEach((shaKey) => {
            const nextCar = shaMap[shaKey];
            log.debug("getShaCars: ", nextCar, " shaKey:", shaKey);
            rc.push(nextCar);
        });
        return rc;
    }
    var numPieParts = 0;
    var currentPiePart = 0;

    const ps = spring(0, { stiffness: 0.08, damping: 1 });

    async function fillRandom() {
        const fillMap = {};
        if ($selectedDriverList.length == 0) {
            log.debug("ChartFill skipped: ", params);
            return;
        }

        log.debug("ChartFill filling: ", params);
        const loadMe = getShaCars(new Date().getTime(), $selectedDriverList);
        log.debug("ChartFill fill order: ", loadMe);
        seeds.forEach((seed) => {
            const heat = seed.slice(0, -1); //'abcde'
            if (!fillMap[heat]) {
                fillMap[heat] = {};
            }

            const nextCar = loadMe.shift();
            if (nextCar) {
                fillMap[heat][seed] = {
                    status: "ptcp",
                    ptcp: nextCar,
                };
            } else {
                fillMap[heat][seed] = {
                    status: "bye",
                };
            }
        });
        log.debug("ChartFill fillMap: ", fillMap);

        numPieParts = Object.keys(fillMap).length;

        pieShowing = true;

        for (const heat of Object.keys(fillMap).reverse()) {
            await handleSubmit(heat, fillMap[heat]);
            currentPiePart++;
            ps.set((currentPiePart / numPieParts) * 100);
        }
        pieShowing = false;
        $selectedDriverMap = {};
        push("/ChartList");
    }
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

    async function handleSubmit(heat, posMap) {
        log.debug("Filling:" + JSON.stringify(posMap));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            chartId: params.chartId,
            pos: {},
            heatNumber: heat,
        };

        var validCount = 0;
        ["A", "B"].forEach((ab) => {
            if (posMap[heat + ab]) {
                req.pos[ab] = posMap[heat + ab];
            }
        });

        try {
            const response = await $axios.post(
                $raceConfig.baseUrl + "/addChartPosition",
                req
            );
            log.debug("addChartPosition axios success ", response);
            if (response.data.error) {
                $statusMessage = {
                    text: response.data.error,
                    type: "error",
                };
            }
        } catch (err) {
            pieShowing = false;
            log.debug("addChartPosition failed: " + err);
        }
    }

    const chartForm = { name: undefined };
</script>

<style>
    /* The Modal (background) */
    .modal {
        display: block;
        position: fixed; /* Stay in place */
        z-index: 1; /* Sit on top */
        left: 0;
        top: 0;
        height: 100%; /* Full height */
        overflow: auto; /* Enable scroll if needed */
        background-color: rgb(0, 0, 0); /* Fallback color */
        background-color: rgba(0, 0, 0, 0.4); /* Black w/ opacity */
        text-align: center;
    }

    /* Modal Content/Box */
    .modal-content {
        background-color: #fefefe;
        margin: 15% auto; /* 15% from the top and centered */
        padding: 20px;
        border: 1px solid #888;
        width: min-content;
    }
</style>

<h3>Fill Chart [Initial Seeds]</h3>

<form>

    <label>
        Bracket Name:
        <input bind:value={chartForm.name} disabled="true" />
    </label>

    <SpinnerButton
        on:click={(event) => {
            push(`/drivers/selectable=true`);
            event.stopPropagation();
        }}>
        Select Drivers
    </SpinnerButton>
    {#if $selectedDriverList.length}Selected: {$selectedDriverList}{/if}
    {#each seeds as seed}
        <Card class="mt-3 border border-info">
            <CardBody>{seed}</CardBody>
        </Card>
    {/each}

    {#if true}
        <div id="myModal" class="modal">

            <!-- Modal content -->
            <div class="modal-content">
                <p>AutoFill Progress:</p>
                <Pie size={150} percent={$ps} />
            </div>

        </div>
    {/if}
</form>
