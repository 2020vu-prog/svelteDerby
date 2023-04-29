<script>
    import log from "loglevel";

    import {
        axios,
        raceConfig,
        statusMessage,
        doRefreshBlocks,
        mqttTimerTopic,
    } from "./stores.js";
    import { push, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import TimerSelection from "./TimerSelection.svelte";

    var activeTimerList = [];
    var tcFromDexie = {};
    var activeTimerSha;
    var mounted = false;

    var submitDisabled = false;
    var submitSpinning = false;

    onMount(async () => {
        log.debug("mounted focus");
        log.debug("TimerConfig: initial timerTopic:", $mqttTimerTopic);
        mounted = true;
    });

    $: refreshDataFromDb($doRefreshBlocks);

    async function refreshDataFromDb(trigger) {
        log.debug("TimerConfig: refreshDataFromDb data:", trigger);

        tcFromDexie = await db.TimerConfig.get("TimerConfig");

        log.debug("TimerConfig: refreshDataFromDb gave:", tcFromDexie);

        Object.assign(loginForm, tcFromDexie);

        loginForm.clearMS = loginForm.clearMS;
        loginForm.maxCarLenMS = loginForm.maxCarLenMS;
        loginForm.minCarLenMS = loginForm.minCarLenMS;
        loginForm.maxPerfCount = loginForm.maxPerfCount;
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
        log.debug("loginForm copied:", JSON.stringify(loginForm));
    }
    async function handleSubmit() {
        log.debug("Adding:" + JSON.stringify(loginForm));

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            clearMS: loginForm.clearMS,
            maxCarLenMS: loginForm.maxCarLenMS,
            minCarLenMS: loginForm.minCarLenMS,
            maxPerfCount: loginForm.maxPerfCount,
            lanes: loginForm.lames,
            sha: loginForm.sha,
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
        } catch (error) {
            $statusMessage = {
                text: "TimerConfig error: " + error,
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
        loginForm.sha = timer.sha;
        $mqttTimerTopic = timer.hostname;

        //await handleSubmit();
    }
    const loginForm = {};
</script>

<h3>Timer Config</h3>
<br />
<SpinnerButton on:click={() => push('/spMediaList/*/*')}>
    List All Media
</SpinnerButton>
<SpinnerButton on:click={() => push('/timerAlignment')}>
    Timer Alignment
</SpinnerButton>

<form>
    <h4>Auto-Apply Preferences</h4>

    <label>
        ClearMS:
        <input
            type="number"
            bind:value={loginForm.clearMS}
            placeholder="3000" />
    </label>
    <label>
        MaxCarLenMS:
        <input
            type="number"
            bind:value={loginForm.maxCarLenMS}
            placeholder="700" />
    </label>
    <label>
        MinCarLenMS:
        <input
            type="number"
            bind:value={loginForm.minCarLenMS}
            placeholder="300" />
    </label>
    <label>
        Max Perf:
        <input
            type="number"
            bind:value={loginForm.maxPerfCount}
            placeholder="1" />
    </label>
    <br />
    <TimerSelection
        isProtobuf=""
        on:timerSelected={handleTimerSelection}
        activeTimerKey={activeTimerSha} />

    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}>
        Update
    </SpinnerButton>
</form>
<br />
<br />
