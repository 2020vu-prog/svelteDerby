import log from "loglevel";

import axiosCommon from "axios";

import { Auth } from "aws-amplify";
const jwt = require("jsonwebtoken");
const semver = require("semver");

var bearer = "";

import { persistable } from "./storedb.js";
import { writable, readable, get as getStore } from "svelte/store";
import { storeAuth } from "./stores/auth.js";
import { buildVersion } from "./utils.js";

function parseBool(val) {
    return val === true || val === "true";
}
/*
const persistSetupMap = {
    theme: "#4CAF50",
    pendingSortAlgorithm: "Age",
};
const persistedStore = {};

for (const key in persistSetupMap) {
    persistedStore[key] = persistable(key, persistSetupMap[key]);
}
export const pendingSortAlgorithm = persistedStore["pendingSortAlgorithm"];
export const theme = persistedStore["theme"];
*/

export const userEmail = writable("");
export const roleList = persistable("roleList", []);

export const theme = persistable("pref:themeBg", "#4CAF50");
export const statusMessage = writable({});
export const clearOldStatusMessages = writable(false);
export const prefStore = writable({ initial: 1, disableCache: 2 });
export const doRefreshBlocks = writable(0);
export const standingsMap = writable({});
export const racePhaseMap = writable({});
export const driverMap = writable({});
export const carFilter = writable("");
export const nextOnBlockKey = writable("");
export const showBottomNav = persistable("pref:showBottomNav", true);
export const developerMode = persistable("pref:developerMode", false);
export const developerLogging = persistable("pref:developerLogging");

export const pendingSortAlgorithm = persistable(
    "pref:pendingSortAlgorithm",
    "Age"
);
export const mediaFileType = persistable(
    "pref:mediaFileType",
    getDefaultFileFormat()
);
export const autoAnnounceResults = persistable(
    "pref:autoAnnounceResults",
    false
);
export const mqttTimerSubscribe = writable(false);
export const mqttEnabled = persistable("pref:mqttEnabled", true);
export const mqttTriggerVideoCapture = writable(0);
export const beginAnonymousLogin = writable(false);
export const timerState = writable({});
export const uiPageSize = persistable("pref:uiPageSize", undefined);
//export const uiPageSize = writable(100);
export const raceConfig = writable({
    orgName: "",
    orgId: "",
    baseUrl: "/app",
});
export const chartClickLoggerId = writable("");
export const chartClickLoggerShow = writable(false);
function axSet(setF) {
    return () => {};
}
export const getAxios = readable(getAxiosCommon, axSet);
export function getChartCacheKey() {
    return require("./config/doNotEditChartKey.json").chartKey;
}
export function getCacheKey() {
    var prefs = getStore(prefStore);
    const expiresMS = new Date().getTime() - 5 * 60 * 1000; // 5 minutes ago
    log.debug("getCacheKey:", expiresMS, " pref:", prefs.disableCache);
    if (prefs.disableCache && prefs.disableCache > expiresMS) {
        return prefs.disableCache + "";
    } else {
        return "";
    }
}

export function setCacheKey(newKey) {
    var prefs = getStore(prefStore);

    prefs.disableCache = newKey;
    prefStore.set(prefs);
}
// Add a request interceptor
axiosCommon.interceptors.request.use(function (config) {
    //const token = store.getState().session.token;
    const raceConfigVal = getStore(raceConfig);
    config.headers["x-event-ts"] = raceConfigVal.at;

    return config;
});
axiosCommon.interceptors.response.use(
    (response) => {
        if (response.status === 401) {
            log.debug("AINT: You are not authorized");
        }
        if (response.status === 200 && response.headers["x-client-minimum"]) {
            log.debug("AINT: headers: ", response.headers);
            if (
                semver.lt(buildVersion(), response.headers["x-client-minimum"])
            ) {
                location.reload();
            }
        }
        log.debug("AINT: ", response);
        return response;
    },
    (error) => {
        log.debug("AINT error: ", error);
        if (error.response && error.response.data) {
            return Promise.reject(error.response.data);
        }
        return Promise.reject(error.message);
    }
);
async function getAxiosCommon() {
    //TODO: flush bearer token when email changes
    if (bearer) {
        var decoded = jwt.decode(bearer);
        log.debug("decoded jwt:", decoded);
        const now = new Date().getTime() / 1000;
        if (decoded && decoded.exp && decoded.exp > now + 30) {
            log.debug("getAxiosCommon re-using token");
        } else {
            log.debug("getAxiosCommon expiring token");
            bearer = "";
        }
    }
    if (!bearer) {
        const currentSession = await Auth.currentSession();
        bearer = currentSession.idToken.jwtToken;
        axiosCommon.defaults.headers.common["Authorization"] = bearer;
    }
    log.debug("bearer:", bearer);
    return axiosCommon;
}

const sortBy = (field, reverse, primer) => {
    var key = primer
        ? function (x) {
              return primer(x[field]);
          }
        : function (x) {
              return x[field];
          };

    reverse = !reverse ? 1 : -1;

    return function (a, b) {
        return (a = key(a)), (b = key(b)), reverse * ((a > b) - (b > a));
    };
};
function getDefaultFileFormat() {
    const iOS = navigator.userAgent.match(/(iPad|iPhone|iPod)/i) ? true : false;
    if (iOS) {
        return "Mp4";
    }
    return "Webm";
}
//doRefresh();
