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
    const posForm = {};

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
            posForm.carNumber1 = bposFromDexie.getPtcpNumber("A");
            posForm.carNumber2 = bposFromDexie.getPtcpNumber("B");
            //TODO: bind and set status!
            console.log("refreshDataFromDb form:", posForm);

            console.log(
                "TODO: Connor Data: :",
                bposFromDexie.getPtcpStatus("A")
            );
        } else {
            bposFromDexie = null;
        }
        refreshDriverNames();
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
        var seedAObject = {
            status: document.getElementById("seedAType").value,
            ptcp: "",
        };
        var seedBObject = {
            status: document.getElementById("seedBType").value,
            ptcp: "",
        };

        if (seedAObject.status == "ptcp" || seedBObject.status == "forfeit") {
            seedAObject.ptcp = posForm.carNumber1.toString();
        }

        if (seedBObject.status == "ptcp" || seedBObject.status == "forfeit") {
            seedBObject.ptcp = posForm.carNumber2.toString();
        }
        req.pos["A"] = seedAObject;
        req.pos["B"] = seedBObject;
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
        posForm.carNumber1 = "";
        posForm.carNumber2 = "";
    };

    const refreshDriverNames = () => {
        document.getElementById("r1").innerHTML = getDriverName(
            posForm.carNumber1
        );
        document.getElementById("r2").innerHTML = getDriverName(
            posForm.carNumber2
        );
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
        refreshDriverNames();
    };

    const changeFocus = (carNumber, seedIdentifier) => {
        console.log("changeFocus ", seedIdentifier, " ", carNumber);
        refreshDriverNames();
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
                    id="seedAType"
                    on:change={() => updateInputUI('A', document.getElementById('seedAType').value)}>
                    <option value="ptcp">Racer</option>
                    <option value="bye">Bye</option>
                    <option value="forfeit">Forfeit</option>
                </select>
                <div id="seedACarInput">
                    <input
                        id="car1"
                        type="number"
                        bind:value={posForm.carNumber1}
                        placeholder="Car Number 1"
                        on:keyup={() => {
                            changeFocus(posForm.carNumber1, 'A');
                        }} />
                    <p id="r1" />
                </div>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="container">
            <div id="seedBDiv">
                <h3>{params.chartPosition}B</h3>
                <select
                    id="seedBType"
                    on:change={() => updateInputUI('B', document.getElementById('seedBType').value)}>
                    <option value="ptcp">Racer</option>
                    <option value="bye">Bye</option>
                    <option value="forfeit">Forfeit</option>
                </select>
                <div id="seedBCarInput">
                    <input
                        id="car2"
                        type="number"
                        bind:value={posForm.carNumber2}
                        placeholder="Car Number 2"
                        on:keyup={() => {
                            changeFocus(posForm.carNumber2, 'B');
                        }} />
                    <p id="r2" />
                </div>
            </div>
        </div>
    </div>
    <br />
    <br />
    <br />

    <button id="formSubmitButton" type="submit">Add</button>
</form>
