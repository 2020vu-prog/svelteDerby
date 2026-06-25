<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import { sleep, secondsToHHMMSS } from "./utils.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { axios, raceConfig, pushMessage } from "./stores.js";
    import { onMount } from "svelte";
    import { createEventDispatcher } from "svelte";
    const { v4: uuidv4 } = require("uuid");
    //    import { Jumper } from 'svelte-loading-spinners';

    const dispatch = createEventDispatcher();
    export let activeTimerKey;
    export let isProtobuf;

    var activeTimerList = [];
    var loading = true;
    const testNone = true;

    onMount(async () => {
        log.debug("TimerSelection: ", activeTimerKey);
        getActiveTimers();
    });
    async function getActiveTimers() {
        log.debug("getActiveTimers:");
        //await sleep(3000)

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
        };

        const orgIz = $raceConfig.orgIz;
        const orgId = $raceConfig.orgId;
        const activeTimerUrl = isProtobuf
            ? `/getActivePbTimers?orgIz=${orgIz}&orgId=${orgId}`
            : `/getActiveTimers?orgIz=${orgIz}&orgId=${orgId}`;
        //const response = await axios.get($raceConfig.baseUrl + endPoint, {
        try {
            const tsLoadingKey = uuidv4();
            pushMessage({
                text: `loading ActiveTimers.`,
                type: "success",
                key: tsLoadingKey,
            });
            const response = await $axios.get(
                $raceConfig.baseUrl + activeTimerUrl
            );
            if (response.error) {
                log.debug("getActiveTimers:", response);
                //TODO: not working!?
                pushMessage({
                    text: `getActiveTimers Failed: ${response.error}.`,
                    type: "error",
                });
            } else {
                pushMessage({
                    text: `Loaded`,
                    TTL: 1, //delete msg!
                    type: "success",
                    key: tsLoadingKey,
                });
                activeTimerList = response.data;
                if (testNone && activeTimerList.length == 0) {
                    activeTimerList.push({
                        sha: "1234",
                        hostname: "none",
                        emoji: "❌",
                    });
                } else {
                    if (isProtobuf) {
                        activeTimerList.sort((b, a) =>
                            a.connectAt.localeCompare(b.connectAt)
                        );
                    }
                }
                log.debug("activeTimerList: ", activeTimerList);
                //TODO: refreshDataFromDb();
            }
            loading = false;
        } catch (err) {
            pushMessage({
                text: "getActiveTimers error: " + err,
                type: "error",
            });
        }
    }
    async function clickActivateHost(timer) {
        log.debug("clickActivateHost dispatching.");
        dispatch("timerSelected", timer);
    }

    const timerMatchCheck = (timerToCheck) => {
        if (isProtobuf) {
            return activeTimerKey && activeTimerKey === timerToCheck.clientId;
        } else {
            return timerShaMatchCheck(timerToCheck);
        }
    };
    const timerShaMatchCheck = (timerToCheck) => {
        if (activeTimerKey && timerToCheck.sha) {
            if (activeTimerKey === timerToCheck.sha) {
                log.debug("MATCH ", timerToCheck.sha, " ", activeTimerKey);
                return true;
            } else {
                log.debug(
                    "NOT A MATCH ",
                    timerToCheck.sha,
                    " ",
                    activeTimerKey
                );
                return false;
            }
        }
    };
    function getTimerId(activeTimer) {
        if (isProtobuf) {
            return activeTimer.clientId;
        } else {
            return activeTimer.sha;
        }
    }
    function getBgColor(activeTimer) {
        if (activeTimer.disconnectAt) {
            return "#ed5e62";
        }
        if (activeTimer.connectAt) {
            return "lightgreen";
        }
        return "lightgrey";
    }
    function getTimerEmoji(activeTimer) {
        if (activeTimer.emoji) {
            return activeTimer.emoji;
        }
        if (activeTimer.disconnectAt) {
            return "⬇️";
        }
        if (activeTimer.connectAt) {
            return "⬆️";
        }
        return "";
    }
    function getTimerUptime(activeTimer) {
        if (!isProtobuf) {
            return "";
        }
        if (!activeTimer.connectAt) {
            return "";
        }
        let endTime = new Date().getTime();
        if (activeTimer.disconnectAt) {
            endTime = Date.parse(activeTimer.disconnectAt);
        }
        const beginTime = Date.parse(activeTimer.connectAt);
        let upSeconds = Math.floor((endTime - beginTime) / 1000);
        return `[${secondsToHHMMSS(upSeconds)}]`;
    }
    function getTimerName(activeTimer) {
        if (isProtobuf) {
            return `${getTimerEmoji(activeTimer)} ${activeTimer.clientId}`;
        } else {
            return activeTimer.hostname;
        }
    }
    let currentViewMode = "Active";
    function isCurrentViewActive() {
        return currentViewMode === "Active";
    }
    function getInactiveMode(ignoredParamater) {
        return isCurrentViewActive() ? "Offline" : "Active";
    }
    function shouldDisplay(currentViewMode, activeTimer) {
        if (
            new Date() -
                Date.parse(activeTimer.disconnectAt || activeTimer.connectAt) <
            6 * 60 * 60 * 1000
        ) {
            return true;
        }
        if (activeTimer.disconnectAt) {
            return !isCurrentViewActive();
        }
        if (activeTimer.connectAt) {
            return true;
        }
        return false;
    }
</script>

<h4>Timer Selection</h4>
{#if loading}
    <SpinnerButton disabled="true" spinning="true">
        Loading Timers
    </SpinnerButton>
    <br />
{:else}
    {#each activeTimerList as activeTimer}
        {#if shouldDisplay(currentViewMode, activeTimer)}
            <Card class="mt-3 border border-info">
                <CardBody style="background-color:{getBgColor(activeTimer)}">
                    <input
                        type="radio"
                        checked={timerMatchCheck(activeTimer)}
                        id={getTimerId(activeTimer)}
                        name="activeTimerOption"
                        on:click={() => clickActivateHost(activeTimer)}
                    />
                    <label
                        style="display: inline"
                        for={getTimerId(activeTimer)}
                    >
                        {getTimerName(activeTimer)}
                        {activeTimer.ipAddress}
                        {getTimerUptime(activeTimer)}
                    </label>
                    <br />
                    <br />
                </CardBody>
            </Card>
        {/if}
    {/each}
    <SpinnerButton on:click={() => (currentViewMode = getInactiveMode())}>
        View {getInactiveMode(currentViewMode)} Timers
    </SpinnerButton>

    {#if activeTimerList.length == 0}
        <br />
        No Timers Found
        <br />
    {/if}
{/if}
