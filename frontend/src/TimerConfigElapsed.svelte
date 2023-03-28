<script>
    import log from "loglevel";

    import {
        axios,
        raceConfig,
        statusMessage,
        doRefreshBlocks,
        mqttTimerTopic,
    } from "./stores.js";
    import { tutorial as Timer } from "./timer_pb.js"
    import { push, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import TimerSelection from "./TimerSelection.svelte";
    //    import PrefFormInput from "./PrefFormInput.svelte";

    var paddlesUpLane1 = Timer.PinState.OFF
    var paddlesUpLane2 = Timer.PinState.ON
    var bar2 = true
    var activeTimerList = [];
    var tcFromDexie = {};
    var activeTimerSha;
    var mounted = false;

    var submitDisabled = false;
    var submitSpinning = false;
    var timerConfig = new Timer.TimerConfig()
    timerConfig.timerConfigLanePhotoEye = new Timer.TimerConfigLanePhotoEye
    timerConfig.timerConfigOpposedStarter = new Timer.TimerConfigOpposedStarter
    timerConfig.timerConfigOpposedStarter.paddlesUp = []
    timerConfig.timerConfigOpposedStarter.paddlesUp.push(new Timer.TimerConfigOpposedPosition)
    timerConfig.timerConfigOpposedStarter.paddlesUp.push(new Timer.TimerConfigOpposedPosition)

    onMount(async () => {
        log.debug("mounted focus");
        log.debug("TimerConfig: initial timerTopic:", $mqttTimerTopic);
        mounted = true;
        timerConfig.clearMS = 7000
        timerConfig.timerName = "foo"
        timerConfig.sensorLogic = Timer.SensorLogic.LanePhotoEyes
        timerConfig.useGpsTime = false
        timerConfig.orgId = "Test"
        timerConfig.orgIz = "ZZZ"
        timerConfig.timerConfigLanePhotoEye = new Timer.TimerConfigLanePhotoEye
        timerConfig.timerConfigLanePhotoEye.minCarLenMS = 8
        timerConfig.timerConfigLanePhotoEye.maxCarLenMS = 800
        timerConfig.timerConfigLanePhotoEye.maxPerfCount = 2

        timerConfig.timerConfigOpposedStarter.paddlesUp[0].pinState = Timer.PinState.ON
        timerConfig.timerConfigOpposedStarter.paddlesUp[0].pinName = Timer.PinName.lane1
        timerConfig.timerConfigOpposedStarter.paddlesUp[1].pinState = Timer.PinState.OFF
        timerConfig.timerConfigOpposedStarter.paddlesUp[1].pinName = Timer.PinName.lane2
        console.log(timerConfig)
        const b = Timer.TimerConfig.encode(timerConfig).finish()
        console.log(b)
        console.log(timerConfig.toJSON())
    });

    $: syncStarterLane2(paddlesUpLane1)
    $: refreshDataFromDb($doRefreshBlocks);

    function syncStarterLane2(paddlesUpLane1) {
        if (paddlesUpLane1 == Timer.PinState.ON) {
            paddlesUpLane2 = Timer.PinState.OFF
        } else {
            paddlesUpLane2 = Timer.PinState.ON
        }
    }
    async function refreshDataFromDb(trigger) {
        log.debug("TimerConfig: TODO: skipping refresh", trigger);
        return;
        log.debug("TimerConfig: refreshDataFromDb data:", trigger);

        tcFromDexie = await db.TimerConfig.get("TimerConfig");

        log.debug("TimerConfig: refreshDataFromDb gave:", tcFromDexie);

        Object.assign(timerConfig, tcFromDexie);

        timerConfig.clearMS = timerConfig.clearMS;
        timerConfig.maxCarLenMS = timerConfig.maxCarLenMS;
        timerConfig.minCarLenMS = timerConfig.minCarLenMS;
        timerConfig.maxPerfCount = timerConfig.maxPerfCount;
        if (tcFromDexie.sha) {
            activeTimerSha = tcFromDexie.sha;
            if (activeTimerList) {
                log.debug("TimerConfig: atl length:", activeTimerList.length);
                for (let ctimer of activeTimerList) {
                    log.debug("TimerConfig: consider:", ctimer);
                    if (tcFromDexie.sha === ctimer.sha) {
                        $mqttTimerTopic = ctimer.hostname;
                        log.debug(
                            "TimerConfig: set timerTopic:",
                            $mqttTimerTopic
                        );
                    } else {
                        log.debug("TimerConfig: mismatch:", ctimer);
                    }
                }
            } else {
                log.debug("TimerConfig: no atl.");
            }
        }
        log.debug("timerConfig copied:", JSON.stringify(timerConfig));
    }
    async function handleSubmit() {
        log.debug("Adding json:" + JSON.stringify(timerConfig));
        log.debug("Adding pb: ", timerConfig.toJSON());
        log.debug("Adding pbs: ", timerConfig.timerConfigOpposedStarter.paddlesUp[0].toJSON())
        const b = Timer.TimerConfig.encode(timerConfig).finish()
        log.debug("Adding bin: ", b)

        var message = Timer.TimerConfig.create(timerConfig);
        log.debug("Adding copy: ", message.toJSON())

        if (timerConfig.sensorLogic == Timer.SensorLogic.LanePhotoEyes) {
            message.timerConfigOpposedStarter = null
        }
        if (timerConfig.sensorLogic == Timer.SensorLogic.OpposedStarterReeds) {
            message.timerConfigLanePhotoEye = null
        }
        const c = Timer.TimerConfig.encode(message).finish()
        log.debug("Adding bin: ", c)
        log.debug("Adding json slim: ", message.toJSON());
        return;
        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            clearMS: timerConfig.clearMS,
            maxCarLenMS: timerConfig.maxCarLenMS,
            minCarLenMS: timerConfig.minCarLenMS,
            maxPerfCount: timerConfig.maxPerfCount,
            lanes: timerConfig.lames,
            sha: timerConfig.sha,
        };

        try {
            submitSpinning = true;
            const url = $raceConfig.baseUrl + "/timerConfig";
            const response = await $axios.post(url, req);
            if (response.error) {
                //TODO: not working!?
                $statusMessage = {
                    text: `TimerConfig Failed: ${response.error}.`,
                    type: "error",
                };
            } else {
                $statusMessage = {
                    text: `TimerConfig Processed.`,
                    type: "success",
                };
            }
            submitSpinning = false;
        } catch (error) {
            $statusMessage = {
                text: "TimerConfig error: " + err,
                type: "error",
            };
            log.debug(error);
        }
    }
    async function handleTimerSelection(timerEvent) {
        log.debug("handleTimerSelection e:", timerEvent);
        var timer = timerEvent.detail;
        log.debug("handleTimerSelection timer:", timer);
        timerConfig.sha = timer.sha;
        $mqttTimerTopic = timer.hostname;

        //await handleSubmit();
    }
    timerConfig.timerName = "Finish"
</script>

<h3>Timer Config Elapsed</h3>
<br />
<SpinnerButton on:click={()=> push('/timerAlignment')}>
    Timer Alignment
</SpinnerButton>

<form>

    <div class="form-group">
        <label>
            Timer Name:
            <input class="form-control" type="text" bind:value={timerConfig.timerName} />
        </label>
    </div>

    <div class="form-group">
        <label>
            Timer Type
            <select class="form-control" bind:value={timerConfig.sensorLogic}>
                <option value={Timer.SensorLogic.LanePhotoEyes}>PhotoEye</option>
                <option value={Timer.SensorLogic.OpposedStarterReeds}>Starter</option>
            </select>
        </label>
    </div>
    <div class="form-group">
        <label>
            Use GPS time
            <input class="form-control" type="checkbox" bind:checked={timerConfig.useGpsTime} />
        </label>
    </div>
    {#if timerConfig.sensorLogic == Timer.SensorLogic.LanePhotoEyes }
    {#if timerConfig.timerName == "Finish" }
    <!--

    <PrefFormInput title="Foo" helpText="bar">
        <input type="number" bind:value={loginForm.maxTrackSeconds} placeholder="45" />
    </PrefFormInput>
    <PrefFormInput title="Foo2" helpText="bar2">
        <input type="checkbox" bind:checked={bar2} />
    </PrefFormInput>
    -->
    <div class="form-group">
        <label>
            MaxTrackSeconds:
            <input class="form-control" type="number" bind:value={timerConfig.maxTrackSeconds} placeholder="45" />
            <span class="help-block">This field is used to control elapsed time. It can be ignored when elapsed times
                are
                not needed. It is the amount of time the slowest car is expected to take to run the track (in
                seconds).</span>

        </label>
    </div>
    {/if}
    <div class="form-group">
        <label>
            ClearMS:
            <input class="form-control" type="number" bind:value={timerConfig.clearMS} placeholder="3000" />
        </label>
    </div>
    <div class="form-group">
        <label>
            MaxCarLenMS:
            <input class="form-control" type="number" bind:value={timerConfig.timerConfigLanePhotoEye.maxCarLenMS}
                placeholder="700" />
        </label>
    </div>
    <div class="form-group">
        <label>
            MinCarLenMS:
            <input class="form-control" type="number" bind:value={timerConfig.timerConfigLanePhotoEye.minCarLenMS}
                placeholder="300" />
        </label>
    </div>
    <div class="form-group">
        <label>
            Max Perf:
            <input class="form-control" type="number" bind:value={timerConfig.timerConfigLanePhotoEye.maxPerfCount}
                placeholder="1" />
        </label>
    </div>

    <br />
    {:else if timerConfig.sensorLogic == Timer.SensorLogic.OpposedStarterReeds}
    <div class="form-group">
        <label>
            Paddles Up Lane1:
            <select class="form-control" bind:value={paddlesUpLane1}>
                <option value={Timer.PinState.OFF}>Off</option>
                <option value={Timer.PinState.ON}>On</option>
            </select>
        </label>
    </div>
    <div class="form-group">
        <label>
            Paddles Up Lane2:
            <select class="form-control" disabled bind:value={paddlesUpLane2}>
                <option value={Timer.PinState.OFF}>Off</option>
                <option value={Timer.PinState.ON}>On</option>
            </select>
        </label>
    </div>
    <div class="form-group">
        <label>
            MaxTransitionMS:
            <input class="form-control" type="number" bind:value={timerConfig.timerConfigOpposedStarter.maxTransitionMS}
                placeholder="50" />
        </label>
    </div>

    {/if}
    <TimerSelection on:timerSelected={handleTimerSelection} {activeTimerSha} />

    <SpinnerButton disabled={submitDisabled} on:click={handleSubmit} spinning={submitSpinning}>
        Update
    </SpinnerButton>
</form>
<br />
<br />
