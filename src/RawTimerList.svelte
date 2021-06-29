<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";

    import { raceConfig, statusMessage } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import RawTimerLane from "./RawTimerLane.svelte";

    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    import CalcFinish from "./CalcFinish.js";

    import axios from "axios";
    export let params = {};
    const entityFactory = new EntityFactory({});
    var mounted = false;
    var timerHistoryList = [];
    var flatHistoryList = [];
    var winnerDeltas = [];
    var timerConfig;
    const hhmmss = "hhmmss";
    onMount(async () => {
        log.debug("mounted focus: ", params);

        mounted = true;
        refreshDataFromServer();
        //testJson4Valid();
        //testJson();
    });
    function testJson() {
        winnerDeltas = require("./config/winnerTest.json");
        log.debug("testJson winnerDeltas:", winnerDeltas);
    }
    function testJson4Valid() {
        winnerDeltas = require("./config/winnerTest4Valid.json");

        log.debug("testJson4Valid winnerDeltas:", winnerDeltas);
    }
    async function refreshDataFromServer(trigger) {
        log.debug("rawTimer: refreshDataFromDb data:", trigger);

        timerHistoryList = await getTimerHistory();
        log.debug("rawTimer: refreshDataFromDb gave:", timerHistoryList);
        log.debug(`timerHistoryList: ${JSON.stringify(timerHistoryList)}`);
        if (timerHistoryList.error) {
            $statusMessage = {
                text: timerHistoryList.error,
                type: "error",
            };

            return;
        }

        const flatHistory = flattenHistory(timerHistoryList);

        const calcFinish = new CalcFinish(timerConfig);
        winnerDeltas = calcFinish.calcFinishMain(flatHistory);

        log.debug("winnerDeltas: ", JSON.stringify(winnerDeltas));
        updateBoundVars(timerHistoryList);
    }

    function flattenHistory(timerHistoryList) {
        flatHistoryList = [];
        timerHistoryList.forEach((record) => {
            if (record.dataList) {
                flatHistoryList.push(...record.dataList);
            }
            if (record.SK.startsWith("^")) {
                //timerConfig = entityFactory.build(record);
                timerConfig = record;
                log.debug("timerConfig: ", timerConfig);
            }
        });
        flatHistoryList.sort((a, b) => {
            return a.microb - b.microb;
        });
        log.debug("sorted flat:", flatHistoryList);

        return flatHistoryList;
    }

    const updateBoundVars = async (timerHistoryList) => {
        log.debug("rawTimer: updateBoundVars gave:", timerHistoryList);
    };
    async function getTimerHistory() {
        log.debug(`getTimerHistory: `);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
        };

        log.debug("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        try {
            const response = await axios.get(
                $raceConfig.baseUrl + "/getTimerHistory",
                { params: req }
            );
            const data = response.data;
            $statusMessage = {
                text: `History loaded.`,
                type: "success",
            };
            return data;
        } catch (error) {
            log.debug(error);
            $statusMessage = {
                text: "rawTimer failed: " + err,
                type: "error",
            };
        }
    }
    function getHHMMSS(winnerDelta) {
        log.debug("pubtime: ", winnerDelta.cBlock[0].pubTime);
        const pubbed = new Date(
            winnerDelta.cBlock[0].pubTime
        ).toLocaleTimeString();
        return pubbed;
    }
    function getBgColor(winnerDelta) {
        if (winnerDelta.valid) {
            return "green";
        } else {
            return "yellow";
        }
    }
    function getWinLane(winnerDelta) {
        const wt = getWinTimeMs(winnerDelta);
        if (wt > 0) return "Lane1";
        if (wt < 0) return "Lane2";
        return "";
    }
    function getWinTimeMs(winnerDelta) {
        if (winnerDelta.valid) {
            const wtMicros =
                winnerDelta.lanes.lane2.noseMicros -
                winnerDelta.lanes.lane1.noseMicros;
            return Math.round(wtMicros / 1000);
        }
        return undefined;
    }

    async function pushToManualTimer(winnerDelta) {
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        const getNextOnBlocksUrl =
            $raceConfig.baseUrl +
            "/getNextOnBlocks?orgId=" +
            $raceConfig.orgId +
            "&orgIz=" +
            $raceConfig.orgIz;
        const onBlocksResponse = await axios.get(getNextOnBlocksUrl);
        const data = onBlocksResponse.data;
        if (data && data.length > 0) {
            push(
                `/manualTimerAdd/${data[0].at}/${getWinLane(
                    winnerDelta
                ).replace(/[A-Za-z]*/g, "")}/${Math.abs(
                    getWinTimeMs(winnerDelta)
                )}`
            );
        } else {
            $statusMessage = {
                text: `There is no race on the blocks.`,
                type: "error",
            };
        }
    }

    async function shouldAllowApply(winnerDelta) {
        if (winnerDeltas.indexOf(winnerDelta) >= 3) {
            return false;
        }

        if (!winnerDelta.valid) {
            return false;
        }

        //TODO: don't allow the same time to be manually applied twice

        return true;
    }
</script>

<style>
    .successMessage {
        background: rgb(218, 238, 218);
        color: black;
        padding: 1rem;
    }
</style>

<div>
    <h4>Raw Timer List</h4>

    <p />

    <!-- TODO: add keyed each block -->
    {#each winnerDeltas.reverse() as winnerDelta}
        <div
            class="well well-sm "
            style="background: {getBgColor(winnerDelta)}">
            <div class="panel panel-info">
                <div class="panel-heading">
                    <span class="spanRight">{getHHMMSS(winnerDelta)}</span>
                </div>
                {#if getWinTimeMs(winnerDelta)}
                    <p class="successMessage">
                        Winner: {getWinLane(winnerDelta)} Time: {Math.abs(getWinTimeMs(winnerDelta))}
                    </p>
                {/if}
                <RawTimerLane
                    lane="Lane1"
                    laneJson={JSON.stringify(winnerDelta.lanes.lane1)} />
                <RawTimerLane
                    lane="Lane2"
                    laneJson={JSON.stringify(winnerDelta.lanes.lane2)} />
                <p />
                {#await shouldAllowApply(winnerDelta)}
                    <p>Loading</p>
                {:then rc}
                    {#if rc}
                        <SpinnerButton
                            on:click={() => pushToManualTimer(winnerDelta)}>
                            Apply
                        </SpinnerButton>
                    {/if}

                {/await}
            </div>
        </div>
    {/each}
</div>
