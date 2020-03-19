

<script>
    import { doRefreshBlocks } from './stores.js';
    import MaterialAdd from "./MaterialAdd.svelte";
    import { raceConfig } from './stores.js';
    import { onMount } from 'svelte';
    import { Auth } from 'aws-amplify';
    import axios from "axios";
    import {push, pop, replace} from 'svelte-spa-router'
    export let params = {}

  
    var orgMap = {};
    $: { console.log("bound orgMap: ", orgMap); }
  
    const getOrgsAsList = (orgList) => {
      return Object.values(orgList);
    }
    const refreshOrgMap = async () => {
      console.log("refreshOrgMap:")
      const currentSession = await Auth.currentSession();
      const bearer = currentSession.idToken.jwtToken;
  
  
      axios.defaults.headers.common['Authorization'] = bearer;
      axios.get($raceConfig.baseUrl + "/listOrgEvents?orgIz="+params.orgIz)
        .then((response) => {
          console.log("refreshOrgMap length:" + response.data.length);
          console.log("refreshOrgMap:", response.data);
          orgMap = response.data;
        })
        .catch((err) => {
          console.log(err);
        })
    };
  
    onMount(async () => {
      refreshOrgMap();
  
    });
    const doSelect=(config)=>{

        //console.log("selecting id: ", config.orgId);
        //console.log("selecting iz:", config.orgIz);
        console.log("selecting config:", config);
        config.baseUrl="/app";
        config.title=config.orgName?config.orgName:config.orgId;

        $raceConfig=config;
        replace("/RpList");
    }
  </script>
  
  
  <div>
    <h4>EventSelection for {params.orgIz}</h4>

    <p />
  
    {#each getOrgsAsList(orgMap) as orgConfig}
                  <div class="panel panel-info">
                      <a href="javascript:void(0);"  on:click={() => doSelect(orgConfig)}>{orgConfig.orgId}</a>
                      </div>
              {/each}
      </div>