<script>
    import log from "loglevel";
    import { flatten, unflatten } from "flat";

    import {
        axios,
        raceConfig,
        pushMessage,
        doRefreshBlocks,
        mqttTimerTopic,
        initialReloadRoute,
    } from "./stores.js";
    import { getTimerPbConfig } from "./utils.js";
    import { tutorial as Timer } from "@rr1.us/timer_protobuf";
    import { push, replace, querystring, pop } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import TimerPbHealth from "./TimerPbHealth.svelte";
    import SpinnerButton from "./SpinnerButton.svelte";
    import TimerSelection from "./TimerSelection.svelte";
    import { Form, FormGroup, FormText, Input, Label } from "sveltestrap";
    import { Base64 } from "js-base64";

    //    import PrefFormInput from "./PrefFormInput.svelte";

    var bar2 = true;
    var activeTimerList = [];
    var tcFromDexie = {};
    var activeTimerSha;
    var mounted = false;
    const searchParams = new URLSearchParams($querystring);
    const timerName = searchParams.get("timerName");
    const timerId = searchParams.get("timerId");
    var alignmentDisabled = true;

    var submitDisabled = false;
    var submitSpinning = false;
    var timerConfig = {};
    var pbForm = {};
    //loadDefaults();

    onMount(async () => {
        log.debug("tce mounted focus:", $querystring, timerName);
        log.debug("tce TimerPbConfig: initial timerTopic:", $mqttTimerTopic);

        loadInitialData();
        //$initialReloadRoute = $location
        mounted = true;
    });

    $: if (mounted) {
        syncStarterLane2(pbForm.timerConfigOpposedStarter_paddlesUp_0_pinState);
    }
    $: refreshDataFromDb($doRefreshBlocks);

    async function loadInitialData() {
        await loadDefaults();
        if (!timerName) {
            return;
        }
        const [timerPbConfig, tcFromDexie] = await getTimerPbConfig(timerName);

        if (tcFromDexie && timerPbConfig) {
            log.debug("tcinit timerPbConfig: 2:", timerPbConfig);
            const flatDb = flatten(timerPbConfig, { delimiter: "_" });
            log.debug("tcinit flatDb: 2:", flatDb);
            Object.assign(pbForm, flatDb);
            log.debug("tcinit merged: 2:", pbForm);
            pbForm.timerNameDisabled = true;
            pbForm.at = tcFromDexie.at; // server audits version on update!
            if (pbForm.timerMqttClientId) {
                alignmentDisabled = false;
            }
        }
        syncStarterLane2(pbForm.timerConfigOpposedStarter_paddlesUp_0_pinState);
    }
    async function finishTimerAlreadyExists() {
        const finish = await db.TimerPbConfig.get("Finish");
        log.debug("already:", finish);
        return finish;
    }
    async function loadDefaults() {
        //timerConfig = new Timer.TimerConfig()
        //timerConfig.timerName = "Finish"
        if (!(await finishTimerAlreadyExists())) {
            pbForm.timerName = "Finish";
            pbForm.timerNameDisabled = true;
            pbForm.seq = "900";
        } else {
            pbForm.timerNameDisabled = false;
        }
        pbForm.timerMqttClientId = "";
        pbForm.sensorLogic = Timer.SensorLogic.LanePhotoEyes;
        pbForm.useGpsTime = true;
        pbForm.orgId = $raceConfig.orgId;
        pbForm.orgIz = $raceConfig.orgIz;
        pbForm.deleted = false;
        pbForm.maxTrackSeconds = 120;
        //pbForm.timerConfigLanePhotoEye = new Timer.TimerConfigLanePhotoEye
        pbForm.timerConfigLanePhotoEye_clearMS = 7000;
        pbForm.timerConfigLanePhotoEye_minCarLenMS = 8;
        pbForm.timerConfigLanePhotoEye_maxCarLenMS = 800;
        pbForm.timerConfigLanePhotoEye_maxPerfCount = 2;
        //pbForm.timerConfigLanePhotoEye = new Timer.TimerConfigLanePhotoEye
        //pbForm.timerConfigOpposedStarter = new Timer.TimerConfigOpposedStarter

        //pbForm.timerConfigOpposedStarter_paddlesUp = []
        //pbForm.timerConfigOpposedStarter_paddlesUp.push(new Timer.TimerConfigOpposedPosition)
        //pbForm.timerConfigOpposedStarter_paddlesUp.push(new Timer.TimerConfigOpposedPosition)
        //pbForm.timerConfigOpposedStarter_paddlesUp.push(new Timer.TimerConfigOpposedPosition)
        pbForm.timerConfigOpposedStarter_paddlesUp_0_pinState =
            Timer.PinState.BLOCKED;
        pbForm.timerConfigOpposedStarter_paddlesUp_0_pinName =
            Timer.PinName.lane1;
        pbForm.timerConfigOpposedStarter_paddlesUp_1_pinState =
            Timer.PinState.CLEAR;
        pbForm.timerConfigOpposedStarter_paddlesUp_1_pinName =
            Timer.PinName.lane2;
        /*
            const q={}
            q.y=0
            q.x={}
            q.x.l=[]
            q.x.l[0]='pp'
            q.x.l[1]='clc'
            q.x.l[2]={}
            q.x.l[2].foo='bar'

        const x=flatten(q,{delimiter:"_"})
        log.debug("tcinit flat: ",x);
        log.debug("unflat",unflatten(x,{delimiter:"_"}))
        */

        //syncStarterLane2(paddlesUpLane1)
        pbForm.timerConfigOpposedStarter_maxTransitionMS = 49;

        pbForm.timerConfigLanePhotoEye_paddlesDropped_pinState =
            Timer.PinState.BLOCKED;

        log.debug("dflts:", pbForm);
        log.debug("unflat", unflatten(pbForm, { delimiter: "_" }));
        //const b = Timer.TimerConfig.encode(timerConfig).finish()
        //console.log(b)
        //console.log(timerConfig.toJSON())
    }

    function syncStarterLane2() {
        log.debug(
            "syncStarterLane2: param:",
            pbForm.timerConfigOpposedStarter_paddlesUp_0_pinState
        );
        if (
            pbForm.timerConfigOpposedStarter_paddlesUp_0_pinState ==
            Timer.PinState.CLEAR
        ) {
            pbForm.timerConfigOpposedStarter_paddlesUp_1_pinState =
                Timer.PinState.BLOCKED;
        } else {
            pbForm.timerConfigOpposedStarter_paddlesUp_1_pinState =
                Timer.PinState.CLEAR;
        }
        log.debug("unflat", unflatten(pbForm, { delimiter: "_" }));
        return;
        if (paddlesUpLane1 == Timer.PinState.ON) {
            paddlesUpLane2 = Timer.PinState.OFF;
        } else {
            paddlesUpLane2 = Timer.PinState.ON;
        }
        pbForm.timerConfigOpposedStarter.paddlesUp[0].pinState = paddlesUpLane1;
        pbForm.timerConfigOpposedStarter.paddlesUp[0].pinName =
            Timer.PinName.lane1;
        pbForm.timerConfigOpposedStarter.paddlesUp[1].pinState = paddlesUpLane2;
        pbForm.timerConfigOpposedStarter.paddlesUp[1].pinName =
            Timer.PinName.lane2;
    }
    async function refreshDataFromDb(trigger) {
        log.debug("TimerConfig: TODO: skipping refresh", trigger);
        log.debug("TimerConfig: refreshDataFromDb data:", trigger);

        tcFromDexie = await db.TimerConfig.get("TimerConfig");

        log.debug("TimerConfig: refreshDataFromDb gave:", tcFromDexie);

        Object.assign(timerConfig, tcFromDexie);

        //timerConfig.timerConfigLanePhotoEye.clearMS =
        //   timerConfig.timerConfigLanePhotoEye.clearMS;
        //timerConfig.maxCarLenMS = timerConfig.maxCarLenMS;
        //timerConfig.minCarLenMS = timerConfig.minCarLenMS;
        //timerConfig.maxPerfCount = timerConfig.maxPerfCount;
        /*
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
        */
        log.debug("timerConfig copied:", JSON.stringify(timerConfig));
    }
    function isFormValid() {
        if (!pbForm.timerName) {
            pushMessage({
                text: "TimerName required",
                type: "error",
            });
            return false;
        }
        //long names will mess with eplapsed tbl fmt!
        if (pbForm.timerName.length > 7) {
            pushMessage({
                text: "TimerName too long. [max 7 chars]",
                type: "error",
            });
            return false;
        }
        if (!pbForm.timerMqttClientId) {
            pushMessage({
                text: "Timer Selection required",
                type: "error",
            });
            return false;
        }
        if (!pbForm.seq) {
            pushMessage({
                text: "Timer Sequence required",
                type: "error",
            });
            return false;
        }
        if (parseInt(pbForm.seq) < 100 || parseInt(pbForm.seq) > 999) {
            pushMessage({
                text: "Timer Sequence must be n range of 100 - 999",
                type: "error",
            });
            return false;
        }
        return true;
    }
    async function handleSubmit() {
        log.debug("handleSubmit bound:", pbForm);
        if (!isFormValid()) {
            return;
        }
        pbForm.Foo = "bar";
        log.debug("handleSubmit bound:", pbForm);
        log.debug("handleSubmit bound str:", JSON.stringify(pbForm));
        const tcObject = unflatten(pbForm, { delimiter: "_" });
        log.debug("handleSubmit tcObject:", tcObject);
        var wtf = Timer.TimerConfig.create(tcObject);
        log.debug("wtf:", wtf);

        var payload = Timer.TimerConfig.create(tcObject);
        log.debug("handleSubmit copy: ", payload.toJSON());

        if (payload.sensorLogic == Timer.SensorLogic.LanePhotoEyes) {
            payload.timerConfigOpposedStarter = null;
            payload.timerConfigRampPhotoEye = null;
        }
        if (payload.sensorLogic == Timer.SensorLogic.OpposedStarterReeds) {
            payload.timerConfigLanePhotoEye = null;
            payload.timerConfigRampPhotoEye = null;
        }
        if (payload.sensorLogic == Timer.SensorLogic.RampPhotoEyes) {
            payload.timerConfigOpposedStarter = null;
            payload.timerConfigLanePhotoEye = null;
        }
        const c = Timer.TimerConfig.encode(payload).finish();
        log.debug("handleSubmit bin: ", c);
        log.debug("handleSubmit json slim: ", payload.toJSON());
        payload.orgId = $raceConfig.orgId;
        payload.orgIz = $raceConfig.orgIz;
        //const payloadWithPB=JSON.parse(payload.toJSON())
        const payloadWithPB = payload.toJSON();
        payloadWithPB.pb = Base64.fromUint8Array(c);
        payloadWithPB.at = pbForm.at; // appease server version audit.
        log.debug("handleSubmit json slim2: ", payloadWithPB);
        const z = Timer.TimerConfig.decode(c);
        console.log("handleSubmit roundtrip:", z);

        try {
            submitSpinning = true;
            const url = $raceConfig.baseUrl + "/timerPbConfig";
            const response = await $axios.post(url, payloadWithPB);
            if (response.error) {
                //TODO: not working!?
                pushMessage({
                    text: `TimerConfigElapsed Failed: ${response.error}.`,
                    type: "error",
                });
            } else {
                pushMessage({
                    text: `TimerConfigElapsed Processed.`,
                    type: "success",
                });
                pop();
            }
        } catch (error) {
            pushMessage({
                text: "TimerConfigElapsed error: " + error,
                type: "error",
            });
            log.debug(error);
        }
        submitSpinning = false;
    }
    async function handleTimerSelection(timerEvent) {
        log.debug("handleTimerSelection e:", timerEvent);
        var timer = timerEvent.detail;
        log.debug("handleTimerSelection timer:", timer);
        pbForm.timerMqttClientId = timer.clientId;
        //TODO: amplify issues with binary data :-(
        // "AMQJS0005E Internal error. Error Message: AMQJS0009E Malformed UTF data:
        // $mqttTimerTopic = `rr1Timer/${timer.clientId}`;
    }
</script>

<h3>Timer Config Elapsed</h3>
<br />
{#if timerName && timerId}
    <SpinnerButton
        disabled={alignmentDisabled}
        on:click={() =>
            push(`/timerPbAlignment?timerName=${timerName}&timerId=${timerId}`)}
    >
        Timer Alignment
    </SpinnerButton>
    <TimerPbHealth {timerName} {timerId} />
{/if}
<Form>
    <FormGroup>
        <Label>
            Timer Name:
            <Input
                disabled={pbForm.timerNameDisabled}
                type="text"
                bind:value={pbForm.timerName}
            />
        </Label>
    </FormGroup>
    <FormGroup>
        <Label>
            Timer Sequence:
            <Input
                disabled={pbForm.seqDisabled}
                type="number"
                bind:value={pbForm.seq}
            />
            <FormText color="muted">
                Sequence is used to indicate position of timer on the track when
                there are multiple timers. Lower numbers are closer to the
                starting ramps. Higher numbers are closer to the finish line.
                Range 100-999.
            </FormText>
        </Label>
    </FormGroup>

    <FormGroup>
        <Label>
            Timer Type
            <Input type="select" bind:value={pbForm.sensorLogic}>
                <option value={Timer.SensorLogic.LanePhotoEyes}>
                    PhotoEye
                </option>
                <option value={Timer.SensorLogic.RampPhotoEyes}>
                    Starter 1 PhotoEye
                </option>
                <option value={Timer.SensorLogic.OpposedStarterReeds}>
                    Starter Opposed Switches
                </option>
            </Input>
        </Label>
    </FormGroup>
    <FormGroup check>
        <Label check>
            Use GPS time
            <br />
            <!-- workaround for bootstrap broken layout -->
            <Input
                type="checkbox"
                class="big"
                bind:checked={pbForm.useGpsTime}
            />
            <br />
            <FormText color="muted">
                Gps time is required for elapsed times to work. It can be
                disabled when using a timer without a Gps module, or when the
                Gps signal won't lock in. When it is disabled, only differential
                finish times are available.
            </FormText>
        </Label>
    </FormGroup>
    <FormGroup check>
        <Label check>
            Inactive
            <br />
            <!-- workaround for bootstrap broken layout -->
            <Input type="checkbox" class="big" bind:checked={pbForm.deleted} />
            <br />
        </Label>
    </FormGroup>
    {#if pbForm.sensorLogic == Timer.SensorLogic.LanePhotoEyes}
        {#if pbForm.timerName == "Finish"}
            <FormGroup>
                <Label>
                    MaxTrackSeconds:
                    <Input
                        type="number"
                        bind:value={pbForm.maxTrackSeconds}
                        placeholder="45"
                    />
                    <FormText color="muted">
                        This field is used to control elapsed time. It can be
                        ignored when elapsed times are not needed. It is the
                        amount of time the slowest car is expected to take to
                        run the track (in seconds).
                    </FormText>
                </Label>
            </FormGroup>
        {/if}
        <FormGroup>
            <Label>
                ClearMS:
                <Input
                    type="number"
                    bind:value={pbForm.timerConfigLanePhotoEye_clearMS}
                    placeholder="3000"
                />
            </Label>
        </FormGroup>
        <FormGroup>
            <Label>
                MaxCarLenMS:
                <Input
                    type="number"
                    bind:value={pbForm.timerConfigLanePhotoEye_maxCarLenMS}
                    placeholder="700"
                />
            </Label>
        </FormGroup>
        <FormGroup>
            <Label>
                MinCarLenMS:
                <Input
                    type="number"
                    bind:value={pbForm.timerConfigLanePhotoEye_minCarLenMS}
                    placeholder="300"
                />
            </Label>
        </FormGroup>
        <FormGroup>
            <Label>
                Max Perf:
                <Input
                    type="number"
                    bind:value={pbForm.timerConfigLanePhotoEye_maxPerfCount}
                    placeholder="1"
                />
            </Label>
        </FormGroup>

        <br />
    {:else if pbForm.sensorLogic == Timer.SensorLogic.OpposedStarterReeds}
        <FormGroup>
            <Label>
                Paddles Up Lane1:
                <Input
                    type="select"
                    bind:value={
                        pbForm.timerConfigOpposedStarter_paddlesUp_0_pinState
                    }
                >
                    <option value={Timer.PinState.BLOCKED}>Blocked</option>
                    <option value={Timer.PinState.CLEAR}>Clear</option>
                </Input>
            </Label>
        </FormGroup>
        <FormGroup>
            <Label>
                Paddles Up Lane2:
                <Input
                    type="select"
                    disabled
                    bind:value={
                        pbForm.timerConfigOpposedStarter_paddlesUp_1_pinState
                    }
                >
                    <option value={Timer.PinState.BLOCKED}>Blocked</option>
                    <option value={Timer.PinState.CLEAR}>Clear</option>
                </Input>
            </Label>
        </FormGroup>
        <FormGroup>
            <Label>
                MaxTransitionMS:
                <Input
                    type="number"
                    bind:value={
                        pbForm.timerConfigOpposedStarter_maxTransitionMS
                    }
                    placeholder="50"
                />
            </Label>
        </FormGroup>
    {:else if pbForm.sensorLogic == Timer.SensorLogic.RampPhotoEyes}
        <FormGroup>
            <Label>
                Lane1 Sensor When paddles Down:
                <Input
                    type="select"
                    bind:value={
                        pbForm.timerConfigLanePhotoEye_paddlesDropped_pinState
                    }
                >
                    <option value={Timer.PinState.BLOCKED}>Blocked</option>
                    <option value={Timer.PinState.CLEAR}>Clear</option>
                </Input>
            </Label>
        </FormGroup>
    {/if}
    <TimerSelection
        isProtobuf="true"
        on:timerSelected={handleTimerSelection}
        activeTimerKey={pbForm.timerMqttClientId}
    />

    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}
    >
        Update
    </SpinnerButton>
</Form>
<br />
<br />
