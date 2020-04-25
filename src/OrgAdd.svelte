<script>
    import { raceConfig } from './stores.js';
    import { store } from './stores/auth.js'
    import { Auth } from 'aws-amplify';
    import { push, pop, replace } from 'svelte-spa-router'
    import { onMount } from 'svelte';

    import axios from "axios";


    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(orgForm))
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            lcl1: orgForm.lcl1,
            name: orgForm.name,
        }

        console.log("token:" + bearer)

        axios.defaults.headers.common['Authorization'] = bearer;

        axios.post($raceConfig.baseUrl + '/addOrg', req)
            .then((response) => {
                console.log("addOrg axios success")
                pop();
            })
            .catch((err) => {
                console.log("addOrg failed: " + err)
            })
        orgForm.name = "";
        orgForm.lcl1 = "true";
    }
    const orgForm = {
    }

</script>
<h3>Add Organization</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Name:
        <input id="name" type="text" bind:value={orgForm.name} placeholder="Organization Name" />
    </label>
    <label>
        LowCarLane1:
        <input type="text" bind:value={orgForm.lcl1} placeholder="true" />
    </label>
    <button type="submit">Add</button>
</form>