<script>
    import { doRefreshBlocks} from './stores.js';
    import MaterialAdd from "./MaterialAdd.svelte";
    import { raceConfig } from './stores.js';
    import { onMount } from 'svelte';
    import { Auth } from 'aws-amplify';
    import axios from "axios";

    
    var orgMap={};
    const getOrgsAsList=(orgList)=>{
        return Object.keys(orgList);
    }
    const  refreshOrgMap = async () => {
    console.log("refreshOrgMap:")
    const currentSession = await Auth.currentSession();
    const bearer=currentSession.idToken.jwtToken;


    axios.defaults.headers.common['Authorization'] = bearer;
    axios.get($raceConfig.baseUrl + "/getOrgConfig")
      .then((response) => {
        console.log("refreshOrgMap length:" + response.data.length);
        console.log("refreshOrgMap:" , response.data);
      })
      .catch((err) => {
        console.log(err);
      })
  };  

    onMount(async () => {
        refreshOrgMap();

    });
    </script>
    
    
    <div>
    <h4>Organization List </h4>
    <p/>
    
            {#each getOrgsAsList(orgMap) as orgIz}
                <div class="panel panel-info">
                    {orgIz}
                    </div>
            {/each}
    </div>