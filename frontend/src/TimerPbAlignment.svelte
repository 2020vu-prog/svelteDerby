<script>
    import log from "loglevel";
    import { tutorial as Timer } from "./timer_pb.js";
    import { Card, CardBody, CardHeader } from "sveltestrap";
    import { Base64 } from "js-base64";
    import {
        axios,
        mqttTimerSubscribe,
        timerState,
        raceConfig,
        statusMessage,
        doRefreshBlocks,
    } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { onMount, onDestroy } from "svelte";
    import { getTimerPbConfig } from "./utils.js";
    export let params = {};
    var timerPbConfig = {};
    var historyList = [];
    var loading = true;
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
    onDestroy(() => {
        $mqttTimerSubscribe = false;
    });

    onMount(async () => {
        log.debug("TimerName:", params.timerName);
        $mqttTimerSubscribe = true;
        [timerPbConfig] = await getTimerPbConfig(params.timerName);

        log.debug("TimerPbAlignment dexie:", timerPbConfig);
        await getTimerHistory();
    });

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
    async function getTimerHistory() {
        log.debug("getTimerHistory:");
        //await sleep(3000)

        const orgIz = $raceConfig.orgIz;
        const orgId = $raceConfig.orgId;
        const url = `/getTimerPbHistory?orgIz=${orgIz}&orgId=${orgId}&timerName=${timerPbConfig.timerMqttClientId}`;
        try {
            const response = await $axios.get($raceConfig.baseUrl + url);
            if (response.error) {
                log.debug("getTimerHistory:", response);
                //TODO: not working!?
                $statusMessage = {
                    text: `getTimerHistory Failed: ${response.error}.`,
                    type: "error",
                };
            } else {
                $statusMessage = {
                    text: `getTimerHistory Complete.`,
                    type: "success",
                };
                historyList = response.data;
                log.debug("getTimerHistory: ", historyList);
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
                            log.debug("getTimerPbConfig: 2:", c);
                        } else {
                            const c = Timer.TimerDataList.decode(buf8);
                            log.debug("getTimerDataList: 2:", c);
                        }
                    }
                }
            }
            loading = false;
        } catch (err) {
            log.error("getTimerHistory error: ", err);
            $statusMessage = {
                text: "getTimerHistory error: " + err,
                type: "error",
            };
        }
    }
</script>

<style>
    input[type="checkbox"] {
        transform: scale(2);
    }
</style>

<h3>Timer Alignment [{params.timerName}]</h3>
<h5>Selected Timer [{timerPbConfig.timerMqttClientId}]</h5>
{#each Object.entries(laneStatusList) as [lane, ls]}
    <Card class="mt-3 border border-info">
        <CardHeader class="bg-info">
            Lane {lane.replace(/[A-Z]+/i, '')} &nbsp;&nbsp;&nbsp;Audio:
            &nbsp;&nbsp;
            <input type="checkbox" bind:checked={ls.checked} />
        </CardHeader>
        <CardBody style="background-color:{ls.blocked ? 'red' : 'lightgreen'}">
            <h3>
                Lane {lane.replace(/[A-Z]+/i, '')}
                <strong>{ls.blocked ? 'BLOCKED' : 'CLEAR'}</strong>
            </h3>
        </CardBody>
    </Card>
{/each}
