<script>
    import { raceConfig } from './stores.js';
    import { store } from './stores/auth.js'
    import { Auth } from 'aws-amplify';
    import { onMount } from 'svelte';
    import {push, pop, replace} from 'svelte-spa-router'
  
    import axios from "axios";
    export let params = {}
  
    console.log("ManualTimeAdd", params)
  
    
    async function  handleSubmit()   {
      console.log("Manual Timer:" + JSON.stringify(resultForm))
      const currentSession = await Auth.currentSession();
      const bearer=currentSession.idToken.jwtToken;
      
      if(!resultForm.lane1){
        resultForm.lane1=0; 
      }
      if(!resultForm.lane2){
        resultForm.lane2=0; 
      }

      const req = {
        orgId: $raceConfig.orgId,
        SK: params.rpKey,

        phr: [resultForm.lane1 , resultForm.lane2 ],
      }
  
      axios.defaults.headers.common['Authorization'] = bearer;
  
      const endPoint="/doApplyFinishTime"
      axios.post($raceConfig.baseUrl + endPoint, req)
        .then((response) => {
          console.log(endPoint+" axios success")
          pop();
        })
        .catch((err) => {
          console.log(endPoint+" failed: " + err)
        })
        resultForm.lane1 = undefined;
        resultForm.lane2 = undefined;
    }
    const resultForm = {
        lane1:undefined,
        lane2:"abc"
    }
  </script>
  <h3>Manual Timing Results</h3>
  <form on:submit|preventDefault={handleSubmit}>
    <label>
      <input type="number" bind:value={resultForm.lane1} placeholder="Lane1 MS" />
    </label>
    <label>
      <input type="number" bind:value={resultForm.lane2} placeholder="Lane2 MS" />
    </label>
    <button type="submit">Apply Time</button>
  </form>