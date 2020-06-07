<script>
    import { raceConfig } from "./stores.js";
    import { store } from "./stores/auth.js";
    import { Auth } from "aws-amplify";
    import { push, pop, replace } from "svelte-spa-router";
    import { onMount } from "svelte";

    import axios from "axios";

    var mounted = false;
    onMount(async () => {
        mounted = true;
    });

    async function handleSubmit() {
        syncAddButton();

        console.log("Adding:" + JSON.stringify(orgForm));
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            lcl1: String(orgForm.lcl1),
            name: orgForm.name,
        };

        console.log("token:" + bearer);

        axios.defaults.headers.common["Authorization"] = bearer;

        axios
            .post($raceConfig.baseUrl + "/addOrg", req)
            .then((response) => {
                console.log("addOrg axios success");
                pop();
            })
            .catch((err) => {
                console.log("addOrg failed: " + err);
            });
        orgForm.name = "";
        orgForm.lcl1 = true;
    }
    const orgForm = {
        name: "",
        lcl1: true,
    };

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

<h3>Add Organization</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Name:
        <input
            id="name"
            type="text"
            bind:value={orgForm.name}
            placeholder="Organization Name"
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
