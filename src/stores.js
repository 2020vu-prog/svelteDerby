import axios from "axios";

import { writable, readable } from "svelte/store";
import { storeAuth } from "./stores/auth.js";
export const theme = writable("#4CAF50");
export const statusMessage = writable({});
export const prefStore = writable({ initial: 1, disableCache: 2 });
export const doRefreshBlocks = writable(0);
export const standingsMap = writable({});
export const racePhaseMap = writable({});
export const driverMap = writable({});
export const carFilter = writable("");
export const nextOnBlockKey = writable("");
export const showBottomNav = writable(false);
export const raceConfig = writable({
    orgName: "",
    orgId: "",
    baseUrl: "/app",
    baseUrlCorsIssue: "https://d15zun4udup4ky.cloudfront.net/app",
    baseUrlOLD: "https://05wv6js1p4.execute-api.us-east-2.amazonaws.com/test",
});

const getPrefs = () => {
    var prefs = {};
    const unsubscribe = prefStore.subscribe((value) => {
        prefs = value;
    });
    unsubscribe();
    return prefs;
};
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

export const doRefreshOLD = () => {
    axios
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
    axios
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
