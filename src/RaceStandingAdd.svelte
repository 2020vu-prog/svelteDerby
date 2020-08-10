<script>
    import {
        raceConfig,
        driverMap,
        statusMessage,
        nextOnBlockKey,
    } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { onMount } from "svelte";
    import { push, pop, replace } from "svelte-spa-router";
    import { participantValid, participantFocusCompletion } from "./utils.js";

    import axios from "axios";
    export let params = {};
    let spinner = undefined; // empty to start.
    console.log("RaceStandingAdd", params);
    var mounted = false;
    const typeVars = {
        RaceStanding: {
            title: "Add Pending Race",
            endPoint: "/addPending",
        },
        RacePhase: {
            title: "Add Blocks",
            endPoint: "/addBlocks",
        },
    };
    var title = "abc";
    const unMapType = (feature) => {
        if (typeVars[params.type] && typeVars[params.type][feature]) {
            return typeVars[params.type][feature];
        }
        console.log("unMapType:missing map for ", params.type, feature);
        return "unknown";
    };
    onMount(async () => {
        console.log("mounted type:", params.type);
        title = unMapType("title");
        document.getElementById("cn1").focus();
        mounted = true;
    });
    function changeFocus(carNumber, seedIdentifier) {
        console.log("changeFocus ", seedIdentifier, " ", carNumber);
        if (participantFocusCompletion(carNumber)) {
            if (seedIdentifier == "A") {
                document.getElementById("cn2").focus();
                syncAddButton(false);
            } else if (seedIdentifier == "B") {
                syncAddButton(true);
            }
        } else {
            syncAddButton(false);
        }
    }

    async function handleSubmit() {
        const endPoint = unMapType("endPoint");

        if (endPoint == "/addBlocks" && $nextOnBlockKey.length > 0) {
            $statusMessage = {
                text:
                    "You cannot add a race to the blocks when the blocks are already occupied.",
                type: "error",
            };
            return;
        }

        console.log("Adding:" + JSON.stringify(carNumberForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            cn: [
                String(carNumberForm.car1) + "",
                String(carNumberForm.car2) + "",
            ],
        };

        //no double click
        document.getElementById("formSubmitButton").disabled = true;
        axios.defaults.headers.common["Authorization"] = bearer;

        spinner = true;
        try {
            const response = await axios.post(
                $raceConfig.baseUrl + endPoint,
                req
            );
            console.log("add response", response);

            if (response.data.error) {
                //re-enable
                document.getElementById("formSubmitButton").disabled = false;

                console.log("add failed", response);
                $statusMessage = {
                    text: response.data.error,
                    type: "error",
                };
            } else {
                pop();
            }
        } catch (err) {
            //re-enable
            document.getElementById("formSubmitButton").disabled = false;
            $statusMessage = {
                text: err,
                type: "error",
            };
        }
        spinner = false;

        carNumberForm.car1 = "";
        carNumberForm.car2 = "";
    }
    const carNumberForm = {};
    function syncAddButton(advanceFocusToSubmit) {
        if (!mounted) {
            return;
        }
        if (
            participantValid(carNumberForm.car1) &&
            participantValid(carNumberForm.car2)
        ) {
            document.getElementById("formSubmitButton").disabled = false;
            console.log("sync add button SYNC");
            if (advanceFocusToSubmit == true) {
                document.getElementById("formSubmitButton").focus();
            }
        } else {
            document.getElementById("formSubmitButton").disabled = true;
            console.log("sync add button FAIL");
        }
    }
    const getDriverName = (number) => {
        console.log("gdn: " + number);
        if (number && $driverMap[number]) {
            return $driverMap[number].name;
        } else {
            return "Unknown Racer";
        }
    };
</script>

<h3>{title}</h3>

<form on:submit|preventDefault={handleSubmit}>
    <label>
        <input
            type="number"
            bind:value={carNumberForm.car1}
            placeholder="Car 1"
            id="cn1"
            on:keyup={() => {
                changeFocus(carNumberForm.car1, 'A');
            }} />
        <p>{getDriverName(carNumberForm.car1)}</p>
    </label>

    <label>
        <input
            type="number"
            bind:value={carNumberForm.car2}
            placeholder="Car 2"
            id="cn2"
            on:keyup={() => {
                changeFocus(carNumberForm.car2, 'B');
            }} />
        <p>{getDriverName(carNumberForm.car2)}</p>
    </label>
    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>
