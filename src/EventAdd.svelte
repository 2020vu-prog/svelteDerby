<script>
    import { raceConfig } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";
    const { v4: uuidv4 } = require("uuid");
    import axios from "axios";

    export let params = {};

    var mounted = false;

    async function handleSubmit() {
        syncAddButton();

        console.log("Adding:" + JSON.stringify(orgForm), " to: ", $raceConfig);
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;
        const orgU = uuidv4().substring(0, 5);
        const orgIz = params.orgIz;
        if (!orgIz) {
            console.log("Cannot add w/o org");
            return;
        }
        const req = {
            orgId: orgIz + "." + orgU,
            orgIz: orgIz,
            lcl1: String(orgForm.lcl1),
            name: orgForm.name,
        };

        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        axios
            .post($raceConfig.baseUrl + "/addEventConfig", req)
            .then((response) => {
                console.log("addEventConfig axios success");
                pop();
            })
            .catch((err) => {
                console.log("addEventConfig failed: " + err);
            });
        orgForm = getDefaultOrgForm();
    }
    var orgForm = {};
    const getDefaultOrgForm = () => {
        return {
            name: "",
            lcl1: true,
        };
    };
    orgForm = getDefaultOrgForm();
    onMount(async () => {
        mounted = true;
    });

    const syncAddButton = () => {
        if (!mounted) {
            return;
        }
        if (orgForm.name != "" && orgForm.name != undefined) {
            console.log("name: " + orgForm.name);
            document.getElementById("formSubmitButton").disabled = false;
        } else {
            document.getElementById("formSubmitButton").disabled = true;
        }
    };
</script>

<h3>Add Event</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Name:
        <input
            id="name"
            type="text"
            bind:value={orgForm.name}
            placeholder="Event Name"
            on:keyup={() => {
                syncAddButton();
            }} />
    </label>
    <label>
        LowCarLane1:
        <input
            type="checkbox"
            id="lcl1"
            on:blur={syncAddButton()}
            bind:checked={orgForm.lcl1} />
    </label>
    <button id="formSubmitButton" type="submit" disabled>Add</button>
</form>
