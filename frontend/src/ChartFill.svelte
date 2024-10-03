<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        axios,
        raceConfig,
        pushMessage,
        selectedDriverList,
        selectedDriverMap,
    } from "./stores.js";
    import prand from 'pure-rand';

    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import { getChartJson, sleep } from "./utils.js";
    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import PieProgress from "./PieProgress.svelte";
    const crypto = require("crypto");
    export let params = {};
    var chartId = undefined;
    var mounted = false;
    var pieShowing = false;
    var piePercent = 0;
    var seeds = [];
    var bracketD;
    var chartIsEmpty = false;
    onMount(async () => {
        log.debug("ChartFill mounted focus: ", params);

        chartId = params.chartId;
        mounted = true;
        await refreshDataFromDb();
        await getChartIsEmpty();
    });
    function getPrngCars(seed, carList){
        log.debug(`ChartFill getPrngCars ${seed} input: `, carList);
        const g = prand.xoroshiro128plus(seed);
        const rand = (min, max) => {
            return prand.unsafeUniformIntDistribution(min, max, g);
        };
        fisherYates(carList, rand);
        log.debug(`ChartFill getPrngCars ${seed}  gave: `, carList);
    }
    function fisherYates(data, rand) {
  // for i from n−1 downto 1 do
  //j ← random integer such that 0 ≤ j ≤ i
  //exchange a[j] and a[i]
  for (let i = data.length - 1; i >= 1; --i) {
    const j = rand(0, i); // such that 0 ≤ j ≤ i
    const tmp = data[j];
    data[j] = data[i];
    data[i] = tmp;
  }
}
    async function fillRandom() {
        const fillMap = {};
        if ($selectedDriverList.length == 0) {
            log.debug("ChartFill skipped: ", params);
            return;
        }

        if ($selectedDriverList.length > seeds.length) {
            pushMessage( {
                text: `Selected [${$selectedDriverList.length}] drivers for a chart with only [${seeds.length}] seeds`,
                type: "error",
            });
            return;
        }

        log.debug("ChartFill filling: ", params);
        const loadMe = [...$selectedDriverList]

        const prngSeedList=[
            42,
            chartBmdSeed,
            new Date().getTime(),
        ]
        for (const prngSeed of prngSeedList) {
            getPrngCars(prngSeed, loadMe);
        }
        
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
        var currentPiePart = 0;
        var numPieParts = Object.keys(fillMap).length;

        pieShowing = true;

        for (const heat of Object.keys(fillMap).reverse()) {
            await handleSubmit(heat, fillMap[heat]);
            piePercent = (++currentPiePart / numPieParts) * 100;
            await sleep(100);
        }
        await sleep(1500);
        pieShowing = false;
        $selectedDriverMap = {};
        replace(`/ChartDetail/${params.chartId}`);
    }
    async function refreshDataFromDb(trigger) {
        if (!params.chartId) return;

        log.debug("chartFill: refreshDataFromDb data:", trigger);

        const bmdFromDexie = await db.BracketMetaData.get(params.chartId);

        log.debug("chartFill: refreshDataFromDb gave:", bmdFromDexie);
        const chartjson = await getChartJson(bmdFromDexie);
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
        chartBmdSeed=bmdFromDexie.at
    };

    async function getChartIsEmpty() {
        const bracketPosKey = `${params.chartId}:`;
        log.debug("chartIsEmpty bracketPosKey: ", bracketPosKey);
        const bp = await db.BracketPos.where(":id").startsWith(bracketPosKey);
        log.debug("chartIsEmpty got: ", bp);
        bp.count(function (count) {
            log.debug("chartIsEmpty Found: " + count);
            if (count == 0) {
                chartIsEmpty = true;
            }
            log.debug("chartIsEmpty: " + chartIsEmpty);
        });
    }
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
                pushMessage( {
                    text: response.data.error,
                    type: "error",
                });
            }
        } catch (err) {
            //pieShowing = false;
            log.debug("addChartPosition failed: " + err);
        }
    }

    const chartForm = { name: undefined };
    let chartBmdSeed=42
</script>

<h3>Fill Chart [Initial Seeds]</h3>

<form>
    <label>
        Bracket Name:
        <input bind:value={chartForm.name} disabled="true" />
    </label>

    {#if chartIsEmpty}
        <SpinnerButton
            on:click={(event) => {
                push(`/drivers/selectable=true`);
                event.stopPropagation();
            }}
        >
            Select Drivers
        </SpinnerButton>
        {#if $selectedDriverList.length}
            <SpinnerButton
                on:click={(event) => {
                    fillRandom();
                    event.stopPropagation();
                }}
            >
                Fill Chart With [{$selectedDriverList.length}] Drivers
            </SpinnerButton>
            <p />
            Selected: {$selectedDriverList.join(', ')}
        {/if}
    {:else}
        <p />
        Chart already loaded.
    {/if}

    {#if pieShowing}
        <PieProgress pieTitle="AutoFill Progress" {piePercent} />
    {:else}
        {#each seeds as seed}
            <Card class="mt-3 border border-info">
                <CardBody>{seed}</CardBody>
            </Card>
        {/each}
    {/if}
</form>
