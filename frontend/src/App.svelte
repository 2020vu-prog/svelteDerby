<script>
    import log from "loglevel";
    const { v4: uuidv4 } = require("uuid");

    import aws_exports from "./aws-config";
    import Router from "svelte-spa-router";
    import { location, replace } from "svelte-spa-router";
    import { querystring } from "svelte-spa-router";

    import SpinnerPanel from "./SpinnerPanel.svelte";
    import Splash from "./Splash.svelte";
    import BottomNav from "./BottomNav.svelte";
    import CaptureVideo from "./CaptureVideo.svelte";
    import RaceStandingList from "./RaceStandingList.svelte";
    import RacePhaseList from "./RacePhaseList.svelte";
    import RacePhaseElapsed from "./RacePhaseElapsed.svelte";
    import ChartList from "./ChartList2.svelte";
    import ChartEdit from "./ChartEdit.svelte";
    import ChartFill from "./ChartFill.svelte";
    import ChartAdd from "./ChartAdd.svelte";
    import DriverList from "./DriverList.svelte";
    import DriverAdd from "./DriverAdd.svelte";
    import DriverInfo from "./DriverInfo.svelte";
    import DownloadCsv from "./DownloadCsv.svelte";
    import EventSelection from "./EventSelection.svelte";
    import EventAdd from "./EventAdd.svelte";
    import HistoryList from "./HistoryList.svelte";

    import OrgUserAdd from "./OrgUserAdd.svelte";
    import OrgUserList from "./OrgUserList.svelte";
    import OrgSelection from "./OrgSelection.svelte";
    import OrgAdd from "./OrgAdd.svelte";
    import ManualTimerAdd from "./ManualTimerAdd.svelte";
    import ManualAnnouncement from "./ManualAnnouncement.svelte";
    import RaceStandingAdd from "./RaceStandingAdd.svelte";
    import RawTimerList from "./RawTimerList.svelte";
    import LogMessageViewer from "./LogMessageViewer.svelte";
    import AboutPage from "./AboutPage.svelte";
    import PreferencesPage from "./PreferencesPage.svelte";
    import ProvisionWifi from "./ProvisionWifi.svelte";
    import ChartDetail from "./ChartDetail.svelte";
    import ChartDetailCardList from "./ChartDetailCardList.svelte";
    import ChartPosition from "./ChartPosition.svelte";
    import TimerConfig from "./TimerConfig.svelte";
    import TimerConfigList from "./TimerConfigList.svelte";
    import TimerConfigElapsed from "./TimerConfigElapsed.svelte";
    import TimerAlignment from "./TimerAlignment.svelte";
    import TimerPbAlignment from "./TimerPbAlignment.svelte";
    import TimerPlot from "./TimerPlot.svelte";
    import RouteSelection from "./RouteSelection.svelte";
    import ForceLoad from "./ForceLoad.svelte";
    import MediaList from "./MediaList.svelte";

    import ForceReloadPage from "./ForceReloadPage.svelte";
    import LoginH from "./LoginH.svelte";
    import HotLoad from "./HotLoad.svelte";
    import ElectronTimerRelay from "./ElectronTimerRelay.svelte";
    import MediaViewer from "./MediaViewer.svelte";
    import {
        raceConfig,
        theme,
        userEmail,
        roleMap,
        developerLogging,
        developerMode,
        pushMessage,
        userId,
        carouselRun,
        carouselList,
        initialReloadRoute,
        getOrgName,
        reRenderHotLoad,
        userExpCountDownSecs,
        userJwtStore,

    } from "./stores.js";
    import { onMount } from "svelte";
    import { db, localConfigDb } from "./eventDb.js";
    import {
         isEmailAllowedRoutePath,
         sleep ,
         refreshOrgRoles,
        } from "./utils.js";
    import { setIdTokenFromCognitoCallback } from "./utilHosted.js";
    import { urlParseSpotify } from "./utils/spotify";
    const routes = {
        // Exact path
        "/": RaceStandingList,
        "/RsList/:type": RaceStandingList,
        "/RpList": RacePhaseList,
        "/RpElapsed/:rpKey": RacePhaseElapsed,
        "/drivers/:selectable?": DriverList,
        "/loginH": LoginH,
        "/ManualTimerAdd/:rpKey/:winningLane?/:winningTime?": ManualTimerAdd,
        "/ManualAnnouncement": ManualAnnouncement,
        "/raceStandingAdd/:type": RaceStandingAdd,
        "/driverAdd/:number?": DriverAdd,
        "/driverInfo/:number?": DriverInfo,
        "/downloadCsv":DownloadCsv ,
        "/eventSelection/:orgIz": EventSelection,
        "/as/:orgIz/:orgId": EventSelection, //autoSelect shortcut
        "/eventAdd/:orgIz/:mode": EventAdd,
        "/historyList/:PK/:SK": HistoryList,
        "/orgUserList": OrgUserList,
        "/orgUserAdd/:b64User?": OrgUserAdd,
        "/orgSelection": OrgSelection,
        "/orgAdd": OrgAdd,
        "/about": AboutPage,
        "/preferences": PreferencesPage,
        "/provisionWifi": ProvisionWifi,
        "/chartDetail/:chartId": ChartDetail,
        "/chartDetailCardList/:chartId": ChartDetailCardList,
        "/chartPosition/:chartId/:chartPosition": ChartPosition,
        "/chartList": ChartList,
        "/chartEdit/:chartId": ChartEdit,
        "/chartFill/:chartId": ChartFill,
        "/chartAdd": ChartAdd,
        "/forceLoad/:b64route": ForceLoad,
        "/routeSelection/:mode": RouteSelection,
        "/timerConfig": TimerConfig,
        "/timerConfigList": TimerConfigList,
        "/timerConfigElapsed": TimerConfigElapsed,
        "/timerAlignment": TimerAlignment,
        "/timerPbAlignment": TimerPbAlignment,
        "/timerPlot": TimerPlot,
        "/rawTimerList": RawTimerList,
        "/logMessageViewer": LogMessageViewer,
        "/spMediaList/:dbName/:dbKey": MediaList,
        "/mediaDemo":MediaViewer,
        "/forceReloadPage": ForceReloadPage,
        "/captureVideo": CaptureVideo,
        // '/raceStandingAdd': RaceStandingAdd,
    };

    var isMounted = false;
    // empty generalMenuMap here seems to cause CSS issues!
    let generalMenuMap = [
        {
            text: "Watch Different Event",
            menuRoute: "/orgSelection",

            alwaysShow: true,
        },
    ];
    let adminMenuMap = [];

    const MenuType = {
        GENERAL: 'GENERAL',
        ADMIN: 'ADMIN',
        NONE: 'NONE'
    }

    var visibleMenu = MenuType.NONE;
    var eventTitlePopoverVisible = false;

    const closeEventTitlePopoverOnEscape = (event) => {
        if (event.key === "Escape") eventTitlePopoverVisible = false;
    };
    $: {
        if($userJwtStore && $userExpCountDownSecs == 0){
            log.warn("app: cleared expired jwt");
            $userJwtStore="";
        }
    }

    $: {
        if (isMounted) {
            // rebuild menu maps when roleMap changes
            log.debug("bmm:", $userId, $userEmail, $roleMap);
            buildMenuMaps($userId, $userEmail, $roleMap);
        }
    }
    $: {
        if ($developerLogging) {
            log.setLevel(log.levels.TRACE);
        } else {
            log.setLevel(log.levels.ERROR);
        }
    }

    let carouselRunUuid = "";
    $: {
        carouselRunUuid = uuidv4();
        if ($carouselRun) {
            doCarouselLoop(carouselRunUuid);
        }
    }

    async function doCarouselLoop(paramCarouselRunUuid) {
        let currentRoute = -1;
        // uuid is safeguard against multiple concurrent loops.
        while (paramCarouselRunUuid === carouselRunUuid) {
            await sleep(100); // no cpu loop!
            currentRoute = getNextCarouselRoute(currentRoute);
            if (currentRoute < 0) {
                log.debug("doCarouseLoop: quitting. config error.");
                return; // shouldn't happen.  delay logic foobar
            }
            log.debug("doCarouseLoop:", $carouselList[currentRoute].path);
            const b64route = btoa("/" + $carouselList[currentRoute].path);
            replace(`/forceLoad/${b64route}`); //ChartDetail repaint won't detect
            await sleep($carouselList[currentRoute].delay * 1000);
        }
    }
    function getNextCarouselRoute(index) {
        let wrap = 0;
        while (wrap < 10) {
            index++;
            if (index < 0) index = 0;
            if (index >= $carouselList.length) {
                index = 0;
                wrap++;
            }
            if ($carouselList[index].delay) {
                return index;
            }
        }
        return -1; // shouldn't happen
    }
    async function buildMenuMaps() {
        log.debug("bmm: userEmailStored:", $userEmail);

        if ($userId) {
            log.debug("bmm: uid:", $userId);
        }

        const loginLabel = $userId ? `Logout [${$userId}]` : "Login";

        generalMenuMap = [
            {
                text: "Drivers",
                menuRoute: "/drivers",
            },
            {
                text: "Phase History",
                menuRoute: "/RpList",
            },
            {
                text: "Race History",
                menuRoute: "/RsList/History",
            },
            {
                text: "Pending Races",
                menuRoute: "/RsList/Pending",
            },
            {
                text: "Charts",
                menuRoute: "/chartList",
            },
            {
                text: "Watch Different Event",
                menuRoute: "/orgSelection",
                alwaysShow: true,
            },
            {
                text: "Preferences & Sharing",
                menuRoute: "/preferences",
                alwaysShow: true,
            },
            {
                text: loginLabel,
                menuRoute: "/loginH",
                alwaysShow: true,
            },
        ]
        adminMenuMap = [
            {
                text: "Timer Config",
                menuRoute: "/timerConfigList",
            },
            {
                text: "List All Media",
                menuRoute: "/spMediaList/*/*",
            },
            {
                text: "Org Users",
                menuRoute: "/orgUserList",
            },
            {
                text: "Manual Announcement",
                menuRoute: "/ManualAnnouncement",
            },
            {
                text: "Capture Video",
                menuRoute: "/captureVideo",
            },
            {
                text: "Raw Timer List",
                menuRoute: "/rawTimerList",
                neverShow: true,
            },
            {
                text: "Log Messages",
                menuRoute: "/logMessageViewer",
            },
        ];
    }
    const reloadEvent = async (raceConfigParam) => {
        const start = new Date().getTime();
        const rpList = await db.RacePhase.toArray();
        const rsList = await db.RaceStanding.toArray();
        const ptcptList = await db.Participant.toArray();
        const done = new Date().getTime();
        const elapsed = done - start;
        log.debug("dexie reload took", elapsed);
        raceConfigParam.baseUrl = "/app";
        $raceConfig = raceConfigParam;
    };
    onMount(async () => {
        log.debug("mounted app");
        setEnvTitle()
        const orgIz=$raceConfig.orgIz
        await setIdTokenFromCognitoCallback();
        try {
            await urlParseSpotify();
        } catch (error) {
            log.error("Spotify callback failed", error);
        }
        await refreshOrgRoles(orgIz);
        let msg='Using public access'
        if ($userEmail){
            msg=`Logged in: [${$userEmail}]`
        }
        pushMessage( {
            text: msg,
            type: "success",
        });

        isMounted = new Date().getTime();
    });
        function setEnvTitle(){
            if (aws_exports.DeployEnvironment === 'go-derby-prod'){
                document.title = `Go RR1`
            }else{
                document.title = `${aws_exports.DeployEnvironment} Derby App`
            }


        }
    $: {
        // $userEmail required so bearer token is ready when calling apis
        replaceRouteOnInitialLoad(isMounted, $userEmail);
    }
    async function replaceRouteOnInitialLoad() {
        const tag = "replaceRouteOnInitialLoad";
        const now = new Date().getTime();
        if (!isMounted || !$userEmail) {
            console.log(`${tag} ignoring not mounted`, isMounted);
            console.log(`${tag} ignoring not email`, $userEmail);
            return;
        }
        if (isMounted + 10000 < now) {
            console.log(
                `${tag} ignoring stale state change from onload handler`
            );
            return;
        }
        const cfg = await db.EventConfig.toArray();
        log.debug(`${tag} config:`, cfg);
        log.debug(`${tag} location:`, $location, " qs:", $querystring);

        if (false) {
        } else if ($location.startsWith("/as/")) {
            log.debug(`${tag} honoring auto select:`, $location);
            replace($location);
        } else if ($location.startsWith("/loginH")) {
            log.debug(`${tag} honoring auto select:`, $location);
            replace($location);
        } else if (cfg.length) {
            await reloadEvent(cfg[0]);
            if ($initialReloadRoute) {
                replace($initialReloadRoute);
            } else {
                replace("/RpList");
            }
        } else {
            replace("/orgSelection");
        }
    }
    const shouldDisplay = (email, menuOption, raceConfigParam) => {
        if (menuOption.alwaysShow) return true;
        if (menuOption.neverShow) return false;

        //return raceConfigParam.orgIz && raceConfigParam.orgId;
        /*
        log.debug(
            `iuarp: ${email} `,
            isEmailAllowedRoutePath(email, menuOption.menuRoute)
        );
        */
        return (
            raceConfigParam.orgIz &&
            raceConfigParam.orgId &&
            isEmailAllowedRoutePath(email, menuOption.menuRoute)
        );
    };
    const getTitle = (cfg) => {
        let orgIz=''
        if ($developerMode && cfg && cfg.orgIz){
            orgIz=cfg.orgIz
            //orgIz=orgIz.replace(/.*:/,'')
            orgIz=orgIz+':'
        }
        if (cfg && cfg.name) return `${orgIz}${cfg.name}`;
        else return "";
    };

    /* Toggle between showing and hiding the navigation menus when the user clicks on the navbar icons or a menu link */
    const menuDisplayChange = (menuTypeSource) => {
        eventTitlePopoverVisible = false;
        if (menuTypeSource == visibleMenu) {
            visibleMenu = MenuType.NONE;
        } else {
            visibleMenu = menuTypeSource;
        }
    };

    const navTo = (menuOption) => {
        log.debug("routing:" + menuOption.menuRoute);
        menuDisplayChange(MenuType.NONE);
        replace(menuOption.menuRoute);
    };
    function onPageShow() {
        /*
        pushMessage( {
            text: `onPageShow`,
            type: "success",
        });
        */
    }

    function shouldDisplayAdminNavIcon() {
        for (const adminMenuOption of adminMenuMap) {
            if (shouldDisplay($userEmail, adminMenuOption, $raceConfig)) return true;
        }
        return false;
    }
</script>

<style>
    /* Style the navigation menu */
    .topnav {
        overflow: visible;
        background-color: #333;
        position: relative;
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
    .topnav div.icon {
        display: block;
        position: absolute;
        top: 0;
        height: 50px;
        width: 50px;
    }

    /* Style the active link (or home/logo) */
    .active {
        background-color: #4caf50;
        color: white;
        display: grid;
        align-items: center;
        box-sizing: border-box;
        grid-template-columns: minmax(0, 1fr) auto 50px;
        min-height: 50px;
        padding: 4px 0 4px 16px;
        position: relative;
    }

    .active.has-admin-menu {
        grid-template-columns: minmax(0, 1fr) auto 100px;
    }

    .event-title-button {
        background: transparent;
        border: 0;
        color: inherit;
        cursor: pointer;
        font: inherit;
        min-width: 0;
        overflow: hidden;
        padding: 0 1rem 0 0;
        text-align: left;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .event-title-button:focus-visible {
        outline: 2px solid white;
        outline-offset: 2px;
    }

    .event-title-popover {
        background-color: #333;
        border: 0;
        border-radius: 4px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
        color: white;
        cursor: pointer;
        font: inherit;
        left: 16px;
        max-width: calc(100vw - 32px);
        overflow-wrap: anywhere;
        padding: 0.5rem 0.75rem;
        position: absolute;
        text-align: left;
        top: calc(100% + 4px);
        z-index: 30;
    }

    .refresh-control {
        height: 40px;
    }
</style>

<svelte:window
    on:pageshow={onPageShow}
    on:keydown={closeEventTitlePopoverOnEscape}
/>

<ElectronTimerRelay />

<!-- Top Navigation Menu -->
<div id="topnav" class="topnav" style="z-index: 20; ">
    <div
        style="background-color: {$theme}"
        class="active {shouldDisplayAdminNavIcon(
            adminMenuMap,
            $userEmail,
            $raceConfig,
            $roleMap
        )
            ? 'has-admin-menu'
            : ''}"
    >
        <button
            type="button"
            class="event-title-button"
            aria-expanded={eventTitlePopoverVisible}
            aria-controls="event-title-popover"
            on:click={() =>
                (eventTitlePopoverVisible = !eventTitlePopoverVisible)}
        >
            {getTitle($raceConfig)}
        </button>
        {#if eventTitlePopoverVisible}
            <button
                id="event-title-popover"
                class="event-title-popover"
                type="button"
                aria-label="Close full event name"
                on:click={() => (eventTitlePopoverVisible = false)}
            >
                {getTitle($raceConfig)}
            </button>
        {/if}
        {#if $raceConfig}
            {#key $reRenderHotLoad}
            <span class="refresh-control">
            <HotLoad />
            </span>
            {/key}
        {/if}
    </div>
    <div style="display: {visibleMenu == MenuType.GENERAL ? "block" : "none"}">
        {#each generalMenuMap as menuOption}
            <a on:click={() => navTo(menuOption)}>
                {menuOption.text}
            </a>
        {/each}
    </div>
    <div style="display: {visibleMenu == MenuType.ADMIN ? "block" : "none"}">
        {#each adminMenuMap as adminMenuOption}   
            {#if shouldDisplay($userEmail, adminMenuOption, $raceConfig)}
                <a on:click={() => navTo(adminMenuOption)}>
                    {adminMenuOption.text}
                </a>
            {/if}
        {/each}
    </div>

    <!-- "Wrench/Screwdriver icon" to toggle the admin menu -->
    {#if shouldDisplayAdminNavIcon(adminMenuMap, $userEmail)}
    <div class="icon" style="right: 50px">
    <img style="width: 35px; margin-top: 7.5px; margin-left: 7.5px" src="screwdriver-wrench-solid.svg" on:click={()=>menuDisplayChange(MenuType.ADMIN)}>
    </div>
    {/if}

    <!-- "Hamburger menu" / "Bar icon" to toggle the general menu -->
    <div class="icon" style="right: 0">
    <img style="width: 35px; margin-top: 5px; margin-left: 7.5px" src="bars-solid.svg" on:click={()=>menuDisplayChange(MenuType.GENERAL)}>
    </div>
</div>
{#if visibleMenu == MenuType.NONE}
<main>
    <SpinnerPanel/>
    <Splash />
    <Router {routes} />
</main>
<BottomNav />
{/if}
