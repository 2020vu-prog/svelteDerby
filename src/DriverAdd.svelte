<script>
    import { raceConfig } from './stores.js';
    import { store } from './stores/auth.js'
    import { Auth } from 'aws-amplify';
    import { push, pop, replace } from 'svelte-spa-router'
    import { onMount } from 'svelte';

    import axios from "axios";

    onMount(async () => {
        console.log("mounted focus");
        document.getElementById("carNumber").focus();

    });
    async function handleSubmit() {
        console.log("Adding:" + JSON.stringify(loginForm))
        const currentSession = await Auth.currentSession();
        const bearer = currentSession.idToken.jwtToken;

        const req = {
            orgId: $raceConfig.orgId,
            orgIz: $raceConfig.orgIz,
            number: loginForm.carNumber,
            name: loginForm.driverName,
        }

        console.log("token:" + bearer)

        axios.defaults.headers.common['Authorization'] = bearer;

        axios.post($raceConfig.baseUrl + '/addParticipant', req)
            .then((response) => {
                console.log("driverAdd axios success")
                pop();
            })
            .catch((err) => {
                console.log("driverAdd failed: " + err)
            })
        loginForm.driverName = "";
        loginForm.carNumber = "";
    }
    const loginForm = {
    }

</script>
<h3>Add Driver</h3>

<form on:submit|preventDefault={handleSubmit}>

    <label>
        Car Number:
        <input id="carNumber" type="number" bind:value={loginForm.carNumber} placeholder="Car Number" />
    </label>
    <label>
        Driver:
        <input type="text" bind:value={loginForm.driverName} placeholder="Driver Name" />
    </label>
    <button type="submit">Add</button>
</form>