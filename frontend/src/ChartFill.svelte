<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import { axios, raceConfig, statusMessage, selectedDriverList } from "./stores.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { getChartJson } from "./utils.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    const crypto = require("crypto");
    export let params = {};
    var chartId = undefined;
    var mounted = false;
    var submitSpinning = false;
    var seeds = [];
    onMount(async () => {
        log.debug("ChartFill mounted focus: ", params);

        chartId = params.chartId;
        mounted = true;
        await refreshDataFromDb();
        fillRandom()
    });
    function getShaCars(seed, carList) {
        var rc = [];
        var shaMap = {};
        log.debug("getShaCars: Begin:", seed);

        carList.forEach((carNumber) => {
            const seededCar = "" + carNumber + ":" + seed;
            const sha = crypto.createHash("sha256").update(seededCar).digest("hex");
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
    function fillRandom() {
        const fillMap = {}
        const fillHeats = {}
        if ($selectedDriverList.length == 0) {
            log.debug("ChartFill skipped: ", params);
            return
        }

        log.debug("ChartFill filling: ", params);
        const loadMe = getShaCars(new Date().getTime(), $selectedDriverList)
        log.debug("ChartFill fill order: ", loadMe);
        seeds.forEach((seed) => {
            fillMap[seed] = loadMe.shift()
            const heat = seed.slice(0, -1) //'abcde'

            fillHeats[heat] = true
        });
        log.debug("ChartFill fillMap: ", fillMap);
        log.debug("ChartFill heats: ", fillHeats);
        //Object.keys(fillHeats).forEach((heat) => {
        //}
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

    async function handleSubmit() {
        log.debug("Filling:" + JSON.stringify(posForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            chartId: params.chartId,
            pos: {},
            heatNumber: params.chartPosition,
        };

        var validCount = 0;
        ["A", "B"].forEach((ab) => {
            // this should probably happen on load
            if (!posForm[ab].seedType) {
                posForm[ab].seedType = "ptcp";
            }
            var seedObject = {
                status: posForm[ab].seedType,
                ptcp: "",
            };

            log.debug("Initialized seedObject:", seedObject);
            if (
                seedObject.status === "ptcp" ||
                seedObject.status === "forfeit"
            ) {
                if (!posForm[ab].carNumber) {
                    log.debug("allow empty preSeed:", posForm[ab]);
                    // let empty/null/undefined racers through bracket mgmt.  they may not be known yet.
                } else if (participantValid(posForm[ab].carNumber)) {
                    log.debug("valid preSeed:", posForm[ab]);

                    seedObject.ptcp = posForm[ab].carNumber.toString();
                } else {
                    log.debug("invalid preSeed:", posForm[ab]);
                    $statusMessage = {
                        text: `Invalid Participant: [${posForm[ab].carNumber}]`,
                        type: "error",
                    };
                    return; // return from closure [AB]
                }
            }

            if (
                (seedObject.ptcp && seedObject.status === "forfeit") ||
                seedObject.status === "bye" ||
                seedObject.status === "ptcp" // allow empty ptcp (waiting for bracket prgress)
            ) {
                log.debug("Good seedObject:", seedObject);
                req.pos[ab] = seedObject;
            } else {
                log.debug("Skip seedObject:", seedObject);
            }
            validCount++;
        });

        if (validCount < 2) {
            return;
        }
        log.debug("token:" + bearer);

        submitSpinning = true;


        $axios
            .post($raceConfig.baseUrl + "/addChartPosition", req)
            .then((response) => {
                log.debug("addChartPosition axios success ", response);
                if (response.data.error) {
                    $statusMessage = {
                        text: response.data.error,
                        type: "error",
                    };
                } else {
                    pop();
                }
            })
            .catch((err) => {
                submitSpinning = false;
                log.debug("addChartPosition failed: " + err);
            });
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
