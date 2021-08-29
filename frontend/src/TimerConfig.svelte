<script>
    import log from "loglevel";

    import { raceConfig, statusMessage, doRefreshBlocks } from "./stores.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";
    import SpinnerButton from "./SpinnerButton.svelte";

    var activeTimerList = [];
    var tcFromDexie = {};
    var activeTimerSha;
    var mounted = false;

    var submitDisabled = false;
    var submitSpinning = false;

    onMount(async () => {
        log.debug("mounted focus");
        mounted = true;
        getActiveTimers();
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
        }
        log.debug("loginForm copied:", JSON.stringify(loginForm));
    }
    async function getActiveTimers() {
        log.debug("getActiveTimers:");
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
        };

        log.debug("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;
        const orgIz = $raceConfig.orgIz;
        const orgId = $raceConfig.orgId;

        axios
            .get(
                $raceConfig.baseUrl +
                    `/getActiveTimers?orgIz=${orgIz}&orgId=${orgId}`
            )
            .then((response) => {
                if (response.error) {
                    log.debug("getActiveTimers:", response);
                    //TODO: not working!?
                    $statusMessage = {
                        text: `getActiveTimers Failed: ${response.error}.`,
                        type: "error",
                    };
                } else {
                    $statusMessage = {
                        text: `getActiveTimers Complete.`,
                        type: "success",
                    };
                    activeTimerList = response.data;
                    log.debug("activeTimerList: ", activeTimerList);
                }
            })
            .catch((err) => {
                $statusMessage = {
                    text: "getActiveTimers error: " + err,
                    type: "error",
                };
            });
        await refreshDataFromDb();
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

        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        axios.defaults.headers.common["Authorization"] = bearer;

        try {
            submitSpinning = true;
            const url = $raceConfig.baseUrl + "/timerConfig";
            const response = await axios.post(url, req);
            if (response.error) {
                //TODO: not working!?
                $statusMessage = {
                    text: `TimerConfig Failed: ${response.error}.`,
                    type: "error",
                };
            } else {
                $statusMessage = {
                    text: `TimerConfig Submitted.`,
                    type: "success",
                };
            }
            pop();
            //log.debug(response);
        } catch (error) {
            $statusMessage = {
                text: "TimerConfig error: " + err,
                type: "error",
            };
            log.debug(error);
        }
    }
    async function clickActivateHost(timer) {
        log.debug("clickActivateHost", timer);
        loginForm.sha = timer.sha;

        //await handleSubmit();
    }
    const loginForm = {};

    const timerShaMatchCheck = (timerToCheck) => {
        if (activeTimerSha && timerToCheck.sha) {
            if (activeTimerSha === timerToCheck.sha) {
                log.debug("MATCH ", timerToCheck.sha, " ", activeTimerSha);
                return true;
            } else {
                log.debug(
                    "NOT A MATCH ",
                    timerToCheck.sha,
                    " ",
                    activeTimerSha
                );
                return false;
            }
        }
    };
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
    <h4>Timer Selection</h4>
    {#each activeTimerList as activeTimer}
        <input
            checked={timerShaMatchCheck(activeTimer)}
            type="radio"
            id={activeTimer.sha}
            name="activeTimerOption"
            on:click={() => clickActivateHost(activeTimer)} />
        <label style="display: inline" for={activeTimer.sha}>
            {activeTimer.hostname}
        </label>
        <br />
        <br />
    {/each}

    <SpinnerButton
        disabled={submitDisabled}
        on:click={handleSubmit}
        spinning={submitSpinning}>
        Update
    </SpinnerButton>
</form>
