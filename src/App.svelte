<script>
import  Router from 'svelte-spa-router'
import  {link} from 'svelte-spa-router'
import {push, pop, replace} from 'svelte-spa-router'

import RaceStandingList from './RaceStandingList.svelte'
import RacePhaseList from './RacePhaseList.svelte'
import DriverList from './DriverList.svelte'
import DriverAdd from './DriverAdd.svelte'
import EventSelection from './EventSelection.svelte'
import OrgSelection from './OrgSelection.svelte'
import ManualTimerAdd from './ManualTimerAdd.svelte'
import RaceStandingAdd from './RaceStandingAdd.svelte'
import Login from './Login.svelte'
import HotLoad from "./HotLoad.svelte";
//import CognitoAuth from "./CognitoAuth.svelte";
import { raceConfig} from './stores.js';
import { onMount } from 'svelte';


const routes = {
    // Exact path
    '/': RaceStandingList,
    '/RsList/:type': RaceStandingList,
    '/RpList': RacePhaseList,
    '/drivers': DriverList,
    '/login': Login,
    '/ManualTimerAdd/:rpKey': ManualTimerAdd,
    '/raceStandingAdd/:type': RaceStandingAdd,
    '/driverAdd': DriverAdd,
    '/eventSelection/:orgIz': EventSelection,
    '/orgSelection': OrgSelection,
   // '/raceStandingAdd': RaceStandingAdd,
}

const menuMap=[
{text: "Drivers", clickHandler:() => navTo('/drivers')},
{text: "Phase History", clickHandler:() => navTo('/RpList')},
{text: "Race History", clickHandler:() => navTo('/RsList/History')},
{text: "Pending Races", clickHandler:() => navTo('/RsList/Pending')},
{text: "Watch different event", clickHandler:() => navTo('/orgSelection'),alwaysShow:true},
{text: "Login", clickHandler:() => navTo('/login'),alwaysShow:true},
]

onMount(async () => {
    console.log("mounted app");
    replace('/orgSelection')
  });
const shouldDisplay=(menuOption, raceConfig)=>{
  if(menuOption.alwaysShow )
    return true;

  
  return raceConfig.orgIz && raceConfig.orgId;
}
const getTitle=(cfg)=>{
  if(cfg&&cfg.title) return cfg.title;
  else
  return "";
}
/* Toggle between showing and hiding the navigation menu links when the user clicks on the hamburger menu / bar icon */
const menuClickFunction=()=>{
  var x = document.getElementById("myLinks");
  if (x.style.display === "block") {
    x.style.display = "none";
  } else {
    x.style.display = "block";
  }
}
const navTo=(route)=>{
    console.log("routing:"+route)
    menuClickFunction();
    replace(route);
}
</script>
<style>
/* Style the navigation menu */
.topnav {
  overflow: hidden;
  background-color: #333;
  position: relative;
}

/* Hide the links inside the navigation menu (except for logo/home) */
.topnav #myLinks {
  display: none;
}

/* Style navigation menu links */
.topnav a {
  color: white;
  padding: 14px 16px;
  text-decoration: none;
  font-size: 17px;
  display: block;
}

/* Style the hamburger menu */
.topnav a.icon {
  background: black;
  display: block;
  position: absolute;
  right: 0;
  top: 0;
}




/* Style the active link (or home/logo) */
.active {
  background-color: #4CAF50;
  color: white;
}
</style>
<body>
<!-- Top Navigation Menu -->
<div class="topnav">
  <a href="#home" class="active">{getTitle($raceConfig)} Derby Race <HotLoad/></a>
  <!-- Navigation links (hidden by default) -->
  <div id="myLinks">

		{#each menuMap as menuOption}
      {#if shouldDisplay(menuOption, $raceConfig)}
       <a href="javascript:void(0);"  on:click={menuOption.clickHandler}>{menuOption.text}</a>
			{/if}
		{/each}
  </div>
  <!-- "Hamburger menu" / "Bar icon" to toggle the navigation links -->
  <a href="javascript:void(0);" class="icon" on:click={menuClickFunction}>
    <i class="fa fa-bars"></i>
  </a>
</div>

    <Router {routes}/>
</body>