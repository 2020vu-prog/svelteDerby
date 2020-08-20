import axiosCommon from "axios";

import { Auth } from "aws-amplify";
const jwt = require("jsonwebtoken");
const semver = require("semver");

var bearer = "";

import { writable, readable } from "svelte/store";
import { storeAuth } from "./stores/auth.js";
import { buildVersion } from "./utils.js";

export const userEmail = writable("noEmail");

export const theme = writable("#4CAF50");
export const statusMessage = writable({});
export const prefStore = writable({ initial: 1, disableCache: 2 });
export const doRefreshBlocks = writable(0);
export const standingsMap = writable({});
export const racePhaseMap = writable({});
export const driverMap = writable({});
export const carFilter = writable("");
export const nextOnBlockKey = writable("");
export const showBottomNav = writable(true);
export const developerMode = writable(false);
export const pendingSortAlgorithm = writable("Age");
export const autoAnnounceResults = writable(false);
export const beginAnonymousLogin = writable(false);
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
const getPrefs = () => {
    var prefs = {};
    const unsubscribe = prefStore.subscribe((value) => {
        prefs = value;
    });
    unsubscribe();
    return prefs;
};
export function getChartCacheKey() {
    return require("./config/doNotEditChartKey.json").chartKey;
    //return new Date().getTime().toString();
}
export function getCacheKey() {
    var prefs = getPrefs();
    const expiresMS = new Date().getTime() - 5 * 60 * 1000; // 5 minutes ago
    console.log("getCacheKey:", expiresMS, " pref:", prefs.disableCache);
    if (prefs.disableCache && prefs.disableCache > expiresMS) {
        return prefs.disableCache + "";
    } else {
        return "";
    }
}

export function setCacheKey(newKey) {
    var prefs = getPrefs();

    prefs.disableCache = newKey;
    prefStore.set(prefs);
}
axiosCommon.interceptors.response.use(
    (response) => {
        if (response.status === 401) {
            console.log("AINT: You are not authorized");
        }
        if (response.status === 200 && response.headers["x-client-minimum"]) {
            console.log("AINT: headers: ", response.headers);
            if (
                semver.lt(buildVersion(), response.headers["x-client-minimum"])
            ) {
                location.reload();
            }
        }
        console.log("AINT: ", response);
        return response;
    },
    (error) => {
        console.log("AINT error: ", error);
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
        console.log("decoded jwt:", decoded);
        const now = new Date().getTime() / 1000;
        if (decoded && decoded.exp && decoded.exp > now + 30) {
            console.log("getAxiosCommon re-using token");
        } else {
            console.log("getAxiosCommon expiring token");
            bearer = "";
        }
    }
    if (!bearer) {
        const currentSession = await Auth.currentSession();
        bearer = currentSession.idToken.jwtToken;
        axiosCommon.defaults.headers.common["Authorization"] = bearer;
    }
    console.log("bearer:", bearer);
    return axiosCommon;
}

export const doRefreshOLD = () => {
    axiosCommon
        .get("./data/driver.json")
        .then((response) => {
            console.log("drivers:" + response.data.length);
            const driverTmp = {};
            response.data.forEach(function (driver) {
                driverTmp[driver.carNumber] = driver;
            });
            driverMap.set(driverTmp);
            console.log("did set driverMap");
            doRefreshBlocks.set(new Date().getTime());
        })
        .catch((err) => {
            console.log(err);
        });

    //const racerUrl="http://s3.amazonaws.com/chicago2019oct-s3derbyracedata-vtp3oauyufv6/data/racer.json.gz?nocache=1580673517399";
    const racerUrl = "./data/rs.json";
    axiosCommon
        .get(racerUrl)
        .then((response) => {
            console.log(response.data.length);
            const sortedStandings = response.data.sort(
                sortBy("lastUpdateMS", true, parseInt)
            );
            standings.set(sortedStandings);
            console.log("did set standings");
        })
        .catch((err) => {
            console.log(err);
        });
};
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
//doRefresh();
