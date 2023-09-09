<script>
    import log from "loglevel";
    const { v4: uuidv4 } = require("uuid");

    import Router from "svelte-spa-router";
    import { location, replace } from "svelte-spa-router";

    import BottomNav from "./BottomNav.svelte";
    import CaptureVideo from "./CaptureVideo.svelte";
    import RaceStandingList from "./RaceStandingList.svelte";
    import RacePhaseList from "./RacePhaseList.svelte";
    import RacePhaseElapsed from "./RacePhaseElapsed.svelte";
    import ChartList from "./ChartListRouter.svelte";
    import ChartList1 from "./ChartList.svelte";
    import ChartList2 from "./ChartList2.svelte";
    import ChartEdit from "./ChartEdit.svelte";
    import ChartFill from "./ChartFill.svelte";
    import ChartAdd from "./ChartAdd.svelte";
    import DriverList from "./DriverList.svelte";
    import DriverAdd from "./DriverAdd.svelte";
    import DriverInfo from "./DriverInfo.svelte";
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
    import AboutPage from "./AboutPage.svelte";
    import PreferencesPage from "./PreferencesPage.svelte";
    import ChartDetail from "./ChartDetail.svelte";
    import ChartPosition from "./ChartPosition.svelte";
    import TimerConfig from "./TimerConfig.svelte";
    import TimerConfigList from "./TimerConfigList.svelte";
    import TimerConfigElapsed from "./TimerConfigElapsed.svelte";
    import TimerAlignment from "./TimerAlignment.svelte";
    import TimerPbAlignment from "./TimerPbAlignment.svelte";
    import RouteSelection from "./RouteSelection.svelte";
    import ForceLoad from "./ForceLoad.svelte";
    import MediaList from "./MediaList.svelte";

    import ForceReloadPage from "./ForceReloadPage.svelte";
    import Login from "./Login.svelte";
    import HotLoad from "./HotLoad.svelte";
    import ElectronTimerRelay from "./ElectronTimerRelay.svelte";
    import {
        raceConfig,
        theme,
        userEmail,
        roleMap,
        developerLogging,
        statusMessage,
        beginAnonymousLogin,
        userId,
        carouselRun,
        carouselList,
        initialReloadRoute,
    } from "./stores.js";
    import { onMount } from "svelte";
    import { db, localConfigDb } from "./eventDb.js";
    import { isEmailAllowedRoutePath, sleep } from "./utils.js";

    import AutoAnonymousLogin from "./AutoAnonymousLogin.svelte";
    const routes = {
        // Exact path
        "/": RaceStandingList,
        "/RsList/:type": RaceStandingList,
        "/RpList": RacePhaseList,
        "/RpElapsed/:rpKey": RacePhaseElapsed,
        "/drivers/:selectable?": DriverList,
        "/login": Login,
        "/ManualTimerAdd/:rpKey/:winningLane?/:winningTime?": ManualTimerAdd,
        "/ManualAnnouncement": ManualAnnouncement,
        "/raceStandingAdd/:type": RaceStandingAdd,
        "/driverAdd/:number?": DriverAdd,
        "/driverInfo/:number?": DriverInfo,
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
        "/chartDetail/:chartId": ChartDetail,
        "/chartPosition/:chartId/:chartPosition": ChartPosition,
        "/chartList": ChartList,
        "/chartList1": ChartList1,
        "/chartList2": ChartList2,
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
        "/rawTimerList": RawTimerList,
        "/spMediaList/:dbName/:dbKey": MediaList,
        "/forceReloadPage": ForceReloadPage,
        "/captureVideo": CaptureVideo,
        // '/raceStandingAdd': RaceStandingAdd,
    };

    var isMounted = false;
    // empty menumap here seems to cause CSS issues!
    let menuMap = [
        {
            text: "Watch different event",
            menuRoute: "/orgSelection",

            alwaysShow: true,
        },
    ];
    $: {
        if (isMounted) {
            // rebuild menuMap when roleMap changes
            log.debug("bmm:", $userId, $userEmail, $roleMap);
            buildMenuMap($userId, $userEmail, $roleMap);
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
    async function buildMenuMap() {
        log.debug("bmm: userEmailStored:", $userEmail);

        if ($userId) {
            log.debug("bmm: uid:", $userId);
        }

        const loginLabel = $userId ? `Logout [${$userId}]` : "Login";

        menuMap = [
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
                text: "Manual Announcement",
                menuRoute: "/ManualAnnouncement",
            },

            {
                text: "Watch different event",
                menuRoute: "/orgSelection",
                alwaysShow: true,
            },
            {
                text: "Timer Config (Original)",
                menuRoute: "/timerConfig",
            },
            {
                text: "Timer Config (Elapsed)",
                menuRoute: "/timerConfigList",
            },
            {
                text: "Raw Timer List",
                menuRoute: "/rawTimerList",
            },
            {
                text: "Org Users",
                menuRoute: "/orgUserList",
            },
            {
                text: "Preferences",
                menuRoute: "/preferences",
                alwaysShow: true,
            },

            {
                text: "Capture Video",
                menuRoute: "/captureVideo",
            },
            //TODO: populate orgIz from db?
            // (not really needed, b/c we can pull it from dexie...)
            {
                text: "Update Event Settings",
                menuRoute: "/eventAdd/db/Update",
            },
            {
                text: loginLabel,
                menuRoute: "/login",
                alwaysShow: true,
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
        logUserInIfNecessary();

        isMounted = new Date().getTime();
    });
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
        log.debug(`${tag} location:`, $location);

        if (false) {
        } else if ($location.startsWith("/as/")) {
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

        //return raceConfigParam.orgIz && raceConfigParam.orgId;
        log.debug(
            `iuarp: ${email} `,
            isEmailAllowedRoutePath(email, menuOption.menuRoute)
        );
        return (
            raceConfigParam.orgIz &&
            raceConfigParam.orgId &&
            isEmailAllowedRoutePath(email, menuOption.menuRoute)
        );
    };
    const getTitle = (cfg) => {
        if (cfg && cfg.name) return cfg.name;
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

    const navTo = (route) => {
        log.debug("routing:" + route);
        menuClickFunction();
        replace(route);
    };
    function onPageShow() {
        /*
        $statusMessage = {
            text: `onPageShow`,
            type: "success",
        };
        */
    }

    async function logUserInIfNecessary() {
        await sleep(2500); // let things settle before possibly logging user out erroneously.
        if (!$userEmail) {
            log.debug("User is not logged in, requesting autoAnonymousLogin.");
            $beginAnonymousLogin = true;
        }
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
        background-color: #4caf50;
        color: white;
    }
</style>

<svelte:window on:pageshow={onPageShow} />

<AutoAnonymousLogin display="false" />
<ElectronTimerRelay />

<!-- Top Navigation Menu -->
<div id="topnav" class="topnav" style="z-index: 20; ">
    <a style="background-color: {$theme}" class="active">
        {getTitle($raceConfig)}&nbsp;
        {#if $userEmail && $raceConfig}
            <HotLoad />
        {/if}
    </a>
    <div id="myLinks">
        {#each menuMap as menuOption}
            {#if shouldDisplay($userEmail, menuOption, $raceConfig)}
                <a on:click={() => navTo(menuOption.menuRoute)}>
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
<main>
    <Router {routes} />
</main>
<BottomNav />
