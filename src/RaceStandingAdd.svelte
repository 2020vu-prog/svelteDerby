<script>
  import { raceConfig } from './stores.js';
  import { store } from './stores/auth.js'
  import { Auth } from 'aws-amplify';
  import { onMount } from 'svelte';
  import { push, pop, replace } from 'svelte-spa-router'

  import axios from "axios";
  export let params = {}

  let errMessage = undefined; // empty to start.
  let spinner = undefined; // empty to start.
  console.log("RaceStandingAdd", params)

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

  });
  const changeFocus=(cn1)=>{
    console.log("changeFocus",cn1)
    console.log("changeFocus",cn1)
    if(cn1.toString().length==3){
      document.getElementById("cn2").focus();

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
        errMessage = response.data.error;
      }
      else {
        pop();
      }
    }
    catch (err) {
      errMessage = err;

    }
    spinner = false;

    carNumberForm.car1 = "";
    carNumberForm.car2 = "";
  }
  const carNumberForm = {
  }
</script>
<h3>{title}</h3>

{#if errMessage}
<p class="errorMessage">{errMessage}</p>
{/if}

<form on:submit|preventDefault={handleSubmit}>
  <label>
    <input type="number" bind:value={carNumberForm.car1} placeholder="Car1" id="cn1" on:keyup={() => {changeFocus(carNumberForm.car1);}} 
    />
  </label>
  <label>
    <input type="number" bind:value={carNumberForm.car2} placeholder="Car2" id="cn2"/>
  </label>
  <button type="submit">Add</button>
</form>

<style>
   .errorMessage {
    background: papayawhip;
    color: red;
    padding: 1rem;
  }
</style>