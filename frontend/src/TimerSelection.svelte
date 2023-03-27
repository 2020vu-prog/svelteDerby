<script>
    import log from "loglevel";

    import { sleep } from "./utils.js";
    import SpinnerButton from "./SpinnerButton.svelte";
    import { axios, raceConfig, statusMessage } from "./stores.js";
    import { onMount } from "svelte";
    import { createEventDispatcher } from "svelte";
    //    import { Jumper } from 'svelte-loading-spinners';

    const dispatch = createEventDispatcher();
    export let activeTimerSha;
    var activeTimerList = [];
    var loading = true;
    const testNone = true;

    onMount(async () => {
        log.debug("TimerSelection: ", activeTimerSha);
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
        //const response = await axios.get($raceConfig.baseUrl + endPoint, {
        $axios
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
                    if (testNone && activeTimerList.length == 0) {
                        activeTimerList.push({
                            sha: "123",
                            hostname: "none",
                        });
                    }
                    log.debug("activeTimerList: ", activeTimerList);
                    //TODO: refreshDataFromDb();
                }
                loading = false;
            })
            .catch((err) => {
                $statusMessage = {
                    text: "getActiveTimers error: " + err,
                    type: "error",
                };
            });
    }
    async function clickActivateHost(timer) {
        log.debug("clickActivateHost dispatching.");
        dispatch("timerSelected", timer);
    }

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

<h4>Timer Selection</h4>
{#if loading}
    <SpinnerButton disabled="true" spinning="true">
        Loading Timers
    </SpinnerButton>
    <br />
{:else}
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
    {#if activeTimerList.length == 0}
        <br />
        No Timers Found
        <br />
    {/if}
{/if}
