<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import {
        axios,
        raceConfig,
        statusMessage,
        driverMap,
        enableFractionalMs,
    } from "./stores.js";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";
    import { db } from "./eventDb.js";
    import { fmtChartPosition } from "./utils.js";

    export let params = {};

    let rpFromDexie = {};
    let pendingNeeded = true;
    var submitDisabled = false;
    var submitSpinning = false;

    log.debug("ManualTimeAdd", params);

    onMount(async () => {
        let ignoreHeat = "";
        checkAndApplyURLParams();
        await getCarNumbersFromRP();
        log.debug("ManualTimeAdd rpd pn:", rpFromDexie);
        [ignoreHeat, pendingNeeded] = await fmtChartPosition(rpFromDexie);
        //log.debug("ManualTimeAdd pn:", pendingNeeded);
    });

    function validateTimerData(laneX) {
        if ($enableFractionalMs) {
            return true; // skip edit if prefs allow
        }
        if (laneX.toString().includes(".")) {
            $statusMessage = {
                text: `Invalid Input: [${laneX}] (do not include decimal for time).`,
                type: "error",
            };
            return false;
        }
        return true;
    }

    async function handleSubmit() {
        log.debug("Manual Timer:" + JSON.stringify(resultForm));
        if (resultForm.lane1 == "0") {
            resultForm.lane1 = 0;
        }
        if (resultForm.lane2 == "0") {
            resultForm.lane2 = 0;
        }

        var errorCount = 0;

        [resultForm.lane1, resultForm.lane2].forEach((laneX) => {
            validateTimerData(laneX) || errorCount++;
        });
        log.debug("mta errorCount:", errorCount);
        if (errorCount > 0) {
            return;
        }
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,

            SK: params.rpKey,

            phr: [
                getResultMicros(resultForm.lane1),
                getResultMicros(resultForm.lane2),
            ].reverse(),
        };

        const endPoint = "/doApplyFinishTime";
        try {
            submitSpinning = true;
            const response = await $axios.post(
                $raceConfig.baseUrl + endPoint,
                req
            );
            if (response.data.error) {
                submitSpinning = false;
                log.debug("add failed", response);
                $statusMessage = {
                    text: response.data.error,
                    type: "error",
                };
            } else {
                log.debug(endPoint + " axios success");
                pop();
            }
        } catch (err) {
            log.debug(endPoint + " failed: " + err);
        }
        resultForm.lane1 = "0";
        resultForm.lane2 = "0";
    }
    function getResultMicros(resultMillis) {
        return Number(resultMillis) * 1000;
    }
    const resultForm = {
        lane1: "0",
        lane2: "0",
    };

    const getUrlVars = () => {
        var vars = {};
        var parts = window.location.href.replace(
            /[?&]+([^=&]+)=([^&]*)/gi,
            function (m, key, value) {
                vars[key] = value;
            }
        );
        return vars;
    };

    var carNumber1 = getUrlVars()["carNumber1"];
    var carNumber2 = getUrlVars()["carNumber2"];

    const getDriverName = (number) => {
        log.debug("gdn: " + number);
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return "Unknown Racer";
        }
    };

    function checkAndApplyURLParams() {
        if (params.winningLane && params.winningTime) {
            if (params.winningLane == 1) {
                resultForm.lane1 = Number(params.winningTime);
            } else if (params.winningLane == 2) {
                resultForm.lane2 = Number(params.winningTime);
            }
        }
    }

    async function getCarNumbersFromRP() {
        rpFromDexie = await db.RacePhase.get(params.rpKey);
        carNumber1 = rpFromDexie.cn[0];
        carNumber2 = rpFromDexie.cn[1];
    }
</script>

<style>
    .column {
        float: left;
        width: 50%;
        text-align: center;
    }

    /* Clear floats after the columns */
    .row:after {
        content: "";
        display: table;
        clear: both;
    }
</style>

<div style="width: 100%; text-align: center;">
    <h3>Manual Timing Results</h3>
</div>

<form>
    {#if pendingNeeded}
        <div class="row">
            <div class="column">
                <h3>Lane 1</h3>
                <h4>Car Number: {carNumber1}</h4>
                <h5>Racer: {getDriverName(carNumber1)}</h5>
                <label>
                    Lane 1 Won by
                    <input
                        size="4"
                        type="number"
                        bind:value={resultForm.lane1}
                        placeholder="Lane1[{carNumber1}] MS"
                    />
                    MS
                </label>
            </div>

            <div class="column">
                <h3>Lane 2</h3>
                <h4>Car Number: {carNumber2}</h4>
                <h5>Racer: {getDriverName(carNumber2)}</h5>
                <label>
                    Lane 2 Won by
                    <input
                        size="4"
                        type="number"
                        bind:value={resultForm.lane2}
                        placeholder="Lane2[{carNumber2}] MS"
                    />
                    MS
                </label>
            </div>
        </div>
        <div style="width: 100%; text-align: center;">
            <SpinnerButton
                disabled={submitDisabled}
                on:click={handleSubmit}
                spinning={submitSpinning}
            >
                Apply Time
            </SpinnerButton>
        </div>
    {:else}
        <SpinnerButton on:click={handleSubmit} spinning={submitSpinning}>
            Complete Phase
        </SpinnerButton>
    {/if}
</form>
