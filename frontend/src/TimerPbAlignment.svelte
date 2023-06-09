<script>
    import log from "loglevel";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import {
        CalcFinish,
        RawFacade,
        PbUtils,
    } from "@rr1.us/timer_protobuf/calcFinishPb.js";
    import { Card, CardBody, CardHeader } from "sveltestrap";
    import { Base64 } from "js-base64";
    import TimerPbHealth from "./TimerPbHealth.svelte";
    import {
        axios,
        mqttTimerSubscribe,
        mqttTimerTopic,
        timerState,
        timerPbMap,
        raceConfig,
        statusMessage,
        doRefreshBlocks,
    } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { onMount, onDestroy } from "svelte";
    import { getTimerPbConfig } from "./utils.js";
    import {
        Button,
        Collapse,
        Modal,
        ModalBody,
        ModalFooter,
        ModalHeader,
    } from "sveltestrap";

    export let params = {};
    var timerName = "";
    var timerTopic = "";
    var timerPbConfig = {};
    var historyList = [];
    var calcFinish = {};
    var paddlePosition = "";
    const laneStatusList = {
        lane1: {
            blocked: true,
            src: ["/data/1c.mp3", "/data/1b.mp3"],
            checked: false,
        },
        lane2: {
            blocked: true,
            src: ["/data/2c.mp3", "/data/2b.mp3"],
            checked: false,
        },
    };
    $: {
        syncState($timerState);
    }
    $: {
        syncPbState($timerPbMap);
    }
    onDestroy(() => {
        $mqttTimerSubscribe = false;
    });

    onMount(async () => {
        //params.timerName=uriDecode(params.timerName);
        timerName = decodeURI(params.timerName);
        log.debug("TimerPbAlignment TimerName:", timerName);
        [timerPbConfig] = await getTimerPbConfig(timerName);
        calcFinish = new CalcFinish(timerPbConfig);

        log.debug("TimerPbAlignment dexie:", timerPbConfig);
        if (timerPbConfig && timerPbConfig.timerMqttClientId) {
            //await getTimerHistory();
            timerTopic = `rr1Timer/${timerPbConfig.timerMqttClientId}`;
            log.debug(`TimerPbAligment topic:  ${timerTopic}`);
            $mqttTimerTopic = timerTopic;
            $mqttTimerSubscribe = true;
            await getTimerHistoryFromApi();
        }
    });

    const lanePbTimerPinRecentMap = {};
    var lanePbTimerPinHistoryMap = {};
    function getSortedHistory(hmap) {
        log.debug("getSortedHistory0", lanePbTimerPinHistoryMap);
        const rc = Object.values(hmap).sort((a, b) => {
            return b.stamp.tick64 - a.stamp.tick64;
        });
        log.debug("getSortedHistory1", rc);
        return rc;
    }
    function repaintFromCache() {
        log.debug(`repaintFromCache. `, lanePbTimerPinRecentMap);
        /*
        const allE = calcFinish.calcFinishFilteredMain(
            RawFacade.fromTimerPins(Object.values(lanePbTimerPinRecentMap))
        );
        log.debug("allE:", allE);
        */

        for (const [key, timerPin] of Object.entries(lanePbTimerPinRecentMap)) {
            if (key == Timer.PinName.lane1) {
                laneStatusList.lane1.blocked = isPinBlocked(timerPin);
                laneStatusList.lane1.timerPin = timerPin;
            }
            if (key == Timer.PinName.lane2) {
                laneStatusList.lane2.blocked = isPinBlocked(timerPin);
                laneStatusList.lane2.timerPin = timerPin;
            }
            log.debug("repaintFromCache:k", key, " v:", timerPin);
        }
        setPaddlePosition();
        laneStatusList = laneStatusList;
        lanePbTimerPinHistoryMap = lanePbTimerPinHistoryMap;
    }
    function setPaddlePosition() {
        if (!timerPbConfig.timerConfigOpposedStarter) {
            paddlePosition = "";
            return;
        }
        var matchUp = 0;
        for (let pp of timerPbConfig.timerConfigOpposedStarter.paddlesUp) {
            //const pinName=pp.timerConfigOpposedPosition
            const pinName = pp.pinName;
            const pinStateConfigUp = pp.pinState;

            log.debug("setpp configUp:", pinName, pinStateConfigUp);
            log.debug("setpp:", lanePbTimerPinRecentMap[pinName]);
            if (!lanePbTimerPinRecentMap[pinName]){
                paddlePosition = "Paddles ?";
                return;
            }
            if (lanePbTimerPinRecentMap[pinName].pinState == pinStateConfigUp) {
                log.debug("setpp match.");
                matchUp += 1;
            }
        }
        log.debug("setpp matchUp:", matchUp);
        if (matchUp == 2) {
            paddlePosition = "Paddles UP";
            return;
        }
        if (matchUp == 0) {
            paddlePosition = "Paddles DOWN";
            return;
        }

        paddlePosition = "Paddles in motion?";
        return;
        if (laneStatusList.lane1.blocked && !laneStatusList.lane2.blocked) {
            paddlePosition = "Paddles UP";
            return;
        }
        if (laneStatusList.lane2.blocked && !laneStatusList.lane1.blocked) {
            paddlePosition = "Paddles Down";
            return;
        }
        paddlePosition = "Paddles in motion?";
    }
    function isPinBlocked(timerPin) {
        log.debug("isPinBlocked:", timerPin);
        return timerPin.pinState == Timer.PinState.BLOCKED;
    }
    function potentialPinRefresh(timerPin) {
        log.debug(`ppr:`, timerPin);
        if (!lanePbTimerPinRecentMap[timerPin.pinName]) {
            //first time init
            log.debug(`ppr: fti`, timerPin);
            lanePbTimerPinRecentMap[timerPin.pinName] = timerPin;
        }
        if (
            timerPin.stamp.tick64 >
            lanePbTimerPinRecentMap[timerPin.pinName].stamp.tick64
        ) {
            log.debug(`ppr: new`, timerPin);
            lanePbTimerPinRecentMap[timerPin.pinName] = timerPin;
        }

        // key not used to update display, only intended to suppress dups
        if (
            timerPin.pinName == Timer.PinName.lane1 ||
            timerPin.pinName == Timer.PinName.lane2
        ) {
            log.debug(`ppr: hist`, timerPin);
            const histKey = `${timerPin.stamp.tick64}:${timerPin.pinName}`;
            lanePbTimerPinHistoryMap[histKey] = timerPin;
        }
    }
    function syncPbState() {
        log.debug(`syncPbState. topic: [${timerTopic}]`);

        if ($timerPbMap[timerTopic]) {
            const tjson = $timerPbMap[timerTopic];
            log.debug(`syncPbState. json:`, tjson);
            const tdlBinary = Base64.toUint8Array(tjson.b64);
            const tdl = Timer.TimerDataList.decode(tdlBinary);
            log.debug(`syncPbState. tdl:`, tdl);
            processTdl(tdl);
        }
    }
    function processTdl(tdl) {
        for (let td of tdl.timerData) {
            // init state if empty
            if (
                td.timerPulse &&
                Object.keys(lanePbTimerPinHistoryMap).length == 0
            ) {
                log.debug(`syncPbState. tpulse:`, td);
                const fake1 = {
                    pinName: Timer.PinName.lane1,
                    stamp: td.timerPulse.stamp,
                    pinState: td.timerPulse.lane1,
                };
                potentialPinRefresh(fake1);
                const fake2 = {
                    pinName: Timer.PinName.lane2,
                    stamp: td.timerPulse.stamp,
                    pinState: td.timerPulse.lane2,
                };
                potentialPinRefresh(fake2);
            }
            if (td.timerPin) {
                log.debug(`syncPbState. td:`, td);
                potentialPinRefresh(td.timerPin);
            }
        }
        repaintFromCache();
    }
    function syncState() {
        for (let [lane, laneState] of Object.entries($timerState)) {
            log.debug("TimerCalibration:", lane, " LS: ", laneState);
            if (laneStatusList[lane]) {
                log.debug("TimerCalibrationi2222:", lane, " LS: ", laneState);

                laneStatusList[lane].blocked = laneState == 0 ? false : true;

                if (
                    laneStatusList[lane].checked &&
                    laneStatusList[lane].blocked
                ) {
                    triggerAudio(laneStatusList[lane]);
                }

                laneStatusList = laneStatusList;
            }
        }
    }
    function triggerAudio(ls) {
        const audioSrc = ls.src[1];
        if (audioSrc && !ls.playing && ls.checked && ls.blocked) {
            ls.playing = true;
            log.debug("TimerCalibration audio:", audioSrc);
            const audio = new Audio(audioSrc);
            audio.onended = async function () {
                ls.playing = false;
                triggerAudio(ls); // won't do anything unless requests were queued up while playing
            };
            audio.play();
            //laneStatusList[lane].audio
        }
    }

    async function getTimerHistoryFromApi() {
        log.debug("getTimerHistoryFromApi:");
        //await sleep(3000)

        const orgIz = $raceConfig.orgIz;
        const orgId = $raceConfig.orgId;
        //const lowMS = 1000 * 3600 * 720;
        const lowMS = 1000 * 3600 * 0.3;
        const loIso = new Date(new Date().getTime() - lowMS).toISOString();
        const url = `/getTimerPbHistory?orgIz=${orgIz}&orgId=${orgId}&timerName=${timerPbConfig.timerMqttClientId}&loIso=${loIso}`;
        try {
            const response = await $axios.get($raceConfig.baseUrl + url);
            if (response.error) {
                log.debug("getTimerHistoryFromApi:", response);
                //TODO: not working!?
                $statusMessage = {
                    text: `getTimerHistoryFromApi Failed: ${response.error}.`,
                    type: "error",
                };
            } else {
                $statusMessage = {
                    text: `getTimerHistoryFromApi Complete.`,
                    type: "success",
                };
                historyList = response.data;
                log.debug("getTimerHistoryFromApi: ", historyList);
                if (historyList && historyList.length > 0) {
                    for (let h of historyList) {
                        if (h && h.data) {
                        } else {
                            continue;
                        }
                        const buf = h.data;
                        //log.debug("getTimerHistory h: ", h.SK," buf:",buf);
                        const buf8 = buf.data;

                        //log.debug("getTimerHistory h: ", h.SK," buf8:",buf8);
                        if (h.SK.startsWith("9999:")) {
                            const c = Timer.TimerConfig.decode(buf8);
                            log.debug("getTimerHistoryFromApi: tc:", c);
                        } else {
                            const tdl = Timer.TimerDataList.decode(buf8);
                            log.debug("getTimerHistoryFromApi: tdl:", tdl);
                            processTdl(tdl);
                        }
                    }
                }
            }
        } catch (err) {
            log.error("getTimerHistoryFromApi error: ", err);
            $statusMessage = {
                text: "getTimerHistoryFromApi error: " + err,
                type: "error",
            };
        }
    }
    function fmtPinTime(timerPin) {
        if (!timerPin.stamp.gpsTime) {
            //log.debug("fmtPinTime baled", timerPin);
            return timerPin.stamp.tick64;
        }
        const m1 = 1000 * 1000;
        const ms =
            timerPin.stamp.gpsTime.seconds * 1000 +
            Math.round(timerPin.stamp.gpsTime.nanos / m1);
        //log.debug("fmtPinTime from ", timerPin, " gave:", ms);
        let gpsDate = new Date(ms);
        return gpsDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            fractionalSecondDigits: 3,
        });
    }
</script>

<style>
    input[type="checkbox"] {
        transform: scale(2);
    }
    * {
        box-sizing: border-box;
    }

    .row {
        display: flex;
    }

    /* Create two equal columns that sits next to each other */
    .column {
        flex: 50%;
        padding: 10px;
    }
</style>

<h3>Timer Alignment [{timerName}]</h3>
<h5>Selected Timer [{timerPbConfig.timerMqttClientId}]</h5>
{#if timerName}
    <TimerPbHealth {timerName} />
{/if}
<div class="row">

    {#each Object.entries(laneStatusList) as [lane, ls]}
        <div class="column" style="background-color:#bbb;">

            <Card class="mt-3 border border-info">
                <CardHeader class="bg-info">
                    Lane {lane.replace(/[A-Z]+/i, '')} &nbsp;&nbsp;&nbsp;Audio:
                    &nbsp;&nbsp;
                    <input type="checkbox" bind:checked={ls.checked} />
                </CardHeader>
                <CardBody
                    style="background-color:{ls.blocked ? 'red' : 'lightgreen'}">
                    <h5>
                        Lane {lane.replace(/[A-Z]+/i, '')}
                        <strong>{ls.blocked ? 'BLOCKED' : 'CLEAR'}</strong>
                    </h5>
                    {#if paddlePosition}
                        <h6>{paddlePosition}</h6>
                    {/if}
                </CardBody>
            </Card>
        </div>
    {/each}

</div>

{#each getSortedHistory(lanePbTimerPinHistoryMap) as tp}
    <div>
        <code>
            {fmtPinTime(tp)} Lane{tp.pinName}
            {#if isPinBlocked(tp)}Blocked{:else}Clear{/if}
        </code>
    </div>
{/each}
