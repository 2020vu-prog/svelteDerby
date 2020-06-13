<script>
    import { raceConfig, driverMap } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";
    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    export let params = {};
    var bposFromDexie = null;
    const posForm = { A: {}, B: {} };

    var mounted = false;
    onMount(async () => {
        mounted = true;
        resetForm();
        await refreshDataFromDb();
    });
    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger);

        const jsonFromDexie = await db.BracketPos.get(
            `${params.chartId}:${params.chartPosition}`
        );
        console.log("refreshDataFromDb gave:", jsonFromDexie);
        if (jsonFromDexie) {
            const entityFactory = new EntityFactory({});
            bposFromDexie = entityFactory.build(jsonFromDexie);
            ["A", "B"].forEach((ab) => {
                posForm[ab].carNumber = bposFromDexie.getPtcpNumber(ab);
                posForm[ab].seedType = bposFromDexie.getPtcpStatus(ab);
                updateInputUI(ab, posForm[ab].seedType);
            });

            console.log("refreshDataFromDb form:", posForm);
        } else {
            bposFromDexie = null;
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

        ["A", "B"].forEach((ab) => {
            var seedObject = {
                status: posForm[ab].seedType,
                ptcp: "",
            };
            if (
                seedObject.status === "ptcp" ||
                seedObject.status === "forfeit"
            ) {
                seedObject.ptcp = posForm[ab].carNumber.toString();
            }

            if (
                (seedObject.ptcp &&
                    (seedObject.status === "ptcp" ||
                        seedObject.status === "forfeit")) ||
                seedObject.status === "bye"
            ) {
                req.pos[ab] = seedObject;
            }
        });

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

    const updateInputUI = (seedCharacter, value) => {
        if (value == "bye") {
            document.getElementById(
                "seed" + seedCharacter + "CarInput"
            ).style.display = "none";
        } else {
            document.getElementById(
                "seed" + seedCharacter + "CarInput"
            ).style.display = "block";
        }
    };

    const changeFocus = (carNumber, seedIdentifier) => {
        console.log("changeFocus ", seedIdentifier, " ", carNumber);
        if (carNumber.toString().length == 3) {
            if (seedIdentifier == "A") {
                document.getElementById("car2").focus();
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
                    bind:value={posForm.A.seedType}
                    on:change={() => updateInputUI('A', posForm.A.seedType)}>
                    <option value="ptcp">Racer</option>
                    <option value="bye">Bye</option>
                    <option value="forfeit">Forfeit</option>
                </select>
                <div id="seedACarInput">
                    <input
                        id="car1"
                        type="number"
                        bind:value={posForm.A.carNumber}
                        placeholder="Car Number 1"
                        on:keyup={() => {
                            changeFocus(posForm.A.carNumber, 'A');
                        }} />
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
                    bind:value={posForm.B.seedType}
                    on:change={() => updateInputUI('B', posForm.B.seedType)}>
                    <option value="ptcp">Racer</option>
                    <option value="bye">Bye</option>
                    <option value="forfeit">Forfeit</option>
                </select>
                <div id="seedBCarInput">
                    <input
                        id="car2"
                        type="number"
                        bind:value={posForm.B.carNumber}
                        placeholder="Car Number 2"
                        on:keyup={() => {
                            changeFocus(posForm.B.carNumber, 'B');
                        }} />
                    <p>{getDriverName(posForm.B.carNumber)}</p>
                </div>
            </div>
        </div>
    </div>
    <br />
    <br />
    <br />

    <button type="submit">Add</button>
</form>
