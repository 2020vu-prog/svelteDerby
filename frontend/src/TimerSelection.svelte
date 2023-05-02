<script>
    import log from "loglevel";
    import { Card, CardBody, CardHeader, CardTitle, Badge } from "sveltestrap";
    import { sleep } from "./utils.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { axios, raceConfig, statusMessage } from "./stores.js";
    import { onMount } from "svelte";
    import { createEventDispatcher } from "svelte";
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
            const response = await $axios.get(
                $raceConfig.baseUrl + activeTimerUrl
            );
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
                if (testNone && activeTimerList.length == 0) {
                    activeTimerList.push({
                        sha: "1234",
                        hostname: "none",
                        emoji: "❌",
                    });
                }
                log.debug("activeTimerList: ", activeTimerList);
                //TODO: refreshDataFromDb();
            }
            loading = false;
        } catch (err) {
            $statusMessage = {
                text: "getActiveTimers error: " + err,
                type: "error",
            };
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
    function getTimerName(activeTimer) {
        if (isProtobuf) {
            return `${getTimerEmoji(activeTimer)} ${activeTimer.clientId}`;
        } else {
            return activeTimer.hostname;
        }
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
        <Card class="mt-3 border border-info">
            <CardBody style="background-color:{getBgColor(activeTimer)}">
                <input
                    type="radio"
                    checked={timerMatchCheck(activeTimer)}
                    id={getTimerId(activeTimer)}
                    name="activeTimerOption"
                    on:click={() => clickActivateHost(activeTimer)} />
                <label style="display: inline" for={getTimerId(activeTimer)}>
                    {getTimerName(activeTimer)} {activeTimer.ipAddress}
                </label>
                <br />
                <br />
            </CardBody>
        </Card>
    {/each}
    {#if activeTimerList.length == 0}
        <br />
        No Timers Found
        <br />
    {/if}
{/if}
