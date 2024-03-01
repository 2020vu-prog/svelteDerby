import log from "loglevel";

import axiosXyz from "axios";

const axiosCommon = axiosXyz.create();
const jwt = require("jsonwebtoken");
const semver = require("semver");
const { v4: uuidv4 } = require("uuid");
import { persistable } from "./storedb.js";
import { derived, writable, readable, get as getStore } from "svelte/store";
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

function dtoken(bearerToken, prop) {
    const decoded = jwt.decode(bearerToken);
    if (decoded) {
        //log.debug("derive dtoken decoded jwt:", decoded);
        //log.debug("derive dtoken decoded prop:", decoded[prop]);
        return decoded[prop];
    } else {
        return "";
    }
}
export const userJwtStore = persistable("userJwt", "");
//export const userEmail = persistable("userEmail", "");
export const userId = derived(userJwtStore, ($bearer) => {
    return dtoken($bearer, "cognito:username");
});
export const userEmail = derived(userJwtStore, ($bearer) => {
    return dtoken($bearer, "email");
});
export const userExp = derived(userJwtStore, ($bearer) => {
    return dtoken($bearer, "exp");
});
export const roleMap = persistable("roleMap", {});

export const theme = persistable("pref:themeBg", "#4CAF50");
export const statusMessage = writable({});
export const clearOldStatusMessages = writable(false);
export const prefStore = writable({ initial: 1, disableCache: 2 });
export const doRefreshBlocks = writable(0);
export const standingsMap = writable({});
export const racePhaseMap = writable({});
export const driverMap = writable({});
export const orgMap = writable({});
export const carFilter = writable("");
export const nextOnBlockKey = writable("");
export const showChart1 = persistable("pref:showChart1", false);
export const showBottomNav = persistable("pref:showBottomNav", true);
export const developerMode = persistable("pref:developerMode", false);
export const developerLogging = persistable("pref:developerLogging");
export const enableFractionalMs = persistable("pref:enableFractionalMs", false);
export const defaultPhaseType = persistable("pref:defaultPhaseType", "R");
export const lastSplash = persistable("pref:lastSplash", 0);

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
export const mqttMapSubscribe = writable({}); //requests to subscribe.  keyed by topic
export const mqttMapData = writable({}); //subscription data.  keyed by topic.
export const mqttTimerSubscribe = writable(false);
export const mqttTimerTopic = persistable("pref:mqttTimerTopic", "");
export const mqttEnabled = persistable("pref:mqttEnabled", true);
export const mqttTriggerVideoCapture = writable(0);
export const beginAnonymousLogin = writable(false);
export const timerState = writable({});
export const recentRefreshMs = writable(0);
export const uiPageSize = persistable("pref:uiPageSize", undefined);
export const mqttPsUrlMap= persistable("mqttPsUrlMap", {});
//export const uiPageSize = writable(100);
export const raceConfig = persistable("pref:uiRaceConfig", {
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
//
// helper function to call getAxios transparently (and async)
//
export const axios = derived(
    getAxios,
    ($getAxios, set) => {
        $getAxios().then((got) => {
            log.debug("derived axios:", got);
            set(got);
        });
    },
    axiosCommon // placeHolder while waiting for promise fulfillment
);

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
    const bearer = getRR1AuthTokenNow();
    console.log(`AC: setup... ${bearer.length}`);
    config.headers["Authorization"] = bearer;
    config.headers["cjwrr1"] = `cjwrr1`;

    return config;
});
//response interceptor
axiosCommon.interceptors.response.use(
    (response) => {
        console.log("AC:passthrough");
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
        if (response.data.error) {
            log.debug("AINT 200 with error:", response);
            statusMessage.set({
                text: response.data.error,
                type: "error",
            });
            return Promise.reject(response.data.error);
        }
        return response;
    },
    async function (error) {
        return Promise.reject(error);
        const axErrorKey = uuidv4();
        console.log("AC:error0", error);
        const originalRequest = error.config;
        let refreshTokenError, res;
        if (error.response.status === 401 && !originalRequest._retry) {
            userJwtStore.set(""); // whatever this was didn't work.
            originalRequest._retry = true;
            console.log("AC:refreshing");
            statusMessage.set({
                text: "Renewing Credentials...",
                key: axErrorKey,
            });
            const bt = await getRR1AuthTokenSlow(originalRequest);
            console.log("AC:refreshed");
            console.log(`AC: New Credentials... ${bt.length}`);

            if (bt && bt.length > 0) {
                statusMessage.set({
                    text: `Renewed Credentials... ${bt.length}`,
                    key: axErrorKey,
                    type: "success",
                });
            } else {
                statusMessage.set({
                    text: `Renewal Failed. ${bt.length}`,
                    key: axErrorKey,
                });
            }
            const retryPromise = axiosCommon.request(originalRequest);
            console.log("AC:retry:", retryPromise);
            return retryPromise;
            return [null, await axiosCommon.request(originalRequest)];

            if (refreshTokenError) {
                return Promise.reject(refreshTokenError);
            }
            return Promise.resolve(res);
        }
        console.log("AC:reject");
        return Promise.reject(error);
    }
);

/*
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
        if (response.data.error) {
            log.debug("AINT 200 with error:", response);
            statusMessage.set({
                text: response.data.error,
                type: "error",
            });
            return Promise.reject(response.data.error);
        }

        log.debug("AINT: ", response);
        return response;
    },
    (error) => {
        log.debug("AINT error: ", error);

            const originalRequest = error.config
            const orUrl=originalRequest?originalRequest.url:"A77";
        if (
            error.response &&
            error.response.data &&
            error.response.data.message
        ) {
            log.debug("AINT2 error: ", JSON.stringify(error.response.data));

            statusMessage.set({
                text: "ERR A12: " + error.response.data.message+ " "+ orUrl,
                type: "error",
            });
            return Promise.reject(error.response.data);
        }
        statusMessage.set({
            text: "AINT failed3: " + error.message,
            type: "error",
        });
        return Promise.reject(error.message);
    }
);
*/
async function getAxiosCommon() {
    //await getRR1AuthTokenSlow("initial get.");
    return axiosCommon;
}
function getRR1AuthTokenNow() {
    var bearer = getStore(userJwtStore);
    if (bearer) {
        var decoded = jwt.decode(bearer);
        log.debug("AC: decoded jwt:", decoded);
        const now = new Date().getTime() / 1000;
        let exp = 0;
        if (decoded && decoded.exp) {
            exp = decoded.exp;
        }
        const tte = exp - now;
        log.debug("getRR1AuthTokenNow tte:", tte);
    }
    return bearer;
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
// nowDate copied from https://svelte.dev/tutorial/derived-stores
export const nowDate = readable(new Date(), function start(set) {
    const interval = setInterval(() => {
        set(new Date());
    }, 1000);

    return function stop() {
        clearInterval(interval);
    };
});
export const userExpCountDownSecs = derived(
    [nowDate, userExp],
    ([$nowDate, $userExp]) => {
        if ($userExp) {
            const nowMs = $nowDate.getTime();
            const secs = $userExp - nowMs / 1000;
            if (secs < 0) {
                return 0;
            }
            return Math.floor(secs);
        } else {
            return 0;
        }
    }
);
export const initialReloadRoute = persistable("initialReloadRoute", "");
export const carouselList = persistable("carouselList", []);
export const carouselRun = writable(false);
export const customToolbarList = persistable("toolbarList", []);
export const selectedToolbarList = derived(customToolbarList, ($dm) => {
    const dlist = [];
    $dm.forEach(function (item) {
        if (item.selected) {
            dlist.push(item);
        }
    });
    if (!dlist.length) {
        return getDefaultToolbarList();
    }
    return dlist;
});
export const selectedDriverMap = writable({});
export const selectedDriverList = derived(selectedDriverMap, ($dm) => {
    const dlist = [];
    for (const [key, value] of Object.entries($dm)) {
        if (value) {
            dlist.push(key);
        }
    }
    dlist.sort();
    return dlist;
});

export function getOrgName(orgIz) {
    var om = getStore(orgMap);
    if (om && om[orgIz] && om[orgIz].orgName) {
        return om[orgIz].orgName;
    } else return orgIz;
}

export async function refreshOrgMap() {
    log.debug("refreshOrgMap: begin");
    log.debug("refreshOrgMap ga:", getAxios);
    const cacheKey = getCacheKey();
    const axios2 = getStore(getAxios);
    log.debug("refreshOrgMap a2:", axios2);
    const axios3 = await axios2();
    log.debug("refreshOrgMap a3:", axios3);

    try {
        const response = await axios3.get(
            getStore(raceConfig).baseUrl + `/listOrgConfig?cacheKey=${cacheKey}`
        );
        log.debug("refreshOrgMap length:" + response.data.length);
        log.debug("refreshOrgMap:", response.data);
        if (response.data) {
            orgMap.set(response.data);
        }
        return response.data;
    } catch (err) {
        log.debug(err);
        return {};
    }
}
export function getDefaultToolbarList() {
    return [
        {
            selected: true,
            text: "Phases",
            systemName: "Phases",
            path: "RpList",
        },
        {
            selected: true,
            text: "Races",
            systemName: "Races",
            path: "RsList/History",
        },
        {
            selected: true,
            text: "Pending",
            systemName: "Pending",
            path: "RsList/Pending",
        },
        {
            selected: true,
            text: "Charts",
            systemName: "Charts",
            path: "chartList",
        },
    ];
}
//doRefresh();
