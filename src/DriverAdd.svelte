<script>
    import { raceConfig, statusMessage } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";

    import axios from "axios";

    var mounted = false;
    onMount(async () => {
        console.log("mounted focus");
        document.getElementById("carNumber").focus();
        mounted = true;
        $statusMessage = {
            text: "Ready to add Driver",
            type: "success",
        };
    });
    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(loginForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            number: Number(loginForm.carNumber),
            name: loginForm.driverName,
        };

        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        const newPtcp = loginForm.carNumber;
        axios
            .post($raceConfig.baseUrl + "/addParticipant", req)
            .then((response) => {
                $statusMessage = {
                    text: `Driver [${newPtcp}] Added.`,
                    type: "success",
                };
                //console.log("driverAdd axios success")
                pop();
            })
            .catch((err) => {
                $statusMessage = {
                    text: "driverAdd failed: " + err,
                    type: "error",
                };
                //console.log("driverAdd failed: " + err)
            });
        loginForm.driverName = "";
        loginForm.carNumber = "";
    }

    const loginForm = {};

    const changeFocus = (carNumber, textboxIdentifier) => {
        if (textboxIdentifier == "A") {
            if (carNumber.toString().length == 3) {
                document.getElementById("driverName").focus();
            }
        }
        syncAddButton();
    };

    const syncAddButton = () => {
        if (!mounted) {
            return;
        }
        if (loginForm.carNumber && loginForm.driverName) {
            if (
                String(loginForm.carNumber).length >= 3 &&
                loginForm.driverName.toString() != ""
            ) {
                document.getElementById("formSubmitButton").disabled = false;
                console.log("sync add button SYNC");
            } else {
                document.getElementById("formSubmitButton").disabled = true;
                console.log("sync add button FAIL");
            }
        } else {
            document.getElementById("formSubmitButton").disabled = true;
            console.log("sync add button FAIL");
        }
    };
</script>

<h3>Add Driver</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Car Number:
        <input
            id="carNumber"
            type="number"
            bind:value={loginForm.carNumber}
            placeholder="Car Number"
            on:keyup={() => {
                changeFocus(loginForm.carNumber, 'A');
            }} />
    </label>
    <label>
        Driver:
        <input
            id="driverName"
            type="text"
            bind:value={loginForm.driverName}
            placeholder="Driver Name"
            on:keyup={() => {
                changeFocus(null, 'B');
            }} />
    </label>
    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>
