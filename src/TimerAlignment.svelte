<script>
    import {
        mqttTimerSubscribe,
        timerState,
        raceConfig,
        statusMessage,
        doRefreshBlocks,
    } from "./stores.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { onMount, onDestroy } from "svelte";
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
        $mqttTimerSubscribe = true;
    });
    function syncState() {
        for (let [lane, laneState] of Object.entries($timerState)) {
            console.log("TimerCalibration:", lane, " LS: ", laneState);
            if (laneStatusList[lane]) {
                console.log("TimerCalibrationi2222:", lane, " LS: ", laneState);

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
            console.log("TimerCalibration audio:", audioSrc);
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

<h3>Timer Alignment</h3>
{#each Object.entries(laneStatusList) as [lane, ls]}
    <p />
    <input type="checkbox" bind:checked={ls.checked} />
    <SpinnerButton spinning={ls.blocked}>{lane}</SpinnerButton>
    <br />
    <p />
{/each}
