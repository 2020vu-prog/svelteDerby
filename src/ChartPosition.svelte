<script>
    import RaceStanding from "./RaceStanding.svelte";
    import {
        raceConfig,
        driverMap,
        doRefreshBlocks,
        statusMessage,
    } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";
    import { participantValid, participantFocusCompletion } from "./utils.js";

    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");
    import { isUserAllowedRoutePath } from "./utils.js";

    export let params = {};
    var bposFromDexie = null;
    var rsFromDexie = null;
    const posForm = { A: {}, B: {} };
    var editable = false;

    var mounted = false;
    onMount(async () => {
        mounted = true;
        resetForm();
        await refreshChartFromDb();
        await refreshStandingFromDb();
        editable = await isUserAllowedRoutePath("/addChartPosition");
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
        console.log("refreshChartFromDb data:", trigger);

        const jsonFromDexie = await db.BracketPos.get(
            `${params.chartId}:${params.chartPosition}`
        );
        console.log("refreshChartFromDb gave:", jsonFromDexie);
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

            console.log("refreshChartFromDb form:", posForm);
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
        console.log("refreshStandingFromDb data:", trigger);

        const jsonFromDexie = await db.RaceStanding.get(
            `${params.chartId}:${params.chartPosition}`
        );
        console.log("refreshStandingFromDb gave:", jsonFromDexie);
        if (jsonFromDexie) {
            const entityFactory = new EntityFactory({});
            rsFromDexie = entityFactory.build(jsonFromDexie);

            console.log("refreshStandingFromDb form:", posForm);
        } else {
            rsFromDexie = null;
        }
    };

    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(posForm));
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

            console.log("Initialized seedObject:", seedObject);
            if (
                seedObject.status === "ptcp" ||
                seedObject.status === "forfeit"
            ) {
                if (!posForm[ab].carNumber) {
                    console.log("allow empty preSeed:", posForm[ab]);
                    // let empty/null/undefined racers through bracket mgmt.  they may not be known yet.
                } else if (participantValid(posForm[ab].carNumber)) {
                    console.log("valid preSeed:", posForm[ab]);

                    seedObject.ptcp = posForm[ab].carNumber.toString();
                } else {
                    console.log("invalid preSeed:", posForm[ab]);
                    $statusMessage = {
                        text: `Invalid Participant: [${posForm[ab].carNumber}]`,
                        type: "error",
                    };
                    return; // return from closure [AB]
                }
            }

            if (
                (seedObject.ptcp &&
                    (seedObject.status === "ptcp" ||
                        seedObject.status === "forfeit")) ||
                seedObject.status === "bye"
            ) {
                console.log("Good seedObject:", seedObject);
                req.pos[ab] = seedObject;
            } else {
                console.log("Skip seedObject:", seedObject);
            }
            validCount++;
        });

        if (validCount < 2) {
            return;
        }
        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        axios
            .post($raceConfig.baseUrl + "/addChartPosition", req)
            .then((response) => {
                console.log("addChartPosition axios success");
                pop();
            })
            .catch((err) => {
                console.log("addChartPosition failed: " + err);
            });
        resetForm();
    }

    const resetForm = () => {
        ["A", "B"].forEach((ab) => {
            posForm[ab].carNumber = "";
            posForm[ab].seedType = "ptcp";
        });
    };

    const getDriverName = (number) => {
        console.log("gdn: " + number);
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
        console.log("changeFocus ", seedIdentifier, " ", carNumber);
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
<form on:submit|preventDefault={handleSubmit}>

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
        <button type="submit">Add</button>
    {/if}

    {#if rsFromDexie}
        <RaceStanding at={rsFromDexie.at} standingKey={rsFromDexie.classKey} />
    {/if}
</form>
