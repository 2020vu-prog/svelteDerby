<script>
  import { raceConfig } from './stores.js';
  import { store } from './stores/auth.js'
  import { Auth } from 'aws-amplify';
  import { onMount } from 'svelte';
  import {push, pop, replace} from 'svelte-spa-router'

  import axios from "axios";
  export let params = {}

  console.log("RaceStandingAdd", params)

  const typeVars={
    RaceStanding:{
      title: "Add Pending Race",
      endPoint: '/addPending'
    },
    RacePhase:{
      title: "Add Blocks",
      endPoint:"/addBlocks"
    },
  }
  var title = "abc";
  const unMapType=(feature)=>{
    if(typeVars[params.type] && typeVars[params.type][feature]){
      return typeVars[params.type][feature];
    }
    console.log("unMapType:missing map for ",params.type, feature);
    return "unknown";
  }
  onMount(async () => {
    console.log("mounted type:", params.type);
    title = unMapType("title"); 

  });
  
  async function  handleSubmit()   {
    console.log("Adding:" + JSON.stringify(carNumberForm))
    const currentSession = await Auth.currentSession();
    const bearer=currentSession.idToken.jwtToken;
    
    const req = {
      orgId: $raceConfig.orgId,
      cn: [carNumberForm.car1 + "", carNumberForm.car2 + ""],
    }

    axios.defaults.headers.common['Authorization'] = bearer;

    const endPoint=unMapType("endPoint"); 
    axios.post($raceConfig.baseUrl + endPoint, req)
      .then((response) => {
        console.log(endPoint+" axios success")
        pop();
      })
      .catch((err) => {
        console.log(endPoint +" failed: " + err)
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