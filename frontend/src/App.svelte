<script>
    import log from "loglevel";
    const { v4: uuidv4 } = require("uuid");

    import aws_exports from "./aws-config";
    import { location, replace } from "svelte-spa-router";
    import { querystring } from "svelte-spa-router";

    import SpinnerPanel from "./SpinnerPanel.svelte";
    import Splash from "./Splash.svelte";
    import BottomNav from "./BottomNav.svelte";
    import RouteHost from "./routes/RouteHost.svelte";
    import HotLoad from "./HotLoad.svelte";
    import ElectronTimerRelay from "./ElectronTimerRelay.svelte";
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
    import { sleep, refreshOrgRoles } from "./utils.js";
    import { routeRegistry } from "./routes/routeRuntime.js";
    import { setIdTokenFromCognitoCallback } from "./utilHosted.js";
    import { urlParseSpotify } from "./utils/spotify";
    const { canAccessRoute } = require("./routes/routeAccess.js");
    const { getMenuItems } = require("./routes/routeRegistry.js");
    const { MenuSection } = require("./routes/routeDefinitions.js");

    var isMounted = false;
    let generalMenuMap = [];
    let adminMenuMap = [];

    const MenuType = {
        GENERAL: "GENERAL",
        ADMIN: "ADMIN",
        NONE: "NONE",
    };

    var visibleMenu = MenuType.NONE;
    var eventTitlePopoverVisible = false;

    const closeEventTitlePopoverOnEscape = (event) => {
        if (event.key === "Escape") eventTitlePopoverVisible = false;
    };
    $: {
        if ($userJwtStore && $userExpCountDownSecs == 0) {
            log.warn("app: cleared expired jwt");
            $userJwtStore = "";
        }
    }

    $: menuContext = {
        raceConfig: $raceConfig,
        roleMap: $roleMap,
        userEmail: $userEmail,
        userId: $userId,
    };
    $: generalMenuMap = getMenuItems(
        routeRegistry,
        MenuSection.GENERAL,
        menuContext,
        canAccessRoute
    );
    $: adminMenuMap = getMenuItems(
        routeRegistry,
        MenuSection.ADMIN,
        menuContext,
        canAccessRoute
    );
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
        setEnvTitle();
        const orgIz = $raceConfig.orgIz;
        await setIdTokenFromCognitoCallback();
        try {
            await urlParseSpotify();
        } catch (error) {
            log.error("Spotify callback failed", error);
        }
        await refreshOrgRoles(orgIz);
        let msg = "Using public access";
        if ($userEmail) {
            msg = `Logged in: [${$userEmail}]`;
        }
        pushMessage({
            text: msg,
            type: "success",
        });

        isMounted = new Date().getTime();
    });
    function setEnvTitle() {
        if (aws_exports.DeployEnvironment === "go-derby-prod") {
            document.title = `Go RR1`;
        } else {
            document.title = `${aws_exports.DeployEnvironment} Derby App`;
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
    const getTitle = (cfg) => {
        let orgIz = "";
        if ($developerMode && cfg && cfg.orgIz) {
            orgIz = cfg.orgIz;
            //orgIz=orgIz.replace(/.*:/,'')
            orgIz = orgIz + ":";
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
        return adminMenuMap.length > 0;
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
    <div style="display: {visibleMenu == MenuType.GENERAL ? 'block' : 'none'}">
        {#each generalMenuMap as menuOption}
            <a on:click={() => navTo(menuOption)}>
                {menuOption.text}
            </a>
        {/each}
    </div>
    <div style="display: {visibleMenu == MenuType.ADMIN ? 'block' : 'none'}">
        {#each adminMenuMap as adminMenuOption}
            <a on:click={() => navTo(adminMenuOption)}>
                {adminMenuOption.text}
            </a>
        {/each}
    </div>

    <!-- "Wrench/Screwdriver icon" to toggle the admin menu -->
    {#if shouldDisplayAdminNavIcon(adminMenuMap, $userEmail)}
        <div class="icon" style="right: 50px">
            <img
                style="width: 35px; margin-top: 7.5px; margin-left: 7.5px"
                src="screwdriver-wrench-solid.svg"
                on:click={() => menuDisplayChange(MenuType.ADMIN)}
            />
        </div>
    {/if}

    <!-- "Hamburger menu" / "Bar icon" to toggle the general menu -->
    <div class="icon" style="right: 0">
        <img
            style="width: 35px; margin-top: 5px; margin-left: 7.5px"
            src="bars-solid.svg"
            on:click={() => menuDisplayChange(MenuType.GENERAL)}
        />
    </div>
</div>
{#if visibleMenu == MenuType.NONE}
    <main>
        <SpinnerPanel />
        <Splash />
        <RouteHost authorizationReady={Boolean(isMounted)} />
    </main>
    <BottomNav />
{/if}
