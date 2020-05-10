<script>
    import { raceConfig, driverMap } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    import { db } from "./eventDb.js";
    import axios from "axios";

    export let params = {};
    var bposFromDexie = {};
    const loginForm = {};

    var mounted = false;
    onMount(async () => {
        mounted = true;
        await refreshDataFromDb();
    });
    const refreshDataFromDb = async (trigger) => {
        console.log("refreshDataFromDb data:", trigger);

        bposFromDexie = await db.BracketPos.get(
            `${params.chartId}:${params.chartPosition}`
        );
        console.log("refreshDataFromDb gave:", bposFromDexie);
        loginForm.carNumber1 = getPtcpFromEntity("A");
        loginForm.carNumber2 = getPtcpFromEntity("B");
        //TODO: bind and set status!
        console.log("refreshDataFromDb form:", loginForm);
    };

    const getPtcpFromEntity = (ab) => {
        console.log("getPtcpFromEntity ab:", ab);
        if (bposFromDexie && bposFromDexie.pos) {
            console.log("getPtcpFromEntity filtering:", ab);
            const abMatch = bposFromDexie.pos.filter(
                (entry) => entry.id === ab
            );
            console.log("getPtcpFromEntity filtered:", abMatch);
            if (abMatch) {
                return abMatch[0].ptcp;
            }
        }

        return "";
    };
    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(loginForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            chartId: params.chartId,
            pos: [],
            heatNumber: params.chartPosition,
        };
        var seedAObject = {
            id: "A",
            status: document.getElementById("seedAType").value,
            ptcp: "",
        };
        var seedBObject = {
            id: "B",
            status: document.getElementById("seedBType").value,
            ptcp: "",
        };

        if (seedAObject.status == "ptcp" || seedBObject.status == "forfeit") {
            seedAObject.ptcp = document.getElementById("car1").value;
        }

        if (seedBObject.status == "ptcp" || seedBObject.status == "forfeit") {
            seedBObject.ptcp = document.getElementById("car2").value;
        }
        req.pos.push(seedAObject, seedBObject);
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
        loginForm.carNumber1 = "";
        loginForm.carNumber2 = "";
    }

    const syncAddButton = (shouldEnableButton) => {
        if (!mounted) {
            return;
        }
        var syncCounter = 0;
        if (document.getElementById("seedAType").value == "bye") {
            syncCounter += 0.5;
        } else {
            if (document.getElementById("car1").value.toString().length >= 3) {
                syncCounter += 0.5;
            }
        }

        if (document.getElementById("seedBType").value == "bye") {
            syncCounter += 0.5;
        } else {
            if (document.getElementById("car2").value.toString().length >= 3) {
                syncCounter += 0.5;
            }
        }
        if (syncCounter >= 1) {
            document.getElementById("formSubmitButton").disabled = false;
            console.log(
                "syncAddButton SYNC with syncCounter at " + syncCounter
            );
        } else {
            document.getElementById("formSubmitButton").disabled = true;
            console.log(
                "syncAddButton FAIL with syncCounter at " + syncCounter
            );
        }
        document.getElementById("r1").innerHTML = getDriverName(
            loginForm.carNumber1
        );
        document.getElementById("r2").innerHTML = getDriverName(
            loginForm.carNumber2
        );
        if (shouldEnableButton == true) {
            document.getElementById("formSubmitButton").focus();
        }
    };

    const getDriverName = (number) => {
        console.log("gdn: " + number);
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return "Unknown Racer";
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
        syncAddButton(false);
    };

    const changeFocus = (carNumber, seedIdentifier) => {
        console.log("changeFocus ", seedIdentifier, " ", carNumber);
        if (carNumber.toString().length == 3) {
            if (seedIdentifier == "A") {
                document.getElementById("car2").focus();
                syncAddButton();
            } else if (seedIdentifier == "B") {
                syncAddButton(true);
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
                        bind:value={loginForm.carNumber1}
                        placeholder="Car Number 1"
                        on:keyup={() => {
                            changeFocus(loginForm.carNumber1, 'A');
                        }} />
                    <p id="r1">Unknown Racer</p>
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
                        bind:value={loginForm.carNumber2}
                        placeholder="Car Number 2"
                        on:keyup={() => {
                            changeFocus(loginForm.carNumber2, 'B');
                        }} />
                    <p id="r2">Unknown Racer</p>
                </div>
            </div>
        </div>
    </div>
    <br />
    <br />
    <br />

    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>
