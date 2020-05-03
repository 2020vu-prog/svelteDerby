<script>
    import { raceConfig, driverMap, statusMessage } from './stores.js';
    import { store } from './stores/auth.js'
    import { Auth } from 'aws-amplify';
    import { onMount } from 'svelte';
    import { push, pop, replace } from 'svelte-spa-router'

    import axios from "axios";
    export let params = {}
    let spinner = undefined; // empty to start.
    console.log("RaceStandingAdd", params)
    var mounted = false;
    const typeVars = {
        RaceStanding: {
            title: "Add Pending Race",
            endPoint: '/addPending'
        },
        RacePhase: {
            title: "Add Blocks",
            endPoint: "/addBlocks"
        },
    }
    var title = "abc";
    const unMapType = (feature) => {
        if (typeVars[params.type] && typeVars[params.type][feature]) {
            return typeVars[params.type][feature];
        }
        console.log("unMapType:missing map for ", params.type, feature);
        return "unknown";
    }
    onMount(async () => {
        console.log("mounted type:", params.type);
        title = unMapType("title");
        document.getElementById("cn1").focus();
        mounted = true;
    });
    const changeFocus = (carNumber, seedIdentifier) => {
        console.log("changeFocus ", seedIdentifier, " ", carNumber)
        if (carNumber.toString().length == 3) {
            if (seedIdentifier == "A") {
                document.getElementById("cn2").focus();
                syncAddButton();
            } else if (seedIdentifier == "B") {
                syncAddButton(true);
            }
        }
    }

    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(carNumberForm))
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            cn: [carNumberForm.car1 + "", carNumberForm.car2 + ""],
        }

        axios.defaults.headers.common['Authorization'] = bearer;

        const endPoint = unMapType("endPoint");
        spinner = true
        try {
            const response = await axios.post($raceConfig.baseUrl + endPoint, req);
            console.log("add response", response)

            if (response.data.error) {
                console.log("add failed", response)
                $statusMessage = {
                    text: response.data.error,
                    type: "error"
                }

            }
            else {
                pop();
            }
        }
        catch (err) {
            $statusMessage = {
                text: err,
                type: "error"
            }

        }
        spinner = false;

        carNumberForm.car1 = "";
        carNumberForm.car2 = "";
    }
    const carNumberForm = {
    }
    const syncAddButton = (shouldEnableButton) => {
        if (!mounted) {
            return;
        }
        if (document.getElementById("cn1").value.toString().length >= 3 && document.getElementById("cn2").value.toString().length >= 3) {
            document.getElementById("formSubmitButton").disabled = false;
            console.log("sync add button SYNC");
        } else {
            document.getElementById("formSubmitButton").disabled = true;
            console.log("sync add button FAIL");
        }
        document.getElementById("r1").innerHTML = getDriverName(carNumberForm.car1);
        document.getElementById("r2").innerHTML = getDriverName(carNumberForm.car2);

        if (shouldEnableButton == true) {
            document.getElementById("formSubmitButton").focus();
        }
    }
    const getDriverName = (number) => {
        console.log("gdn: " + number)
        if (number && $driverMap[number]) {
            return ($driverMap[number].name);
        }
        else {
            return "Unknown Racer";
        }
    };
</script>
<h3>{title}</h3>


<form on:submit|preventDefault={handleSubmit}>
    <label>
        <input type="number" bind:value={carNumberForm.car1} placeholder="Car1" id="cn1" on:keyup={()=>
        {changeFocus(carNumberForm.car1, "A")}}
        />
        <p id="r1">Unknown Racer</p>
    </label>

    <label>
        <input type="number" bind:value={carNumberForm.car2} placeholder="Car2" id="cn2" on:keyup={()=>
        {changeFocus(carNumberForm.car2, "B")}}/>
        <p id="r2">Unknown Racer</p>
    </label>
    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>