"use strict";

const { RoutePermission } = require("./routePermission.js");

const MenuSection = Object.freeze({ ADMIN: "admin", GENERAL: "general" });
const RouteAction = Object.freeze({ MATERIAL_ADD: "materialAdd" });

/**
 * Creates metadata for a general-navigation menu entry.
 *
 * @param {string|function(import("./routeRegistry.js").RouteContext): string} label
 * @param {number} order
 * @param {object} [options]
 * @returns {object}
 */
const generalMenu = (label, order, options = {}) => ({
    section: MenuSection.GENERAL,
    label,
    order,
    ...options,
});

/**
 * Creates metadata for an administrative-navigation menu entry.
 *
 * @param {string|function(import("./routeRegistry.js").RouteContext): string} label
 * @param {number} order
 * @param {object} [options]
 * @returns {object}
 */
const adminMenu = (label, order, options = {}) => ({
    section: MenuSection.ADMIN,
    label,
    order,
    ...options,
});

/**
 * Declares the floating add action associated with a route.
 *
 * `target`, `visible`, and `orgIz` callbacks receive the matched current-route
 * parameters. The resolved target is matched separately so RouteHost can
 * enforce the destination route's permission before displaying the button.
 *
 * @param {string|function(import("./routeRegistry.js").RouteContext): string} target
 * @param {object} [options]
 * @param {function(import("./routeRegistry.js").RouteContext): boolean} [options.visible]
 * @param {string|function(import("./routeRegistry.js").RouteContext): string} [options.orgIz]
 * @returns {object}
 */
const materialAdd = (target, options = {}) => ({
    type: RouteAction.MATERIAL_ADD,
    target,
    ...options,
});

/**
 * Declarative source of truth for application routes, route permissions,
 * navigation entries, and contextual page actions.
 *
 * @type {import("./routeRegistry.js").RouteDefinition[]}
 */
const routeDefinitions = [
    {
        id: "home",
        path: "/",
        component: "RaceStandingList",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "raceStandings",
        path: "/RsList/:type",
        component: "RaceStandingList",
        permission: RoutePermission.ANONYMOUS,
        helpId: ({ params }) =>
            ["History", "Pending"].includes(params.type)
                ? `RaceStandingList.${params.type}`
                : null,
        action: materialAdd("/raceStandingAdd/RaceStanding", {
            visible: ({ params }) => params.type === "Pending",
        }),
    },
    {
        id: "phaseHistory",
        path: "/RpList",
        component: "RacePhaseList",
        permission: RoutePermission.ANONYMOUS,
        menu: generalMenu("Phase History", 20),
        action: materialAdd("/raceStandingAdd/RacePhase"),
    },
    {
        id: "phaseElapsed",
        path: "/RpElapsed/:rpKey",
        component: "RacePhaseElapsed",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "drivers",
        path: "/drivers/:selectable?",
        component: "DriverList",
        permission: RoutePermission.ANONYMOUS,
        helpId: ({ params }) =>
            params.selectable ? "DriverList.Selection" : "DriverList.Browse",
        menu: generalMenu("Drivers", 10, { to: "/drivers" }),
        action: materialAdd("/driverAdd", {
            visible: ({ params }) => !params.selectable,
        }),
    },
    {
        id: "login",
        path: "/loginH",
        component: "LoginH",
        permission: RoutePermission.PUBLIC,
        menu: generalMenu(
            ({ userId }) => (userId ? `Logout [${userId}]` : "Login"),
            80,
            {
                requiresEvent: false,
            }
        ),
    },
    {
        id: "manualTimer",
        path: "/ManualTimerAdd/:rpKey/:winningLane?/:winningTime?",
        component: "ManualTimerAdd",
        permission: RoutePermission.MANUAL_FINISH_TIME,
    },
    {
        id: "manualAnnouncement",
        path: "/ManualAnnouncement",
        component: "ManualAnnouncement",
        permission: RoutePermission.CAN_INITIATE_ANNOUNCEMENT,
        menu: adminMenu("Manual Announcement", 50),
    },
    {
        id: "raceStandingAdd",
        path: "/raceStandingAdd/:type",
        component: "RaceStandingAdd",
        helpId: ({ params }) =>
            ({
                RacePhase: "RaceStandingAdd.Blocks",
                RaceStanding: "RaceStandingAdd.Pending",
            })[params.type],
        permission: ({ params }) =>
            params.type === "RacePhase"
                ? RoutePermission.CAN_ADD_BLOCKS
                : RoutePermission.CAN_ADD_PENDING,
    },
    {
        id: "driverAdd",
        path: "/driverAdd/:number?",
        component: "DriverAdd",
        permission: RoutePermission.CAN_ADD_PARTICIPANT,
    },
    {
        id: "driverInfo",
        path: "/driverInfo/:number?",
        component: "DriverInfo",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "downloadCsv",
        path: "/downloadCsv",
        component: "DownloadCsv",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "eventSelection",
        path: "/eventSelection/:orgIz",
        component: "EventSelection",
        permission: RoutePermission.PUBLIC,
        action: materialAdd(
            ({ params }) => `/eventAdd/${encodeURIComponent(params.orgIz)}/Add`,
            {
                orgIz: ({ params }) => params.orgIz,
            }
        ),
    },
    {
        id: "autoSelectEvent",
        path: "/as/:orgIz/:orgId",
        component: "EventSelection",
        permission: RoutePermission.PUBLIC,
    },
    {
        id: "eventAdd",
        path: "/eventAdd/:orgIz/:mode",
        component: "EventAdd",
        permission: RoutePermission.POWER,
        permissionOrgIz: ({ params }) => params.orgIz,
    },
    {
        id: "history",
        path: "/historyList/:PK/:SK",
        component: "HistoryList",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "orgUsers",
        path: "/orgUserList",
        component: "OrgUserList",
        permission: RoutePermission.CAN_ADD_ORG_USER,
        menu: adminMenu("Org Users", 40),
        action: materialAdd("/orgUserAdd"),
    },
    {
        id: "orgUserAdd",
        path: "/orgUserAdd/:b64User?",
        component: "OrgUserAdd",
        permission: RoutePermission.CAN_ADD_ORG_USER,
    },
    {
        id: "orgSelection",
        path: "/orgSelection",
        component: "OrgSelection",
        permission: RoutePermission.PUBLIC,
        menu: generalMenu("Watch Different Event", 60, {
            requiresEvent: false,
        }),
        action: materialAdd("/orgAdd"),
    },
    {
        id: "orgAdd",
        path: "/orgAdd",
        component: "OrgAdd",
        permission: RoutePermission.POWER,
    },
    {
        id: "about",
        path: "/about",
        component: "AboutPage",
        permission: RoutePermission.PUBLIC,
    },
    {
        id: "preferences",
        path: "/preferences",
        component: "PreferencesPage",
        permission: RoutePermission.PUBLIC,
        menu: generalMenu("Preferences & Sharing", 70, {
            requiresEvent: false,
        }),
    },
    {
        id: "provisionWifi",
        path: "/provisionWifi",
        component: "ProvisionWifi",
        permission: RoutePermission.PUBLIC,
    },
    {
        id: "chartDetail",
        path: "/chartDetail/:chartId",
        component: "ChartDetail",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "chartDetailCards",
        path: "/chartDetailCardList/:chartId",
        component: "ChartDetailCardList",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "chartPosition",
        path: "/chartPosition/:chartId/:chartPosition",
        component: "ChartPosition",
        permission: RoutePermission.ANONYMOUS,
    },
    {
        id: "charts",
        path: "/chartList",
        component: "ChartList",
        permission: RoutePermission.ANONYMOUS,
        menu: generalMenu("Charts", 50),
        action: materialAdd("/chartAdd"),
    },
    {
        id: "paInfo",
        path: "/pa_info",
        component: "PaInfo",
        permission: RoutePermission.CAN_INITIATE_ANNOUNCEMENT,
        menu: adminMenu("PA Info", 60),
    },
    {
        id: "chartEdit",
        path: "/chartEdit/:chartId",
        component: "ChartEdit",
        permission: RoutePermission.CAN_ADD_CHART,
    },
    {
        id: "chartFill",
        path: "/chartFill/:chartId",
        component: "ChartFill",
        permission: RoutePermission.CAN_ADD_CHART,
    },
    {
        id: "chartAdd",
        path: "/chartAdd",
        component: "ChartAdd",
        permission: RoutePermission.CAN_ADD_CHART,
    },
    {
        id: "forceLoad",
        path: "/forceLoad/:b64route",
        component: "ForceLoad",
        permission: RoutePermission.PUBLIC,
    },
    {
        id: "routeSelection",
        path: "/routeSelection/:mode",
        component: "RouteSelection",
        permission: RoutePermission.PUBLIC,
    },
    {
        id: "timerConfig",
        path: "/timerConfig",
        component: "TimerConfig",
        permission: RoutePermission.CAN_TIMER_CONFIG,
    },
    {
        id: "timerConfigs",
        path: "/timerConfigList",
        component: "TimerConfigList",
        permission: RoutePermission.CAN_TIMER_CONFIG,
        menu: adminMenu("Timer Config", 10),
        action: materialAdd("/timerConfigElapsed"),
    },
    {
        id: "timerConfigElapsed",
        path: "/timerConfigElapsed",
        component: "TimerConfigElapsed",
        permission: RoutePermission.CAN_TIMER_CONFIG,
    },
    {
        id: "timerAlignment",
        path: "/timerAlignment",
        component: "TimerAlignment",
        permission: RoutePermission.CAN_TIMER_CONFIG,
    },
    {
        id: "timerPbAlignment",
        path: "/timerPbAlignment",
        component: "TimerPbAlignment",
        permission: RoutePermission.CAN_TIMER_CONFIG,
    },
    {
        id: "timerColumns",
        path: "/timerColumns",
        component: "TimerColumns",
        permission: RoutePermission.CAN_TIMER_CONFIG,
        menu: adminMenu("Timer Columns", 20),
    },
    {
        id: "timerPlot",
        path: "/timerPlot",
        component: "TimerPlot",
        permission: RoutePermission.CAN_TIMER_CONFIG,
    },
    {
        id: "rawTimers",
        path: "/rawTimerList",
        component: "RawTimerList",
        permission: RoutePermission.CAN_TIMER_CONFIG,
    },
    {
        id: "logMessages",
        path: "/logMessageViewer",
        component: "LogMessageViewer",
        permission: RoutePermission.CAN_TIMER_CONFIG,
        menu: adminMenu("Log Messages", 90),
    },
    {
        id: "media",
        path: "/spMediaList/:dbName/:dbKey",
        component: "MediaList",
        permission: RoutePermission.CAN_ADD_BLOCKS,
        menu: adminMenu("List All Media", 30, { to: "/spMediaList/*/*" }),
    },
    {
        id: "mediaDemo",
        path: "/mediaDemo",
        component: "MediaViewer",
        permission: RoutePermission.PUBLIC,
    },
    {
        id: "forceReload",
        path: "/forceReloadPage",
        component: "ForceReloadPage",
        permission: RoutePermission.PUBLIC,
    },
    {
        id: "captureVideo",
        path: "/captureVideo",
        component: "CaptureVideo",
        permission: RoutePermission.CAN_CAPTURE_VIDEO,
        menu: adminMenu("Capture Video", 70),
    },
];

// Menu aliases share the underlying route definition and permission.
routeDefinitions.find((route) => route.id === "raceStandings").menuAliases = [
    { ...generalMenu("Race History", 30), to: "/RsList/History" },
    { ...generalMenu("Pending Races", 40), to: "/RsList/Pending" },
];

module.exports = { MenuSection, RouteAction, routeDefinitions };
