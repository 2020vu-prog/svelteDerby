<script>
    import log from "loglevel";

    import {
        axios,
        raceConfig,
        statusMessage,
        doRefreshBlocks,
        mqttTimerTopic,
        initialReloadRoute,
    } from "./stores.js";
    import { tutorial as Timer } from "./timer_pb.js"
    import { push, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import TimerSelection from "./TimerSelection.svelte";
    import { Form, FormGroup, FormText, Input, Label } from 'sveltestrap';

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
        loadDefaults()
        $initialReloadRoute = "/timerConfigElapsed"
    });

    $: syncStarterLane2(paddlesUpLane1)
    $: refreshDataFromDb($doRefreshBlocks);

    function loadDefaults() {
        timerConfig.timerName = "Finish"
        timerConfig.timerMqttClientId = "TODO"
        timerConfig.sensorLogic = Timer.SensorLogic.LanePhotoEyes
        timerConfig.useGpsTime = true
        timerConfig.orgId = $raceConfig.orgId
        timerConfig.orgIz = $raceConfig.orgIz
        timerConfig.timerConfigLanePhotoEye = new Timer.TimerConfigLanePhotoEye
        timerConfig.timerConfigLanePhotoEye.clearMS = 7000
        timerConfig.timerConfigLanePhotoEye.minCarLenMS = 8
        timerConfig.timerConfigLanePhotoEye.maxCarLenMS = 800
        timerConfig.timerConfigLanePhotoEye.maxPerfCount = 2

        syncStarterLane2(paddlesUpLane1)
        timerConfig.timerConfigOpposedStarter.maxTransitionMS = 49
        console.log(timerConfig)
        const b = Timer.TimerConfig.encode(timerConfig).finish()
        console.log(b)
        console.log(timerConfig.toJSON())
    }
    function syncStarterLane2(paddlesUpLane1) {
        log.debug("syncStarterLane2: param:", paddlesUpLane1);
        if (paddlesUpLane1 == Timer.PinState.ON) {
            paddlesUpLane2 = Timer.PinState.OFF
        } else {
            paddlesUpLane2 = Timer.PinState.ON
        }
        timerConfig.timerConfigOpposedStarter.paddlesUp[0].pinState = paddlesUpLane1
        timerConfig.timerConfigOpposedStarter.paddlesUp[0].pinName = Timer.PinName.lane1
        timerConfig.timerConfigOpposedStarter.paddlesUp[1].pinState = paddlesUpLane2
        timerConfig.timerConfigOpposedStarter.paddlesUp[1].pinName = Timer.PinName.lane2
    }
    async function refreshDataFromDb(trigger) {
        log.debug("TimerConfig: TODO: skipping refresh", trigger);
        return;
        log.debug("TimerConfig: refreshDataFromDb data:", trigger);

        tcFromDexie = await db.TimerConfig.get("TimerConfig");

        log.debug("TimerConfig: refreshDataFromDb gave:", tcFromDexie);

        Object.assign(timerConfig, tcFromDexie);

        timerConfig.timerConfigLanePhotoEye.clearMS = timerConfig.timerConfigLanePhotoEye.clearMS
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

        var payload = Timer.TimerConfig.create(timerConfig);
        log.debug("Adding copy: ", payload.toJSON())

        if (timerConfig.sensorLogic == Timer.SensorLogic.LanePhotoEyes) {
            payload.timerConfigOpposedStarter = null
        }
        if (timerConfig.sensorLogic == Timer.SensorLogic.OpposedStarterReeds) {
            payload.timerConfigLanePhotoEye = null
        }
        const c = Timer.TimerConfig.encode(payload).finish()
        log.debug("Adding bin: ", c)
        log.debug("Adding json slim: ", payload.toJSON());
        payload.orgId = $raceConfig.orgId
        payload.orgIz = $raceConfig.orgIz

        try {
            submitSpinning = true;
            const url = $raceConfig.baseUrl + "/timerConfig2";
            const response = await $axios.post(url, payload);
            if (response.error) {
                //TODO: not working!?
                $statusMessage = {
                    text: `TimerConfigElapsed Failed: ${response.error}.`,
                    type: "error",
                };
            } else {
                $statusMessage = {
                    text: `TimerConfigElapsed Processed.`,
                    type: "success",
                };
            }
        } catch (error) {
            $statusMessage = {
                text: "TimerConfigElapsed error: " + error,
                type: "error",
            };
            log.debug(error);
        }
        submitSpinning = false;
    }
    async function handleTimerSelection(timerEvent) {
        log.debug("handleTimerSelection e:", timerEvent);
        var timer = timerEvent.detail;
        log.debug("handleTimerSelection timer:", timer);
        timerConfig.sha = timer.sha;
        $mqttTimerTopic = timer.hostname;
        timerConfig.timerMqttClientId = timer.hostname

        //await handleSubmit();
    }
    timerConfig.timerName = "Finish"
</script>

<h3>Timer Config Elapsed</h3>
<br />
<SpinnerButton on:click={()=> push('/timerAlignment')}>
    Timer Alignment
</SpinnerButton>

<Form>
    <FormGroup>
        <Label>
            Timer Name:
            <Input type="text" bind:value={timerConfig.timerName} />
        </Label>
    </FormGroup>

    <FormGroup>
        <Label>
            Timer Type
            <Input type="select" bind:value={timerConfig.sensorLogic}>
            <option value={Timer.SensorLogic.LanePhotoEyes}>PhotoEye</option>
            <option value={Timer.SensorLogic.OpposedStarterReeds}>Starter</option>
            </Input>
        </Label>
    </FormGroup>
    <FormGroup check>
        <Label check>
            Use GPS time
            <br /><!-- workaround for bootstrap broken layout -->
            <Input type="checkbox" bind:checked={timerConfig.useGpsTime} />
            <br />
            <FormText color="muted">
                Gps time is required for elapsed times to work. It can be disabled when using a
                timer without a Gps module, or when the Gps signal won't lock in.
                When it is disabled, only differential finish times are available.
            </FormText>
        </Label>
    </FormGroup>
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
    <FormGroup>
        <Label>
            MaxTrackSeconds:
            <Input type="number" bind:value={timerConfig.maxTrackSeconds} placeholder="45" />
            <FormText color="muted">
                This field is used to control elapsed time. It can be ignored when elapsed
                times are not needed. It is the amount of time the slowest car is expected
                to take to run the track (in seconds).
            </FormText>
        </Label>

    </FormGroup>
    {/if}
    <FormGroup>
        <Label>
            ClearMS:
            <Input type="number" bind:value={timerConfig.timerConfigLanePhotoEye.clearMS} placeholder="3000" />
        </Label>
    </FormGroup>
    <FormGroup>
        <Label>
            MaxCarLenMS:
            <Input type="number" bind:value={timerConfig.timerConfigLanePhotoEye.maxCarLenMS} placeholder="700" />
        </Label>
    </FormGroup>
    <FormGroup>
        <Label>
            MinCarLenMS:
            <Input type="number" bind:value={timerConfig.timerConfigLanePhotoEye.minCarLenMS} placeholder="300" />
        </Label>
    </FormGroup>
    <FormGroup>
        <Label>
            Max Perf:
            <Input type="number" bind:value={timerConfig.timerConfigLanePhotoEye.maxPerfCount} placeholder="1" />
        </Label>
    </FormGroup>

    <br />
    {:else if timerConfig.sensorLogic == Timer.SensorLogic.OpposedStarterReeds}
    <FormGroup>
        <Label>
            Paddles Up Lane1:
            <Input type="select" bind:value={paddlesUpLane1}>
            <option value={Timer.PinState.OFF}>Off</option>
            <option value={Timer.PinState.ON}>On</option>
            </Input>
        </Label>
    </FormGroup>
    <FormGroup>
        <Label>
            Paddles Up Lane2:
            <Input type="select" disabled bind:value={paddlesUpLane2}>
            <option value={Timer.PinState.OFF}>Off</option>
            <option value={Timer.PinState.ON}>On</option>
            </Input>
        </Label>
    </FormGroup>
    <FormGroup>
        <Label>
            MaxTransitionMS:
            <Input type="number" bind:value={timerConfig.timerConfigOpposedStarter.maxTransitionMS} placeholder="50" />
        </Label>
    </FormGroup>

    {/if}
    <TimerSelection on:timerSelected={handleTimerSelection} {activeTimerSha} />

    <SpinnerButton disabled={submitDisabled} on:click={handleSubmit} spinning={submitSpinning}>
        Update
    </SpinnerButton>
</Form>
<br />
<br />
