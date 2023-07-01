<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader } from "sveltestrap";

    import {
        mqttTimerSubscribe,
        timerState,
        raceConfig,
        statusMessage,
        doRefreshBlocks,
    } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { onMount, onDestroy } from "svelte";
    var laneStatusList = {
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
        $mqttTimerSubscribe = true;
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
</script>

<style>
    input[type="checkbox"] {
        transform: scale(2);
    }
</style>

<h3>Timer Alignment</h3>
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
