<script>
    import Router from "svelte-spa-router";
    import { link, location } from "svelte-spa-router";
    import { push, pop, replace } from "svelte-spa-router";
    import { store as AuthStore } from "./stores/auth.js";

    import RaceStandingList from "./RaceStandingList.svelte";
    import RacePhaseList from "./RacePhaseList.svelte";
    import ChartList from "./ChartList.svelte";
    import StatusMessage from "./StatusMessage.svelte";
    import ChartAdd from "./ChartAdd.svelte";
    import DriverList from "./DriverList.svelte";
    import DriverAdd from "./DriverAdd.svelte";
    import EventSelection from "./EventSelection.svelte";
    import EventAdd from "./EventAdd.svelte";

    import OrgSelection from "./OrgSelection.svelte";
    import OrgAdd from "./OrgAdd.svelte";
    import ManualTimerAdd from "./ManualTimerAdd.svelte";
    import RaceStandingAdd from "./RaceStandingAdd.svelte";
    import AboutPage from "./AboutPage.svelte";
    import ChartDetail from "./ChartDetail.svelte";
    import ChartPosition from "./ChartPosition.svelte";

    import Login from "./Login.svelte";
    import HotLoad from "./HotLoad.svelte";
    //import CognitoAuth from "./CognitoAuth.svelte";
    import { raceConfig, theme } from "./stores.js";
    import { onMount } from "svelte";
    import { db, localConfigDb } from "./eventDb.js";
    const EntityFactory = require("../backend/modules/lambdaDerby/src/shared/EntityFactory.js");

    const routes = {
        // Exact path
        "/": RaceStandingList,
        "/RsList/:type": RaceStandingList,
        "/RpList": RacePhaseList,
        "/drivers": DriverList,
        "/login": Login,
        "/ManualTimerAdd/:rpKey": ManualTimerAdd,
        "/raceStandingAdd/:type": RaceStandingAdd,
        "/driverAdd": DriverAdd,
        "/eventSelection/:orgIz": EventSelection,
        "/eventAdd/:orgIz": EventAdd,
        "/orgSelection": OrgSelection,
        "/orgAdd": OrgAdd,
        "/about": AboutPage,
        "/chartDetail/:chartId": ChartDetail,
        "/chartPosition/:chartId/:chartPosition": ChartPosition,
        "/chartList": ChartList,
        "/chartAdd": ChartAdd,
        // '/raceStandingAdd': RaceStandingAdd,
    };

    $: buildMenuMap($AuthStore);
    // empty menumap here seems to cause CSS issues!
    let menuMap = [
        {
            text: "Watch different event",
            clickHandler: () => navTo("/orgSelection"),
            alwaysShow: true,
        },
    ];
    const buildMenuMap = () => {
        const loginLabel =
            $AuthStore && $AuthStore.username
                ? `Logout [${$AuthStore.username}]`
                : "Login";

        menuMap = [
            { text: "Drivers", clickHandler: () => navTo("/drivers") },
            { text: "Phase History", clickHandler: () => navTo("/RpList") },
            {
                text: "Race History",
                clickHandler: () => navTo("/RsList/History"),
            },
            {
                text: "Pending Races",
                clickHandler: () => navTo("/RsList/Pending"),
            },
            {
                text: "Charts",
                clickHandler: () => navTo("/chartList"),
            },

            {
                text: "Watch different event",
                clickHandler: () => navTo("/orgSelection"),
                alwaysShow: true,
            },
            {
                text: "About",
                clickHandler: () => navTo("/about"),
                alwaysShow: true,
            },

            {
                text: loginLabel,
                clickHandler: () => navTo("/login"),
                alwaysShow: true,
            },
        ];
    };
    const reloadEvent = async (raceConfigParam) => {
        const start = new Date().getTime();
        const rpList = await db.RacePhase.toArray();
        const rsList = await db.RaceStanding.toArray();
        const ptcptList = await db.Participant.toArray();
        const entityFactory = new EntityFactory({});
        const done = new Date().getTime();
        const elapsed = done - start;
        console.log("dexie reload took", elapsed);
        raceConfigParam.baseUrl = "/app";
        raceConfigParam.title = raceConfigParam.name;
        $raceConfig = raceConfigParam;
        const dexieTheme = await localConfigDb["LocalConfig"].get({
            KEY: "theme",
        });
        if (dexieTheme && dexieTheme.bgColor) {
            $theme = dexieTheme.bgColor;
        }
    };
    onMount(async () => {
        console.log("mounted app");
        buildMenuMap();
        const cfg = await db.EventConfig.toArray();
        console.log("config:", cfg);

        if (cfg.length) {
            await reloadEvent(cfg[0]);
            replace("/RpList");
        } else {
            replace("/orgSelection");
        }
    });
    const shouldDisplay = (menuOption, raceConfigParam) => {
        if (menuOption.alwaysShow) return true;

        return raceConfigParam.orgIz && raceConfigParam.orgId;
    };
    const getTitle = (cfg) => {
        if (cfg && cfg.title) return cfg.title;
        else return "";
    };
    /* Toggle between showing and hiding the navigation menu links when the user clicks on the hamburger menu / bar icon */
    const menuClickFunction = () => {
        var x = document.getElementById("myLinks");
        if (x.style.display === "block") {
            x.style.display = "none";
        } else {
            x.style.display = "block";
        }
    };

    $: {
        console.log(`collapsing menu for ${$location} change.`)
        var x = document.getElementById("myLinks");
        if (x) {
            x.style.display = "none";
        }
    }

    const navTo = (route) => {
        console.log("routing:" + route);
        menuClickFunction();
        replace(route);
    };
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
        background-color: #4caf50;
        color: white;
    }
</style>

<body>
    <!-- Top Navigation Menu -->
    <div class="topnav" style="z-index: 20;">
        <a href="#home" style="background-color: {$theme}" class="active">
            {getTitle($raceConfig)}&nbsp;
            <HotLoad />
        </a>
        <!-- Navigation links (hidden by default) -->
        <div id="myLinks">

            {#each menuMap as menuOption}
                {#if shouldDisplay(menuOption, $raceConfig)}
                    <a
                        href="javascript:void(0);"
                        on:click={menuOption.clickHandler}>
                        {menuOption.text}
                    </a>
                {/if}
            {/each}
        </div>
        <!-- "Hamburger menu" / "Bar icon" to toggle the navigation links -->
        <a href="javascript:void(0);" class="icon" on:click={menuClickFunction}>
            <i class="fa fa-bars" />
        </a>
    </div>
    <StatusMessage />
    <Router {routes} />
</body>
