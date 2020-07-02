<script>
    import { raceConfig, statusMessage } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";

    var activeTimerList = [];
    var tcFromDexie = {};
    var mounted = false;
    onMount(async () => {
        console.log("mounted focus");
        mounted = true;
        getActiveTimers();
        await refreshDataFromDb();
    });
    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger);

        tcFromDexie = await db.TimerConfig.get("TimerConfig");

        console.log("refreshDataFromDb gave:", tcFromDexie);

        Object.assign(loginForm, tcFromDexie);

        loginForm.clearMS = loginForm.clearMS;
        loginForm.maxCarLenMS = loginForm.maxCarLenMS;
        loginForm.minCarLenMS = loginForm.minCarLenMS;
        loginForm.maxPerfCount = loginForm.maxPerfCount;
        console.log("loginForm copied:", JSON.stringify(loginForm));
    };
    async function getActiveTimers() {
        console.log("getActiveTimers:");
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
        };

        console.log("token:" + bearer);

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
                    console.log("getActiveTimers:", response);
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
                    console.log("activeTimerList: ", activeTimerList);
                }
            })
            .catch((err) => {
                $statusMessage = {
                    text: "getActiveTimers error: " + err,
                    type: "error",
                };
            });
    }
    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(loginForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            clearMS: loginForm.clearMS,
            maxCarLenMS: loginForm.maxCarLenMS,
            minCarLenMS: loginForm.minCarLenMS,
            maxPerfCount: loginForm.maxPerfCount,
            lanes: loginForm.lames,
        };

        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        axios
            .post($raceConfig.baseUrl + "/timerConfig", req)
            .then((response) => {
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
            })
            .catch((err) => {
                $statusMessage = {
                    text: "TimerConfig error: " + err,
                    type: "error",
                };
                //console.log("driverAdd failed: " + err)
            });
    }

    const loginForm = {};
</script>

<h3>Timer Config</h3>

<form on:submit|preventDefault={handleSubmit}>
    <button id="formSubmitButton" type="submit">Update</button>

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
    {#each activeTimerList as activeTimer}
        <div class="well well-sm">
            <div class="panel panel-info">
                <div class="panel-heading">
                    <span>{activeTimer.hostname}</span>
                </div>
            </div>
        </div>
    {/each}
</form>
