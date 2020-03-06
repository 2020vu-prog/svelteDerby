<script>
  import { raceConfig } from './stores.js';
  import { store } from './stores/auth.js'
  import { Auth } from 'aws-amplify';
  import { onMount } from 'svelte';
  import {push, pop, replace} from 'svelte-spa-router'

  import axios from "axios";
  export let params = {}

  console.log("RaceStandingAdd", params)

  var title = "abc";
  onMount(async () => {
    console.log("mounted type:", params.type);
    title = (params.type === "RaceStanding") ? "Add Pending Race" : "Add Blocks"

  });
  function handleSubmit() {
    console.log("Adding:" + JSON.stringify(carNumberForm))
    //const currentSession = await Auth.currentSession();
    Auth.currentSession(); // refresh token. TODO: await!

    const req = {
      orgId: $raceConfig.orgId,
      cn: [carNumberForm.car1 + "", carNumberForm.car2 + ""],
    }
    const bearer = $store.signInUserSession.idToken.jwtToken

    console.log("token:" + bearer)

    axios.defaults.headers.common['Authorization'] = bearer;

    axios.post($raceConfig.baseUrl + '/addPending', req)
      .then((response) => {
        console.log("addPending axios success")
        pop();
      })
      .catch((err) => {
        console.log("addPending failed: " + err)
      })
    carNumberForm.car1 = "";
    carNumberForm.car2 = "";
  }
  const carNumberForm = {
  }
</script>
<h3>{title}</h3>
<form on:submit|preventDefault={handleSubmit}>
  <label>
    <input type="number" bind:value={carNumberForm.car1} placeholder="Car1" />
  </label>
  <label>
    <input type="number" bind:value={carNumberForm.car2} placeholder="Car2" />
  </label>
  <button type="submit">Add</button>
</form>