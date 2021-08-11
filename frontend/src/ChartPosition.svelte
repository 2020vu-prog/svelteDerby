<script>
    import log from "loglevel";

    import SpinnerButton from "./SpinnerButton.svelte";
    import RaceStanding from "./RaceStanding.svelte";
    import {
        raceConfig,
        driverMap,
        doRefreshBlocks,
        statusMessage,
        userEmail,
    } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";
    import { participantValid, participantFocusCompletion } from "./utils.js";

    const EntityFactory = require("../../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    import { isEmailAllowedRoutePath } from "./utils.js";

    export let params = {};
    var bposFromDexie = null;
    var rsFromDexie = null;
    const posForm = { A: {}, B: {} };
    var editable = false;

    var submitDisabled = false;
    var submitSpinning = false;

    var mounted = false;
    onMount(async () => {
        mounted = true;
        resetForm();
        await refreshChartFromDb();
        await refreshStandingFromDb();
        editable = await isEmailAllowedRoutePath(
            $userEmail,
            "/addChartPosition"
        );
    });
    $: {
        refreshStandingFromDb($doRefreshBlocks);
    }
    $: {
        if (editable) {
            posForm.A.input.disabled = false;
            posForm.B.input.disabled = false;
            posForm.A.select.disabled = false;
            posForm.B.select.disabled = false;
        }
    }
    const refreshChartFromDb = async (trigger) => {
        log.debug("refreshChartFromDb data:", trigger);

        const jsonFromDexie = await db.BracketPos.get(
            `${params.chartId}:${params.chartPosition}`
        );
        log.debug("refreshChartFromDb gave:", jsonFromDexie);
        if (jsonFromDexie) {
            const entityFactory = new EntityFactory({});
            bposFromDexie = entityFactory.build(jsonFromDexie);
            ["A", "B"].forEach((ab) => {
                posForm[ab].carNumber = bposFromDexie.getPtcpNumber(ab);
                if (bposFromDexie.getPtcpStatus(ab)) {
                    // don't update seedType to null!
                    posForm[ab].seedType = bposFromDexie.getPtcpStatus(ab);
                }
                updateInputUI(ab, posForm[ab].seedType);
            });

            log.debug("refreshChartFromDb form:", posForm);
        } else {
            bposFromDexie = null;
        }
    };

    /*
    $: {
        refreshStandingFromDb($doRefreshBlocks)
    }
    */
    const refreshStandingFromDb = async (trigger) => {
        log.debug("refreshStandingFromDb data:", trigger);

        const jsonFromDexie = await db.RaceStanding.get(
            `${params.chartId}:${params.chartPosition}`
        );
        log.debug("refreshStandingFromDb gave:", jsonFromDexie);
        if (jsonFromDexie) {
            const entityFactory = new EntityFactory({});
            rsFromDexie = entityFactory.build(jsonFromDexie);

            log.debug("refreshStandingFromDb form:", posForm);
        } else {
            rsFromDexie = null;
        }
    };

    async function handleSubmit() {
        log.debug("Adding:" + JSON.stringify(posForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            chartId: params.chartId,
            pos: {},
            heatNumber: params.chartPosition,
        };

        var validCount = 0;
        ["A", "B"].forEach((ab) => {
            // this should probably happen on load
            if (!posForm[ab].seedType) {
                posForm[ab].seedType = "ptcp";
            }
            var seedObject = {
                status: posForm[ab].seedType,
                ptcp: "",
            };

            log.debug("Initialized seedObject:", seedObject);
            if (
                seedObject.status === "ptcp" ||
                seedObject.status === "forfeit"
            ) {
                if (!posForm[ab].carNumber) {
                    log.debug("allow empty preSeed:", posForm[ab]);
                    // let empty/null/undefined racers through bracket mgmt.  they may not be known yet.
                } else if (participantValid(posForm[ab].carNumber)) {
                    log.debug("valid preSeed:", posForm[ab]);

                    seedObject.ptcp = posForm[ab].carNumber.toString();
                } else {
                    log.debug("invalid preSeed:", posForm[ab]);
                    $statusMessage = {
                        text: `Invalid Participant: [${posForm[ab].carNumber}]`,
                        type: "error",
                    };
                    return; // return from closure [AB]
                }
            }

            if (
                (seedObject.ptcp && seedObject.status === "forfeit") ||
                seedObject.status === "bye" ||
                seedObject.status === "ptcp" // allow empty ptcp (waiting for bracket prgress)
            ) {
                log.debug("Good seedObject:", seedObject);
                req.pos[ab] = seedObject;
            } else {
                log.debug("Skip seedObject:", seedObject);
            }
            validCount++;
        });

        if (validCount < 2) {
            return;
        }
        log.debug("token:" + bearer);

        submitSpinning = true;

        axios.defaults.headers.common["Authorization"] = bearer;

        axios
            .post($raceConfig.baseUrl + "/addChartPosition", req)
            .then((response) => {
                log.debug("addChartPosition axios success ", response);
                if (response.data.error) {
                    $statusMessage = {
                        text: response.data.error,
                        type: "error",
                    };
                } else {
                    pop();
                }
            })
            .catch((err) => {
                submitSpinning = false;
                log.debug("addChartPosition failed: " + err);
            });
    }

    const resetForm = () => {
        ["A", "B"].forEach((ab) => {
            posForm[ab].carNumber = "";
            posForm[ab].seedType = "ptcp";
        });
    };

    const getDriverName = (number) => {
        log.debug("gdn: " + number);
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return "";
        }
    };

    function updateInputUI(ab, value) {
        const displayStyle = value === "bye" ? "none" : "block";
        posForm[ab].input.style.display = displayStyle;
    }

    const changeFocus = (carNumber, seedIdentifier) => {
        log.debug("changeFocus ", seedIdentifier, " ", carNumber);
        if (participantFocusCompletion(carNumber)) {
            if (seedIdentifier == "A") {
                posForm.B.input.focus();
            }
        }
    };
</script>

<style>
    .card {
        box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2);
        transition: 0.3s;
        width: min-content;
        border-radius: 5px;
    }

    .card:hover {
        box-shadow: 0 8px 16px 0 rgba(0, 0, 0, 0.2);
    }

    .container {
        padding: 2px 16px;
    }
</style>

<h2>Heat: {params.chartPosition}</h2>
<form>

    <div class="card">
        <div class="container">
            <div id="seedADiv">
                <h3>{params.chartPosition}A</h3>
                <select
                    bind:this={posForm.A.select}
                    bind:value={posForm.A.seedType}
                    on:change={() => updateInputUI('A', posForm.A.seedType)}
                    disabled>
                    <option value="ptcp">Racer</option>
                    <option value="bye">Bye</option>
                    <option value="forfeit">Forfeit</option>
                </select>
                <div id="seedACarInput">
                    <input
                        type="number"
                        bind:this={posForm.A.input}
                        bind:value={posForm.A.carNumber}
                        placeholder="Car Number 1"
                        on:keyup={() => {
                            changeFocus(posForm.A.carNumber, 'A');
                        }}
                        disabled />
                    <p>{getDriverName(posForm.A.carNumber)}</p>
                </div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="container">
            <div id="seedBDiv">
                <h3>{params.chartPosition}B</h3>
                <select
                    bind:this={posForm.B.select}
                    bind:value={posForm.B.seedType}
                    on:change={() => updateInputUI('B', posForm.B.seedType)}
                    disabled>
                    <option value="ptcp">Racer</option>
                    <option value="bye">Bye</option>
                    <option value="forfeit">Forfeit</option>
                </select>
                <div id="seedBCarInput">
                    <input
                        type="number"
                        bind:this={posForm.B.input}
                        bind:value={posForm.B.carNumber}
                        placeholder="Car Number 2"
                        on:keyup={() => {
                            changeFocus(posForm.B.carNumber, 'B');
                        }}
                        disabled />

                    <p>{getDriverName(posForm.B.carNumber)}</p>
                </div>
            </div>
        </div>
    </div>
    <br />
    <br />
    <br />

    {#if editable}
        <SpinnerButton
            disabled={submitDisabled}
            on:click={handleSubmit}
            spinning={submitSpinning}>
            Update
        </SpinnerButton>
    {/if}

    {#if rsFromDexie}
        <br />
        <br />
        <RaceStanding standing={rsFromDexie} refresh={doRefreshBlocks} />
    {/if}
</form>
